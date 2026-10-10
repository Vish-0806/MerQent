import { Injectable, Optional } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RedisIoAdapter } from './redis-io.adapter';
import { RealtimeHealthStatus } from '@merqent/shared-types';

@Injectable()
export class RealtimeService {
  private redisAdapter: RedisIoAdapter | null = null;

  constructor(
    private readonly gateway: RealtimeGateway,
    @Optional() redisAdapter?: RedisIoAdapter,
  ) {
    if (redisAdapter) {
      this.redisAdapter = redisAdapter;
    }
  }

  setRedisAdapter(adapter: RedisIoAdapter): void {
    this.redisAdapter = adapter;
  }

  /**
   * Emits a typed event to all active sockets of a specific user.
   */
  emitToUser(userId: string, event: string, payload: unknown): void {
    this.gateway.emitToUser(userId, event, payload);
  }

  /**
   * Emits a typed event to all active sockets within a verified firm room.
   */
  emitToFirm(firmId: string, event: string, payload: unknown): void {
    this.gateway.emitToFirm(firmId, event, payload);
  }

  /**
   * Emits a typed event to an authorized arbitrary room.
   */
  emitToRoom(roomId: string, event: string, payload: unknown): void {
    this.gateway.emitToRoom(roomId, event, payload);
  }

  /**
   * Forcefully disconnects all active sockets belonging to a user (e.g. on logout, revocation, suspension).
   */
  disconnectUser(userId: string, reason = 'Session terminated'): void {
    this.gateway.disconnectUserSockets(userId, reason);
  }

  /**
   * Evaluates realtime gateway and adapter health without disrupting primary API readiness.
   */
  async checkHealth(): Promise<RealtimeHealthStatus> {
    const activeConnections = this.gateway.getActiveConnectionCount();
    const roomsCount = this.gateway.getRoomsCount();

    if (!this.redisAdapter) {
      return {
        status: 'connected',
        adapter: 'memory',
        activeConnections,
        roomsCount,
      };
    }

    const { isConnected, adapterType } = this.redisAdapter.getStatus();

    return {
      status: adapterType === 'redis' && isConnected ? 'connected' : 'degraded',
      adapter: adapterType,
      activeConnections,
      roomsCount,
    };
  }
}
