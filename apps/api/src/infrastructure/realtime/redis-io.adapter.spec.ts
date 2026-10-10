import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisIoAdapter } from './redis-io.adapter';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

jest.mock('ioredis');
jest.mock('@socket.io/redis-adapter');

describe('RedisIoAdapter', () => {
  let adapter: RedisIoAdapter;
  let mockApp: jest.Mocked<Partial<INestApplicationContext>>;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;
  let mockPubClient: {
    connect: jest.Mock;
    duplicate: jest.Mock;
    on: jest.Mock;
    quit: jest.Mock;
  };
  let mockSubClient: {
    connect: jest.Mock;
    on: jest.Mock;
    quit: jest.Mock;
  };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'redis.host') return '127.0.0.1';
        if (key === 'redis.port') return 6379;
        if (key === 'redis.password') return undefined;
        if (key === 'cors.origins') return ['http://localhost:3000'];
        return defaultValue;
      }),
    };

    mockApp = {
      get: jest.fn().mockReturnValue(mockConfigService),
    };

    mockSubClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn().mockReturnThis(),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    mockPubClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      duplicate: jest.fn().mockReturnValue(mockSubClient),
      on: jest.fn().mockReturnThis(),
      quit: jest.fn().mockResolvedValue('OK'),
    };

    (Redis as unknown as jest.Mock).mockImplementation(() => mockPubClient);
    (createAdapter as unknown as jest.Mock).mockReturnValue(jest.fn());

    adapter = new RedisIoAdapter(
      mockApp as INestApplicationContext,
      mockConfigService as ConfigService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connectToRedis', () => {
    it('successfully connects pub and sub clients and initializes Redis adapter', async () => {
      await adapter.connectToRedis();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: '127.0.0.1',
          port: 6379,
          lazyConnect: true,
        }),
      );
      expect(mockPubClient.duplicate).toHaveBeenCalled();
      expect(mockPubClient.connect).toHaveBeenCalled();
      expect(mockSubClient.connect).toHaveBeenCalled();
      expect(createAdapter).toHaveBeenCalledWith(mockPubClient, mockSubClient);

      const status = adapter.getStatus();
      expect(status.isConnected).toBe(true);
      expect(status.adapterType).toBe('redis');
    });

    it('falls back gracefully to memory adapter when Redis connection rejects', async () => {
      mockPubClient.connect.mockRejectedValueOnce(new Error('Connection refused'));

      await adapter.connectToRedis();

      const status = adapter.getStatus();
      expect(status.isConnected).toBe(false);
      expect(status.adapterType).toBe('memory');
    });
  });

  describe('createIOServer', () => {
    it('creates IO server with maxHttpBufferSize and attaches adapter if connected', async () => {
      await adapter.connectToRedis();

      const mockServer = {
        adapter: jest.fn(),
      };
      // Spy on super.createIOServer
      jest
        .spyOn(Object.getPrototypeOf(RedisIoAdapter.prototype), 'createIOServer')
        .mockReturnValue(mockServer);

      const server = adapter.createIOServer(4000);

      expect(server).toBe(mockServer);
      expect(mockServer.adapter).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('gracefully quits pub and sub clients on shutdown', async () => {
      await adapter.connectToRedis();
      await adapter.close();

      expect(mockPubClient.quit).toHaveBeenCalled();
      expect(mockSubClient.quit).toHaveBeenCalled();

      const status = adapter.getStatus();
      expect(status.isConnected).toBe(false);
      expect(status.adapterType).toBe('memory');
    });
  });
});
