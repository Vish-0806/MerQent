import { RedisService } from '../../infrastructure/redis/redis.service';

export interface MockRedisService {
  isTokenBlacklisted: jest.Mock;
  blacklistToken: jest.Mock;
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  ping: jest.Mock;
  checkHealth: jest.Mock;
  disconnect: jest.Mock;
  getClient: jest.Mock;
  isReady: jest.Mock;
  _store: Map<string, string>;
  _blacklist: Set<string>;
  reset: () => void;
}

/**
 * Creates an in-memory, deterministic MockRedisService for tests.
 */
export function createMockRedisService(): MockRedisService & Partial<RedisService> {
  const store = new Map<string, string>();
  const blacklist = new Set<string>();

  const mock: MockRedisService = {
    _store: store,
    _blacklist: blacklist,
    reset: () => {
      store.clear();
      blacklist.clear();
      mock.isTokenBlacklisted.mockClear();
      mock.blacklistToken.mockClear();
      mock.get.mockClear();
      mock.set.mockClear();
      mock.del.mockClear();
    },
    isTokenBlacklisted: jest.fn().mockImplementation(async (token: string) => {
      return blacklist.has(token);
    }),
    blacklistToken: jest.fn().mockImplementation(async (token: string) => {
      blacklist.add(token);
    }),
    get: jest.fn().mockImplementation(async (key: string) => {
      return store.get(key) ?? null;
    }),
    set: jest.fn().mockImplementation(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    del: jest.fn().mockImplementation(async (key: string) => {
      const existed = store.delete(key);
      return existed ? 1 : 0;
    }),
    isReady: jest.fn().mockReturnValue(true),
    ping: jest.fn().mockResolvedValue('PONG'),
    checkHealth: jest.fn().mockResolvedValue({
      status: 'connected',
      latencyMs: 1,
    }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getClient: jest.fn().mockReturnValue({
      status: 'ready',
      ping: jest.fn().mockResolvedValue('PONG'),
      incr: jest.fn().mockImplementation(async (k: string) => {
        const val = Number(store.get(k) || 0) + 1;
        store.set(k, String(val));
        return val;
      }),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(60),
    }),
  };

  return mock as unknown as MockRedisService & Partial<RedisService>;
}
