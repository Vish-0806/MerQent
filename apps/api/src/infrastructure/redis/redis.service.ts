import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('redis.host', 'localhost');
    const port = this.config.get<number>('redis.port', 6379);
    const password = this.config.get<string>('redis.password');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn(`Redis reconnection failed after ${times} attempts; stopping retries`);
            return null;
          }
          return Math.min(times * 100, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis at ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection error: ${err.message}`);
      });

      this.client.connect().catch((err) => {
        this.logger.warn(`Failed initial connection to Redis: ${err.message}`);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to initialize Redis client: ${msg}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Redis client disconnected cleanly');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Error disconnecting Redis: ${msg}`);
      }
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Health check probe for Redis connectivity and latency.
   */
  async checkHealth(): Promise<{ status: 'connected' | 'disconnected'; latencyMs?: number }> {
    if (!this.client || !this.isConnected) {
      return { status: 'disconnected' };
    }
    const start = Date.now();
    try {
      const pong = await this.client.ping();
      if (pong === 'PONG') {
        return {
          status: 'connected',
          latencyMs: Date.now() - start,
        };
      }
      return { status: 'disconnected' };
    } catch {
      return { status: 'disconnected' };
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis GET error for key ${key}: ${msg}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    if (!this.client) return null;
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        return await this.client.set(key, value, 'EX', ttlSeconds);
      }
      return await this.client.set(key, value);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis SET error for key ${key}: ${msg}`);
      return null;
    }
  }

  async del(key: string): Promise<number> {
    if (!this.client) return 0;
    try {
      return await this.client.del(key);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Redis DEL error for key ${key}: ${msg}`);
      return 0;
    }
  }

  /**
   * Blacklist a token identifier or token hash for immediate cluster-wide revocation.
   */
  async blacklistToken(tokenIdentifier: string, ttlSeconds: number): Promise<void> {
    const key = `blacklist:token:${tokenIdentifier}`;
    await this.set(key, 'revoked', ttlSeconds);
    this.logger.debug(`Token ${tokenIdentifier.slice(0, 8)}... added to revocation blacklist`);
  }

  /**
   * Check if a token has been blacklisted.
   */
  async isTokenBlacklisted(tokenIdentifier: string): Promise<boolean> {
    const key = `blacklist:token:${tokenIdentifier}`;
    const result = await this.get(key);
    return result !== null;
  }
}
