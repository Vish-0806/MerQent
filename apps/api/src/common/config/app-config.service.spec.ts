import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';

describe('AppConfigService (Task 2.11: Common Infrastructure)', () => {
  let appConfig: AppConfigService;
  let mockConfigService: { get: jest.Mock };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn(),
    };
    appConfig = new AppConfigService(mockConfigService as unknown as ConfigService);
  });

  it('provides typed getters for application settings', () => {
    mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
      const map: Record<string, unknown> = {
        nodeEnv: 'production',
        port: 4000,
        apiBaseUrl: 'https://api.merqent.com',
        webAppUrl: 'https://app.merqent.com',
        'jwt.secret': 'secret-12345678901234567890123456',
        'jwt.expiresIn': '15m',
        'jwt.refreshSecret': 'refresh-secret-123456789012345678',
        'jwt.refreshExpiresIn': '7d',
        'redis.host': 'redis-cluster.internal',
        'redis.port': 6379,
        'database.url': 'postgresql://merqent:pass@db:5432/merqent',
        'cors.origins': ['https://app.merqent.com'],
      };
      return map[key] !== undefined ? map[key] : defaultValue;
    });

    expect(appConfig.isProduction).toBe(true);
    expect(appConfig.isDevelopment).toBe(false);
    expect(appConfig.isTest).toBe(false);
    expect(appConfig.port).toBe(4000);
    expect(appConfig.apiBaseUrl).toBe('https://api.merqent.com');
    expect(appConfig.webAppUrl).toBe('https://app.merqent.com');
    expect(appConfig.jwtSecret).toBe('secret-12345678901234567890123456');
    expect(appConfig.jwtExpiresIn).toBe('15m');
    expect(appConfig.refreshSecret).toBe('refresh-secret-123456789012345678');
    expect(appConfig.refreshExpiresIn).toBe('7d');
    expect(appConfig.redisHost).toBe('redis-cluster.internal');
    expect(appConfig.redisPort).toBe(6379);
    expect(appConfig.databaseUrl).toBe('postgresql://merqent:pass@db:5432/merqent');
    expect(appConfig.corsOrigins).toEqual(['https://app.merqent.com']);
  });
});
