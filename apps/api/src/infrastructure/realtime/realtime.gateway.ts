import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, Injectable, Optional } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  RealtimeEvent,
  WsAuthenticatedUser,
  ErrorCode,
  UserRole,
  UserStatus,
} from '@merqent/shared-types';
import { WsJoinRoomSchema, WsLeaveRoomSchema, WsHeartbeatSchema } from '@merqent/validation';
import {
  REALTIME_NAMESPACE,
  ROOM_PREFIX_USER,
  ROOM_PREFIX_FIRM,
  ROOM_PREFIX_PROJECT,
  WS_MAX_CONNECTIONS_PER_USER,
  WS_RATE_LIMIT_WINDOW_MS,
  WS_RATE_LIMIT_MAX_EVENTS,
  WS_MAX_HTTP_BUFFER_SIZE,
} from './realtime.constants';
import { JwtAccessPayload } from '../../modules/auth/interfaces/token-payload.interface';

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

@Injectable()
@WebSocketGateway({
  namespace: REALTIME_NAMESPACE,
  maxHttpBufferSize: WS_MAX_HTTP_BUFFER_SIZE,
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  // Track authenticated user socket mappings for multi-tab sessions and targeted disconnections
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private readonly socketUsers = new Map<string, WsAuthenticatedUser>(); // socketId -> user
  private readonly socketRateLimits = new Map<string, RateLimitTracker>(); // socketId -> rate limiter

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  /**
   * Handles incoming WebSocket connection lifecycle with ground-truth authentication.
   *
   * SECURITY GUARANTEES:
   * 1. Extracts and validates JWT access token.
   * 2. Rejects tokens if blacklisted in Redis.
   * 3. Verifies active user status in PostgreSQL.
   * 4. Enforces per-user connection concurrency limits.
   * 5. Automatically binds user to their own private room and verified firm room.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(
          `WebSocket connection rejected: Missing authorization token (socket: ${client.id})`,
        );
        client.emit(RealtimeEvent.ERROR, {
          code: ErrorCode.WS_UNAUTHORIZED,
          message: 'Authentication token is required to establish realtime connection',
        });
        client.disconnect(true);
        return;
      }

      // 1. Verify JWT signature & expiration
      const secret = this.configService.get<string>('jwt.secret');
      let payload: JwtAccessPayload;
      try {
        payload = await this.jwtService.verifyAsync<JwtAccessPayload>(token, { secret });
      } catch (err: unknown) {
        this.logger.warn(
          `WebSocket connection rejected: Token verification failed for socket ${client.id}: ${(err as Error).message}`,
        );
        client.emit(RealtimeEvent.ERROR, {
          code: ErrorCode.WS_AUTHENTICATION_FAILED,
          message: 'Invalid or expired authentication token',
        });
        client.disconnect(true);
        return;
      }

      if (payload.type !== 'access') {
        this.logger.warn(
          `WebSocket connection rejected: Token is not access token (socket: ${client.id})`,
        );
        client.emit(RealtimeEvent.ERROR, {
          code: ErrorCode.WS_AUTHENTICATION_FAILED,
          message: 'Access token required for realtime connection',
        });
        client.disconnect(true);
        return;
      }

      // 2. Check cluster-wide Redis token blacklist
      if (this.redisService) {
        const isRevoked = await this.redisService.isTokenBlacklisted(token);
        if (isRevoked) {
          this.logger.warn(
            `WebSocket connection rejected: Token has been revoked (socket: ${client.id})`,
          );
          client.emit(RealtimeEvent.ERROR, {
            code: ErrorCode.WS_UNAUTHORIZED,
            message: 'Token has been revoked',
          });
          client.disconnect(true);
          return;
        }
      }

      // 3. Ground-truth database user check (active account, valid status)
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          firmMember: {
            select: {
              firmId: true,
            },
          },
        },
      });

      if (!user) {
        this.logger.warn(
          `WebSocket connection rejected: User not found in database (userId: ${payload.sub})`,
        );
        client.emit(RealtimeEvent.ERROR, {
          code: ErrorCode.WS_AUTHENTICATION_FAILED,
          message: 'User account not found',
        });
        client.disconnect(true);
        return;
      }

      if (user.status !== UserStatus.ACTIVE) {
        this.logger.warn(
          `WebSocket connection rejected: User account status is ${user.status} (userId: ${user.id})`,
        );
        client.emit(RealtimeEvent.ERROR, {
          code: ErrorCode.ACCOUNT_SUSPENDED,
          message: `Account is not active (${user.status})`,
        });
        client.disconnect(true);
        return;
      }

      // 4. Enforce per-user concurrent connection limit
      const existingSockets = this.userSockets.get(user.id) || new Set<string>();
      if (existingSockets.size >= WS_MAX_CONNECTIONS_PER_USER) {
        this.logger.warn(
          `WebSocket connection rejected: Max concurrent connections (${WS_MAX_CONNECTIONS_PER_USER}) exceeded for user ${user.id}`,
        );
        client.emit(RealtimeEvent.ERROR, {
          code: ErrorCode.WS_RATE_LIMIT_EXCEEDED,
          message: 'Maximum concurrent realtime connections exceeded',
        });
        client.disconnect(true);
        return;
      }

      // Only permit firmId from database ground-truth (user.firmMember)
      // Platform admins may optionally inherit payload firmId if specified, but regular users strictly require DB relationship.
      const verifiedFirmId =
        user.firmMember?.firmId ||
        (user.role === UserRole.PLATFORM_ADMIN ? payload.firmId : undefined);

      // 5. Attach authenticated user principal to socket data
      const authUser: WsAuthenticatedUser = {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        firmId: verifiedFirmId,
        consultantProfileId: payload.consultantProfileId,
      };

      client.data.user = authUser;
      client.data.token = token;

      // 6. Record tracking structures
      existingSockets.add(client.id);
      this.userSockets.set(user.id, existingSockets);
      this.socketUsers.set(client.id, authUser);

      // 7. Auto-subscribe to verified user and firm rooms
      const userRoom = `${ROOM_PREFIX_USER}${user.id}`;
      client.join(userRoom);

      if (verifiedFirmId) {
        const firmRoom = `${ROOM_PREFIX_FIRM}${verifiedFirmId}`;
        client.join(firmRoom);
      }

      this.logger.log(
        `Client authenticated: socket=${client.id}, user=${user.id}, role=${user.role}`,
      );

      client.emit(RealtimeEvent.CONNECTION_ESTABLISHED, {
        socketId: client.id,
        userId: user.id,
        connectedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      this.logger.error(
        `Unexpected error during WebSocket connection handshake: ${(err as Error).message}`,
      );
      client.emit(RealtimeEvent.ERROR, {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Internal error during connection handshake',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = this.socketUsers.get(client.id);
    if (user) {
      const userSocketSet = this.userSockets.get(user.id);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(user.id);
        }
      }
    }

    this.socketUsers.delete(client.id);
    this.socketRateLimits.delete(client.id);

    this.logger.log(`Client disconnected: socket=${client.id}`);
  }

  /**
   * Handles explicit room join requests with ground-truth access validation.
   */
  @SubscribeMessage(RealtimeEvent.ROOM_JOIN)
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<{ event: string; roomId?: string } | void> {
    if (!this.checkRateLimit(client)) {
      client.emit(RealtimeEvent.ERROR, {
        code: ErrorCode.WS_RATE_LIMIT_EXCEEDED,
        message: 'Event rate limit exceeded. Please throttle requests.',
      });
      return;
    }

    const parseResult = WsJoinRoomSchema.safeParse(body);
    if (!parseResult.success) {
      client.emit(RealtimeEvent.ERROR, {
        code: ErrorCode.WS_INVALID_PAYLOAD,
        message: 'Invalid room join payload',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { roomId } = parseResult.data;
    const user: WsAuthenticatedUser | undefined = client.data.user;

    if (!user) {
      client.emit(RealtimeEvent.ERROR, {
        code: ErrorCode.WS_UNAUTHORIZED,
        message: 'Unauthenticated socket session',
      });
      return;
    }

    // Verify room authorization server-side
    const isAuthorized = await this.isUserAuthorizedForRoom(user, roomId);
    if (!isAuthorized) {
      this.logger.warn(
        `SECURITY ALERT: User ${user.id} denied access to room '${roomId}' (unauthorized room subscription attempt)`,
      );
      client.emit(RealtimeEvent.ERROR, {
        code: ErrorCode.WS_ROOM_JOIN_DENIED,
        message: `Access denied to room '${roomId}'`,
      });
      return;
    }

    client.join(roomId);
    this.logger.debug(`Client ${client.id} joined room '${roomId}'`);

    client.emit(RealtimeEvent.ROOM_JOINED, {
      roomId,
      userId: user.id,
    });

    return { event: RealtimeEvent.ROOM_JOINED, roomId };
  }

  /**
   * Handles room leave requests.
   */
  @SubscribeMessage(RealtimeEvent.ROOM_LEAVE)
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): { event: string; roomId?: string } | void {
    if (!this.checkRateLimit(client)) {
      client.emit(RealtimeEvent.ERROR, {
        code: ErrorCode.WS_RATE_LIMIT_EXCEEDED,
        message: 'Event rate limit exceeded. Please throttle requests.',
      });
      return;
    }

    const parseResult = WsLeaveRoomSchema.safeParse(body);
    if (!parseResult.success) {
      client.emit(RealtimeEvent.ERROR, {
        code: ErrorCode.WS_INVALID_PAYLOAD,
        message: 'Invalid room leave payload',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { roomId } = parseResult.data;
    const user: WsAuthenticatedUser | undefined = client.data.user;

    client.leave(roomId);
    this.logger.debug(`Client ${client.id} left room '${roomId}'`);

    client.emit(RealtimeEvent.ROOM_LEFT, {
      roomId,
      userId: user?.id,
    });

    return { event: RealtimeEvent.ROOM_LEFT, roomId };
  }

  /**
   * Handles client heartbeat with dynamic token revocation and session expiration checks.
   */
  @SubscribeMessage(RealtimeEvent.HEARTBEAT)
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: unknown,
  ): Promise<void> {
    const parseResult = WsHeartbeatSchema.safeParse(body);
    if (!parseResult.success) {
      client.emit(RealtimeEvent.ERROR, {
        code: ErrorCode.WS_INVALID_PAYLOAD,
        message: 'Invalid heartbeat payload',
      });
      return;
    }

    const token = client.data.token;
    if (!token) {
      client.emit(RealtimeEvent.ERROR, {
        code: ErrorCode.WS_UNAUTHORIZED,
        message: 'Missing session token',
      });
      client.disconnect(true);
      return;
    }

    // 1. Verify token revocation status in Redis during active heartbeat
    if (this.redisService) {
      const isRevoked = await this.redisService.isTokenBlacklisted(token);
      if (isRevoked) {
        this.logger.warn(`Active connection revoked during heartbeat: socket=${client.id}`);
        client.emit(RealtimeEvent.ERROR, {
          code: ErrorCode.WS_UNAUTHORIZED,
          message: 'Session has been revoked',
        });
        client.disconnect(true);
        return;
      }
    }

    // 2. Verify token signature & expiry during active heartbeat
    const secret = this.configService.get<string>('jwt.secret');
    try {
      await this.jwtService.verifyAsync(token, { secret });
    } catch (err: unknown) {
      this.logger.warn(
        `Active connection expired during heartbeat: socket=${client.id}: ${(err as Error).message}`,
      );
      client.emit(RealtimeEvent.ERROR, {
        code: ErrorCode.WS_AUTHENTICATION_FAILED,
        message: 'Session token has expired',
      });
      client.disconnect(true);
      return;
    }

    // 3. Verify user status in database ground-truth
    const user: WsAuthenticatedUser | undefined = client.data.user;
    if (user) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { status: true },
      });
      if (!dbUser || dbUser.status !== UserStatus.ACTIVE) {
        this.logger.warn(
          `User account is no longer active during heartbeat: socket=${client.id}, userId=${user.id}`,
        );
        client.emit(RealtimeEvent.ERROR, {
          code: ErrorCode.ACCOUNT_SUSPENDED,
          message: 'User account is not active',
        });
        client.disconnect(true);
        return;
      }
    }

    client.emit(RealtimeEvent.HEARTBEAT_ACK, {
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // Server-Side Emission & Management APIs
  // ============================================================================

  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(`${ROOM_PREFIX_USER}${userId}`).emit(event, payload);
  }

  emitToFirm(firmId: string, event: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(`${ROOM_PREFIX_FIRM}${firmId}`).emit(event, payload);
  }

  emitToRoom(roomId: string, event: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(roomId).emit(event, payload);
  }

  disconnectUserSockets(userId: string, reason = 'Session terminated'): void {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds || !this.server) return;

    for (const socketId of socketIds) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(RealtimeEvent.ERROR, {
          code: ErrorCode.WS_UNAUTHORIZED,
          message: reason,
        });
        socket.disconnect(true);
      }
    }
    this.userSockets.delete(userId);
    this.logger.log(`Disconnected all active sockets for user ${userId} (${reason})`);
  }

  getActiveConnectionCount(): number {
    return this.socketUsers.size;
  }

  getRoomsCount(): number {
    if (!this.server?.sockets?.adapter?.rooms) {
      return 0;
    }
    return this.server.sockets.adapter.rooms.size;
  }

  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  private extractToken(client: Socket): string | null {
    // 1. Auth payload in handshake
    const auth = client.handshake.auth;
    if (auth && typeof auth === 'object') {
      if (typeof auth.token === 'string' && auth.token) {
        return this.cleanTokenString(auth.token);
      }
    }

    // 2. Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && typeof authHeader === 'string') {
      return this.cleanTokenString(authHeader);
    }

    return null;
  }

  private cleanTokenString(rawToken: string): string {
    const trimmed = rawToken.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      return trimmed.slice(7).trim();
    }
    return trimmed;
  }

  private async isUserAuthorizedForRoom(
    user: WsAuthenticatedUser,
    roomId: string,
  ): Promise<boolean> {
    // Platform admin has access to all rooms
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    // User private room: user can only join their own room
    if (roomId.startsWith(ROOM_PREFIX_USER)) {
      const targetUserId = roomId.slice(ROOM_PREFIX_USER.length);
      return targetUserId === user.id;
    }

    // Firm room: user can only join their own firm room
    if (roomId.startsWith(ROOM_PREFIX_FIRM)) {
      const targetFirmId = roomId.slice(ROOM_PREFIX_FIRM.length);
      return Boolean(user.firmId && user.firmId === targetFirmId);
    }

    // Project room: user must belong to the firm that owns the project
    if (roomId.startsWith(ROOM_PREFIX_PROJECT)) {
      const targetProjectId = roomId.slice(ROOM_PREFIX_PROJECT.length);
      const project = await this.prisma.project.findUnique({
        where: { id: targetProjectId },
        select: { firmId: true },
      });
      return Boolean(project && user.firmId && project.firmId === user.firmId);
    }

    // Unknown or unformatted rooms are denied by default
    return false;
  }

  private checkRateLimit(client: Socket): boolean {
    const now = Date.now();
    let tracker = this.socketRateLimits.get(client.id);

    if (!tracker || now > tracker.resetAt) {
      tracker = {
        count: 1,
        resetAt: now + WS_RATE_LIMIT_WINDOW_MS,
      };
      this.socketRateLimits.set(client.id, tracker);
      return true;
    }

    tracker.count++;
    if (tracker.count > WS_RATE_LIMIT_MAX_EVENTS) {
      return false;
    }

    return true;
  }
}
