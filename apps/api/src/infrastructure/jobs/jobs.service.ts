import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  BeforeApplicationShutdown,
} from '@nestjs/common';
import { Queue, Worker, ConnectionOptions } from 'bullmq';
import { AppConfigService } from '../../common/config/app-config.service';
import { FileQueueProducer } from './producers/file-queue.producer';
import { FileQueueProcessor } from './processors/file-queue.processor';
import { QueueHealthStatus } from '@merqent/shared-types';
import { QUEUE_FILE_PROCESSING } from './jobs.constants';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy, BeforeApplicationShutdown {
  private readonly logger = new Logger(JobsService.name);
  private fileQueue: Queue | null = null;
  private fileWorker: Worker | null = null;
  private isShuttingDown = false;

  constructor(
    private readonly config: AppConfigService,
    private readonly fileProducer: FileQueueProducer,
    private readonly fileProcessor: FileQueueProcessor,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing background job queues and workers...');

    const connection: ConnectionOptions = {
      host: this.config.redisHost,
      port: this.config.redisPort,
      ...(this.config.redisPassword ? { password: this.config.redisPassword } : {}),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };

    try {
      // 1. Initialize BullMQ Queue
      this.fileQueue = new Queue(QUEUE_FILE_PROCESSING, {
        connection,
      });

      this.fileProducer.setQueue(this.fileQueue);
      this.logger.log(`BullMQ Queue '${QUEUE_FILE_PROCESSING}' registered`);

      // 2. Initialize BullMQ Worker Processor
      this.fileWorker = new Worker(
        QUEUE_FILE_PROCESSING,
        async (job) => this.fileProcessor.process(job),
        {
          connection,
          concurrency: 5,
        },
      );

      this.fileWorker.on('completed', (job) => {
        this.logger.debug(`Job '${job.id}' (${job.name}) completed successfully`);
      });

      this.fileWorker.on('failed', (job, err) => {
        this.logger.warn(`Job '${job?.id}' (${job?.name}) failed: ${err.message}`);
      });

      this.fileWorker.on('error', (err) => {
        this.logger.error(`BullMQ worker error in '${QUEUE_FILE_PROCESSING}': ${err.message}`);
      });

      this.logger.log(`BullMQ Worker for '${QUEUE_FILE_PROCESSING}' started with concurrency 5`);
    } catch (err: unknown) {
      this.logger.error(
        `Failed to initialize background job queue or worker: ${(err as Error).message}`,
      );
    }
  }

  async beforeApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutdown initiated (signal: ${signal}). Pausing job workers...`);
    this.isShuttingDown = true;
    if (this.fileWorker) {
      try {
        await this.fileWorker.pause(true);
        this.logger.log('BullMQ workers paused');
      } catch (err: unknown) {
        this.logger.warn(`Error pausing worker during shutdown: ${(err as Error).message}`);
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log('Gracefully stopping background job queues and workers...');

    // 1. Close Worker
    if (this.fileWorker) {
      try {
        await this.fileWorker.close();
        this.logger.log(`BullMQ Worker '${QUEUE_FILE_PROCESSING}' stopped`);
      } catch (err: unknown) {
        this.logger.warn(`Error closing worker: ${(err as Error).message}`);
      }
      this.fileWorker = null;
    }

    // 2. Close Queue
    if (this.fileQueue) {
      try {
        await this.fileQueue.close();
        this.logger.log(`BullMQ Queue '${QUEUE_FILE_PROCESSING}' closed`);
      } catch (err: unknown) {
        this.logger.warn(`Error closing queue: ${(err as Error).message}`);
      }
      this.fileQueue = null;
    }
  }

  getFileQueue(): Queue | null {
    return this.fileQueue;
  }

  getFileWorker(): Worker | null {
    return this.fileWorker;
  }

  getQueue(queueName: string): Queue | undefined {
    if (queueName === QUEUE_FILE_PROCESSING) {
      return this.fileQueue ?? undefined;
    }
    return undefined;
  }

  getWorker(queueName: string): Worker | undefined {
    if (queueName === QUEUE_FILE_PROCESSING) {
      return this.fileWorker ?? undefined;
    }
    return undefined;
  }

  /**
   * Health probe evaluating queue responsiveness and worker operational status.
   */
  async checkHealth(): Promise<QueueHealthStatus> {
    if (!this.fileQueue || this.isShuttingDown) {
      return {
        status: 'unhealthy',
        queues: {},
        workerStatus: 'stopped',
      };
    }

    try {
      const counts = await this.fileQueue.getJobCounts('waiting', 'active', 'failed', 'paused');
      const isPaused = await this.fileQueue.isPaused();
      const failedCount = counts.failed || 0;

      const isDegraded = failedCount > 20 || isPaused;

      return {
        status: isDegraded ? 'degraded' : 'healthy',
        queues: {
          [QUEUE_FILE_PROCESSING]: {
            isPaused,
            waiting: counts.waiting || 0,
            active: counts.active || 0,
            failed: failedCount,
          },
        },
        workerStatus: this.fileWorker?.isRunning() ? 'running' : 'paused',
      };
    } catch {
      return {
        status: 'unhealthy',
        queues: {},
        workerStatus: 'stopped',
      };
    }
  }
}
