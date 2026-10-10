import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Strongly typed wrapper around NestJS ConfigService.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get isProduction(): boolean {
    return this.config.get<string>('nodeEnv') === 'production';
  }

  get isDevelopment(): boolean {
    return this.config.get<string>('nodeEnv') === 'development';
  }

  get isTest(): boolean {
    return this.config.get<string>('nodeEnv') === 'test';
  }

  get port(): number {
    return this.config.get<number>('port', 4000);
  }

  get logLevel(): string {
    return (
      this.config.get<string>('observability.logLevel') ||
      process.env.LOG_LEVEL ||
      (this.isProduction ? 'info' : 'debug')
    );
  }

  get apiBaseUrl(): string {
    return this.config.get<string>('apiBaseUrl', 'http://localhost:4000');
  }

  get webAppUrl(): string {
    return this.config.get<string>('webAppUrl', 'http://localhost:3000');
  }

  get jwtSecret(): string {
    return this.config.get<string>('jwt.secret', '');
  }

  get jwtExpiresIn(): string {
    return this.config.get<string>('jwt.expiresIn', '15m');
  }

  get refreshSecret(): string {
    return this.config.get<string>('jwt.refreshSecret', '');
  }

  get refreshExpiresIn(): string {
    return this.config.get<string>('jwt.refreshExpiresIn', '7d');
  }

  get redisHost(): string {
    return this.config.get<string>('redis.host', 'localhost');
  }

  get redisPort(): number {
    return this.config.get<number>('redis.port', 6379);
  }

  get redisPassword(): string | undefined {
    return this.config.get<string>('redis.password');
  }

  get redisConnectionOptions(): {
    host: string;
    port: number;
    password?: string;
    maxRetriesPerRequest: null;
    enableReadyCheck: boolean;
  } {
    return {
      host: this.redisHost,
      port: this.redisPort,
      ...(this.redisPassword ? { password: this.redisPassword } : {}),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }

  get databaseUrl(): string {
    return this.config.get<string>('database.url', '');
  }

  get corsOrigins(): string | string[] {
    return this.config.get<string | string[]>('cors.origins', ['http://localhost:3000']);
  }

  get storageDriver(): string {
    return this.config.get<string>('storage.driver', 's3');
  }

  get storageEndpoint(): string {
    return this.config.get<string>('storage.endpoint', 'http://localhost:9000');
  }

  get storageRegion(): string {
    return this.config.get<string>('storage.region', 'us-east-1');
  }

  get storageBucket(): string {
    return this.config.get<string>('storage.bucket', 'merqent-secure-documents');
  }

  get storageAccessKeyId(): string {
    return this.config.get<string>('storage.accessKeyId', 'minioadmin');
  }

  get storageSecretAccessKey(): string {
    return this.config.get<string>('storage.secretAccessKey', 'minioadmin');
  }

  get storageSignedUrlExpirySeconds(): number {
    return this.config.get<number>('storage.signedUrlExpirySeconds', 900);
  }
}
