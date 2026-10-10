import { RealtimeService } from '../../infrastructure/realtime/realtime.service';
import { RealtimeHealthStatus } from '@merqent/shared-types';

export interface MockRealtimeService {
  emitToUser: jest.Mock;
  emitToFirm: jest.Mock;
  emitToRoom: jest.Mock;
  disconnectUser: jest.Mock;
  checkHealth: jest.Mock;
  reset: () => void;
}

/**
 * Creates a mock RealtimeService for domain and integration tests.
 */
export function createMockRealtimeService(): MockRealtimeService & Partial<RealtimeService> {
  const service: MockRealtimeService = {
    emitToUser: jest.fn().mockReturnValue(true),
    emitToFirm: jest.fn().mockReturnValue(true),
    emitToRoom: jest.fn().mockReturnValue(true),
    disconnectUser: jest.fn().mockResolvedValue(1),
    checkHealth: jest.fn().mockReturnValue({
      status: 'connected',
      adapter: 'redis',
      activeConnections: 5,
      roomsCount: 3,
    } as RealtimeHealthStatus),
    reset: () => {
      service.emitToUser.mockClear();
      service.emitToFirm.mockClear();
      service.emitToRoom.mockClear();
      service.disconnectUser.mockClear();
      service.checkHealth.mockClear();
    },
  };

  return service as unknown as MockRealtimeService & Partial<RealtimeService>;
}

/**
 * Creates a mock Socket.IO client socket for WebSocket gateway tests.
 */
export function createMockSocket(socketId = 'mock-socket-001') {
  return {
    id: socketId,
    handshake: {
      auth: { token: 'mock-valid-jwt-token' },
      headers: {},
    },
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
}
