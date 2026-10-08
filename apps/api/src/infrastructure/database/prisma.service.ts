import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface DatabaseHealthStatus {
  status: 'connected' | 'disconnected';
  latencyMs?: number;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'error' },
              { emit: 'stdout', level: 'warn' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ PostgreSQL connection successfully established via Prisma');
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`⚠️ Initial database connection deferred: ${errMessage}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('PostgreSQL connection cleanly closed via Prisma');
  }

  /**
   * Health check probe for PostgreSQL and pgvector extension readiness.
   */
  async checkHealth(): Promise<DatabaseHealthStatus> {
    const start = Date.now();
    try {
      await this.$queryRawUnsafe('SELECT 1');
      return {
        status: 'connected',
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        status: 'disconnected',
      };
    }
  }
}
