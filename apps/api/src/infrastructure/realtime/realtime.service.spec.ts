import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeService } from './realtime.service';
import { RealtimeGateway } from './realtime.gateway';
import { RedisIoAdapter } from './redis-io.adapter';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let mockGateway: jest.Mocked<Partial<RealtimeGateway>>;
  let mockRedisAdapter: jest.Mocked<Partial<RedisIoAdapter>>;

  beforeEach(async () => {
    mockGateway = {
      emitToUser: jest.fn(),
      emitToFirm: jest.fn(),
      emitToRoom: jest.fn(),
      disconnectUserSockets: jest.fn(),
      getActiveConnectionCount: jest.fn().mockReturnValue(12),
      getRoomsCount: jest.fn().mockReturnValue(5),
    };

    mockRedisAdapter = {
      getStatus: jest.fn().mockReturnValue({ isConnected: true, adapterType: 'redis' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeService, { provide: RealtimeGateway, useValue: mockGateway }],
    }).compile();

    service = module.get<RealtimeService>(RealtimeService);
  });

  describe('Domain Emitters', () => {
    it('delegates emitToUser to gateway', () => {
      service.emitToUser('user-1', 'event:test', { data: 1 });
      expect(mockGateway.emitToUser).toHaveBeenCalledWith('user-1', 'event:test', { data: 1 });
    });

    it('delegates emitToFirm to gateway', () => {
      service.emitToFirm('firm-1', 'event:firm', { data: 2 });
      expect(mockGateway.emitToFirm).toHaveBeenCalledWith('firm-1', 'event:firm', { data: 2 });
    });

    it('delegates emitToRoom to gateway', () => {
      service.emitToRoom('room-1', 'event:room', { data: 3 });
      expect(mockGateway.emitToRoom).toHaveBeenCalledWith('room-1', 'event:room', { data: 3 });
    });

    it('delegates disconnectUser to gateway', () => {
      service.disconnectUser('user-1', 'Session expired');
      expect(mockGateway.disconnectUserSockets).toHaveBeenCalledWith('user-1', 'Session expired');
    });
  });

  describe('checkHealth', () => {
    it('reports connected with memory adapter when no Redis adapter is attached', async () => {
      const health = await service.checkHealth();

      expect(health).toEqual({
        status: 'connected',
        adapter: 'memory',
        activeConnections: 12,
        roomsCount: 5,
      });
    });

    it('reports connected with redis adapter when Redis adapter is connected', async () => {
      service.setRedisAdapter(mockRedisAdapter as unknown as RedisIoAdapter);

      const health = await service.checkHealth();

      expect(health).toEqual({
        status: 'connected',
        adapter: 'redis',
        activeConnections: 12,
        roomsCount: 5,
      });
    });

    it('reports degraded when Redis adapter is disconnected', async () => {
      (mockRedisAdapter.getStatus as jest.Mock).mockReturnValueOnce({
        isConnected: false,
        adapterType: 'redis',
      });
      service.setRedisAdapter(mockRedisAdapter as unknown as RedisIoAdapter);

      const health = await service.checkHealth();

      expect(health).toEqual({
        status: 'degraded',
        adapter: 'redis',
        activeConnections: 12,
        roomsCount: 5,
      });
    });
  });
});
