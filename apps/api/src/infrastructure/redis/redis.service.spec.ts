import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

interface TestRedisService {
  client: unknown;
  isConnected: boolean;
}

describe('RedisService Health Check (Task 2.12)', () => {
  let service: RedisService;
  let mockConfig: Partial<ConfigService>;

  beforeEach(() => {
    mockConfig = {
      get: jest.fn().mockImplementation((key: string, defaultVal: unknown) => {
        if (key === 'redis.host') return 'localhost';
        if (key === 'redis.port') return 6379;
        return defaultVal;
      }),
    };
    service = new RedisService(mockConfig as ConfigService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should return disconnected when client is not initialized or offline', async () => {
    const health = await service.checkHealth();
    expect(health.status).toBe('disconnected');
    expect(health.latencyMs).toBeUndefined();
  });

  it('should report connected and return latency when ping succeeds', async () => {
    const mockClient = {
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    const testService = service as unknown as TestRedisService;
    testService.client = mockClient;
    testService.isConnected = true;

    const health = await service.checkHealth();

    expect(health.status).toBe('connected');
    expect(typeof health.latencyMs).toBe('number');
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should report disconnected when ping throws an error', async () => {
    const mockClient = {
      ping: jest.fn().mockRejectedValue(new Error('Connection refused')),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    const testService = service as unknown as TestRedisService;
    testService.client = mockClient;
    testService.isConnected = true;

    const health = await service.checkHealth();

    expect(health.status).toBe('disconnected');
  });
});
