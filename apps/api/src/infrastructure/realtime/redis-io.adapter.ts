import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WS_MAX_HTTP_BUFFER_SIZE } from './realtime.constants';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private isConnected = false;
  private isConnecting = false;

  constructor(
    app: INestApplicationContext,
    private readonly configService?: ConfigService,
  ) {
    super(app);
    if (!this.configService) {
      this.configService = app.get(ConfigService);
    }
  }

  /**
   * Initializes Redis Pub/Sub clients for multi-instance Socket.IO clustering.
   * Falls back gracefully to the in-memory adapter if Redis is unreachable.
   */
  async connectToRedis(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      return;
    }
    this.isConnecting = true;

    const host = this.configService?.get<string>('redis.host', 'localhost') || 'localhost';
    const port = this.configService?.get<number>('redis.port', 6379) || 6379;
    const password = this.configService?.get<string>('redis.password');

    try {
      this.pubClient = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn(
              `Redis adapter reconnect limit reached (${times} attempts). Falling back.`,
            );
            return null;
          }
          return Math.min(times * 100, 2000);
        },
      });

      this.subClient = this.pubClient.duplicate();

      this.pubClient.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Socket.IO Redis adapter (PUB) connected to ${host}:${port}`);
      });

      this.subClient.on('connect', () => {
        this.logger.log(`Socket.IO Redis adapter (SUB) connected to ${host}:${port}`);
      });

      this.pubClient.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Socket.IO Redis adapter (PUB) error: ${err.message}`);
      });

      this.subClient.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Socket.IO Redis adapter (SUB) error: ${err.message}`);
      });

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
      this.isConnected = true;
      this.logger.log('Socket.IO multi-instance Redis adapter initialized successfully');
    } catch (err: unknown) {
      this.isConnected = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to connect Socket.IO Redis adapter to ${host}:${port}: ${msg}. Operating in in-memory fallback mode.`,
      );
    } finally {
      this.isConnecting = false;
    }
  }

  createIOServer(port: number, options?: Record<string, unknown>): Server {
    const rawOrigins = this.configService?.get<string | string[]>('cors.origins', [
      'http://localhost:3000',
    ]);
    const allowedOrigins = Array.isArray(rawOrigins)
      ? rawOrigins
      : typeof rawOrigins === 'string'
        ? rawOrigins.split(',').map((o) => o.trim())
        : ['http://localhost:3000'];

    const serverOptions = {
      ...options,
      maxHttpBufferSize: WS_MAX_HTTP_BUFFER_SIZE,
      cors: {
        origin: (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          if (
            process.env.NODE_ENV !== 'production' &&
            /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
          ) {
            return callback(null, true);
          }
          callback(new Error('CORS origin rejected by WebSocket security policy'));
        },
        credentials: true,
      },
    };

    const server = super.createIOServer(port, serverOptions);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
      this.logger.log('Attached Redis adapter to Socket.IO server');
    } else {
      this.logger.log('Socket.IO server running with in-memory adapter');
    }

    return server;
  }

  async close(): Promise<void> {
    if (this.pubClient) {
      try {
        await this.pubClient.quit();
      } catch (err: unknown) {
        this.logger.warn(`Error disconnecting Redis pubClient: ${(err as Error).message}`);
      }
      this.pubClient = null;
    }

    if (this.subClient) {
      try {
        await this.subClient.quit();
      } catch (err: unknown) {
        this.logger.warn(`Error disconnecting Redis subClient: ${(err as Error).message}`);
      }
      this.subClient = null;
    }

    this.isConnected = false;
    this.adapterConstructor = null;
    this.logger.log('Socket.IO Redis adapter closed cleanly');
  }

  getStatus(): { isConnected: boolean; adapterType: 'redis' | 'memory' } {
    return {
      isConnected: this.isConnected,
      adapterType: this.adapterConstructor && this.isConnected ? 'redis' : 'memory',
    };
  }
}
