import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeService } from '../infrastructure/realtime/realtime.service';
import { RealtimeGateway } from '../infrastructure/realtime/realtime.gateway';
import { RedisIoAdapter } from '../infrastructure/realtime/redis-io.adapter';

describe('Cross-Module Integration: Realtime Clustering & In-Memory Fallback', () => {
  let realtimeService: RealtimeService;
  let mockGateway: jest.Mocked<Partial<RealtimeGateway>>;
  let mockAdapter: jest.Mocked<Partial<RedisIoAdapter>>;

  const testFirmId = 'f7777777-7777-7777-7777-777777777777';
  const testUserId = 'u7777777-7777-7777-7777-777777777777';

  beforeEach(async () => {
    mockGateway = {
      emitToUser: jest.fn(),
      emitToFirm: jest.fn(),
      emitToRoom: jest.fn(),
      disconnectUserSockets: jest.fn(),
      getActiveConnectionCount: jest.fn().mockReturnValue(2),
      getRoomsCount: jest.fn().mockReturnValue(2),
    };

    mockAdapter = {
      getStatus: jest.fn().mockReturnValue({
        isConnected: true,
        adapterType: 'redis',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeService, { provide: RealtimeGateway, useValue: mockGateway }],
    }).compile();

    realtimeService = module.get<RealtimeService>(RealtimeService);
    realtimeService.setRedisAdapter(mockAdapter as unknown as RedisIoAdapter);
  });

  it('delivers tenant-scoped notifications via RealtimeService across cluster rooms', () => {
    const payload = {
      noticeId: 'notice-001',
      title: 'New PMI Milestone Completed',
    };

    realtimeService.emitToFirm(testFirmId, 'milestone:completed', payload);

    expect(mockGateway.emitToFirm).toHaveBeenCalledWith(testFirmId, 'milestone:completed', payload);
  });

  it('delivers direct user alerts via RealtimeService targeting verified user room', () => {
    const payload = {
      alertId: 'alert-001',
      message: 'Connection request accepted',
    };

    realtimeService.emitToUser(testUserId, 'alert:new', payload);

    expect(mockGateway.emitToUser).toHaveBeenCalledWith(testUserId, 'alert:new', payload);
  });

  it('reports healthy connected status when Redis adapter is active', async () => {
    const health = await realtimeService.checkHealth();

    expect(health).toEqual({
      status: 'connected',
      adapter: 'redis',
      activeConnections: 2,
      roomsCount: 2,
    });
  });

  it('gracefully switches to degraded in-memory mode when Redis adapter disconnects', async () => {
    mockAdapter.getStatus = jest.fn().mockReturnValue({
      isConnected: false,
      adapterType: 'memory',
    });

    const health = await realtimeService.checkHealth();

    expect(health).toEqual({
      status: 'degraded',
      adapter: 'memory',
      activeConnections: 2,
      roomsCount: 2,
    });
  });

  it('reports connected with memory fallback when Redis adapter is not injected', async () => {
    const detachedService = new RealtimeService(mockGateway as unknown as RealtimeGateway);
    const health = await detachedService.checkHealth();

    expect(health.status).toBe('connected');
    expect(health.adapter).toBe('memory');
    expect(health.activeConnections).toBe(2);
  });
});
