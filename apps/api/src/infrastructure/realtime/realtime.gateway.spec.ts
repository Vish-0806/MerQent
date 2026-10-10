import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket, Server } from 'socket.io';
import { RealtimeGateway } from './realtime.gateway';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  RealtimeEvent,
  ErrorCode,
  UserRole,
  UserStatus,
  WsAuthenticatedUser,
} from '@merqent/shared-types';

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let mockJwtService: jest.Mocked<Partial<JwtService>>;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;
  let mockPrisma: {
    user: {
      findUnique: jest.Mock;
    };
  };
  let mockRedis: jest.Mocked<Partial<RedisService>>;
  let mockServer: {
    to: jest.Mock;
    emit: jest.Mock;
    sockets: {
      sockets: Map<string, unknown>;
      adapter: {
        rooms: Map<string, Set<string>>;
      };
    };
  };
  let mockSocket: {
    id: string;
    handshake: {
      auth: { token?: string };
      headers: Record<string, string | undefined>;
    };
    data: {
      user?: WsAuthenticatedUser;
      [key: string]: unknown;
    };
    join: jest.Mock;
    leave: jest.Mock;
    emit: jest.Mock;
    disconnect: jest.Mock;
  };

  const validUserId = 'c1234567-89ab-cdef-0123-456789abcdef';
  const validFirmId = 'f1234567-89ab-cdef-0123-456789abcdef';

  beforeEach(async () => {
    mockJwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: validUserId,
        email: 'operator@merqent.com',
        role: UserRole.PE_FIRM_MEMBER,
        type: 'access',
        firmId: validFirmId,
      }),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'jwt.secret') return 'test-jwt-secret-key-32-chars-long';
        return defaultValue;
      }),
    };

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: validUserId,
          email: 'operator@merqent.com',
          role: UserRole.PE_FIRM_MEMBER,
          status: UserStatus.ACTIVE,
          firmMember: {
            firmId: validFirmId,
          },
        }),
      },
    };

    mockRedis = {
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    };

    mockSocket = {
      id: 'socket-123',
      handshake: {
        auth: {
          token: 'valid-bearer-jwt-token',
        },
        headers: {},
      },
      data: {},
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        sockets: new Map([[mockSocket.id, mockSocket]]),
        adapter: {
          rooms: new Map([
            [`user:${validUserId}`, new Set([mockSocket.id])],
            [`firm:${validFirmId}`, new Set([mockSocket.id])],
          ]),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    gateway.server = mockServer as unknown as Server;
  });

  describe('handleConnection', () => {
    it('authenticates valid token, binds user to socket data, and joins user & firm rooms', async () => {
      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-bearer-jwt-token',
        expect.objectContaining({ secret: 'test-jwt-secret-key-32-chars-long' }),
      );
      expect(mockRedis.isTokenBlacklisted).toHaveBeenCalledWith('valid-bearer-jwt-token');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: validUserId },
        select: expect.any(Object),
      });

      expect(mockSocket.join).toHaveBeenCalledWith(`user:${validUserId}`);
      expect(mockSocket.join).toHaveBeenCalledWith(`firm:${validFirmId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.CONNECTION_ESTABLISHED,
        expect.objectContaining({
          socketId: mockSocket.id,
          userId: validUserId,
        }),
      );
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
      expect(gateway.getActiveConnectionCount()).toBe(1);
    });

    it('extracts token with Bearer prefix from headers.authorization if auth.token absent', async () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.headers.authorization = 'Bearer header-jwt-token';

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        'header-jwt-token',
        expect.any(Object),
      );
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('rejects connection when token is completely missing', async () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.headers = {};

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({ code: ErrorCode.WS_UNAUTHORIZED }),
      );
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('rejects connection when JWT verification throws (invalid signature / expired)', async () => {
      (mockJwtService.verifyAsync as jest.Mock).mockRejectedValueOnce(new Error('jwt expired'));

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({ code: ErrorCode.WS_AUTHENTICATION_FAILED }),
      );
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('rejects connection when token purpose is not access', async () => {
      (mockJwtService.verifyAsync as jest.Mock).mockResolvedValueOnce({
        sub: validUserId,
        type: 'refresh',
      });

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({ code: ErrorCode.WS_AUTHENTICATION_FAILED }),
      );
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('rejects connection when token is blacklisted in Redis', async () => {
      (mockRedis.isTokenBlacklisted as jest.Mock).mockResolvedValueOnce(true);

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({ code: ErrorCode.WS_UNAUTHORIZED }),
      );
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('rejects connection when user does not exist in database ground truth', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({ code: ErrorCode.WS_AUTHENTICATION_FAILED }),
      );
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('rejects connection when user status is SUSPENDED or DEACTIVATED', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: validUserId,
        email: 'operator@merqent.com',
        role: UserRole.PE_FIRM_MEMBER,
        status: UserStatus.SUSPENDED,
      });

      await gateway.handleConnection(mockSocket as unknown as Socket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({ code: ErrorCode.ACCOUNT_SUSPENDED }),
      );
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('cleans up connection tracking maps upon client disconnect', async () => {
      await gateway.handleConnection(mockSocket as unknown as Socket);
      expect(gateway.getActiveConnectionCount()).toBe(1);

      gateway.handleDisconnect(mockSocket as unknown as Socket);
      expect(gateway.getActiveConnectionCount()).toBe(0);
      expect(gateway.getUserSocketCount(validUserId)).toBe(0);
    });
  });

  describe('handleJoinRoom', () => {
    beforeEach(async () => {
      await gateway.handleConnection(mockSocket as unknown as Socket);
    });

    it('allows user to join their own verified firm room', () => {
      const result = gateway.handleJoinRoom(mockSocket as unknown as Socket, {
        roomId: `firm:${validFirmId}`,
      });

      expect(result).toEqual({
        event: RealtimeEvent.ROOM_JOINED,
        roomId: `firm:${validFirmId}`,
      });
      expect(mockSocket.join).toHaveBeenCalledWith(`firm:${validFirmId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ROOM_JOINED,
        expect.objectContaining({ roomId: `firm:${validFirmId}`, userId: validUserId }),
      );
    });

    it('denies access with WS_ROOM_JOIN_DENIED when attempting to join another firm room', () => {
      const targetOtherFirm = 'f9999999-9999-9999-9999-999999999999';

      gateway.handleJoinRoom(mockSocket as unknown as Socket, {
        roomId: `firm:${targetOtherFirm}`,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({ code: ErrorCode.WS_ROOM_JOIN_DENIED }),
      );
    });

    it('denies access when attempting to join another user private room', () => {
      const otherUser = 'c9999999-9999-9999-9999-999999999999';

      gateway.handleJoinRoom(mockSocket as unknown as Socket, {
        roomId: `user:${otherUser}`,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({ code: ErrorCode.WS_ROOM_JOIN_DENIED }),
      );
    });

    it('allows PLATFORM_ADMIN to join any room for administrative monitoring', () => {
      if (mockSocket.data.user) {
        mockSocket.data.user.role = UserRole.PLATFORM_ADMIN;
      }

      const result = gateway.handleJoinRoom(mockSocket as unknown as Socket, {
        roomId: 'firm:arbitrary-firm-123',
      });

      expect(result).toEqual({
        event: RealtimeEvent.ROOM_JOINED,
        roomId: 'firm:arbitrary-firm-123',
      });
      expect(mockSocket.join).toHaveBeenCalledWith('firm:arbitrary-firm-123');
    });

    it('rejects invalid payload schema (missing roomId)', () => {
      gateway.handleJoinRoom(mockSocket as unknown as Socket, {});

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({ code: ErrorCode.WS_INVALID_PAYLOAD }),
      );
    });
  });

  describe('handleLeaveRoom', () => {
    beforeEach(async () => {
      await gateway.handleConnection(mockSocket as unknown as Socket);
    });

    it('leaves room and emits room:left event', () => {
      const result = gateway.handleLeaveRoom(mockSocket as unknown as Socket, {
        roomId: `firm:${validFirmId}`,
      });

      expect(result).toEqual({
        event: RealtimeEvent.ROOM_LEFT,
        roomId: `firm:${validFirmId}`,
      });
      expect(mockSocket.leave).toHaveBeenCalledWith(`firm:${validFirmId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ROOM_LEFT,
        expect.objectContaining({ roomId: `firm:${validFirmId}` }),
      );
    });
  });

  describe('handleHeartbeat', () => {
    beforeEach(async () => {
      await gateway.handleConnection(mockSocket as unknown as Socket);
    });

    it('responds with heartbeat:ack for active, unrevoked connection', async () => {
      await gateway.handleHeartbeat(mockSocket as unknown as Socket, { timestamp: Date.now() });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.HEARTBEAT_ACK,
        expect.objectContaining({ timestamp: expect.any(String) }),
      );
    });

    it('disconnects active socket if token was revoked in Redis after connect', async () => {
      (mockRedis.isTokenBlacklisted as jest.Mock).mockResolvedValueOnce(true);

      await gateway.handleHeartbeat(mockSocket as unknown as Socket, { timestamp: Date.now() });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({ code: ErrorCode.WS_UNAUTHORIZED }),
      );
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('Server-Side Emitters & Lifecycle', () => {
    it('emits to user private room', () => {
      gateway.emitToUser(validUserId, 'test:event', { data: 123 });

      expect(mockServer.to).toHaveBeenCalledWith(`user:${validUserId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('test:event', { data: 123 });
    });

    it('emits to firm room', () => {
      gateway.emitToFirm(validFirmId, 'test:firm:event', { foo: 'bar' });

      expect(mockServer.to).toHaveBeenCalledWith(`firm:${validFirmId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('test:firm:event', { foo: 'bar' });
    });

    it('forcefully disconnects all sockets for a revoked user', async () => {
      await gateway.handleConnection(mockSocket as unknown as Socket);

      gateway.disconnectUserSockets(validUserId, 'User account suspended');

      expect(mockSocket.emit).toHaveBeenCalledWith(
        RealtimeEvent.ERROR,
        expect.objectContaining({ message: 'User account suspended' }),
      );
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect(gateway.getUserSocketCount(validUserId)).toBe(0);
    });
  });
});
