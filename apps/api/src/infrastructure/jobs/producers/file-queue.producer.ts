import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  MalwareScanJobPayload,
  CleanupAbandonedJobPayload,
  ErrorCode,
} from '@merqent/shared-types';
import { MalwareScanJobPayloadSchema, CleanupAbandonedJobPayloadSchema } from '@merqent/validation';
import {
  QUEUE_FILE_PROCESSING,
  JOB_MALWARE_SCAN,
  JOB_CLEANUP_ABANDONED,
  DEFAULT_JOB_ATTEMPTS,
  DEFAULT_BACKOFF_DELAY_MS,
  COMPLETED_JOB_RETENTION_COUNT,
  COMPLETED_JOB_RETENTION_AGE_SECONDS,
  FAILED_JOB_RETENTION_COUNT,
  FAILED_JOB_RETENTION_AGE_SECONDS,
} from '../jobs.constants';

@Injectable()
export class FileQueueProducer {
  private readonly logger = new Logger(FileQueueProducer.name);
  private queue: Queue | null = null;

  /**
   * Assigns backing BullMQ Queue instance (injected via JobsService).
   */
  setQueue(queue: Queue | null) {
    this.queue = queue;
  }

  getQueue(): Queue | null {
    return this.queue;
  }

  /**
   * Enqueues an asynchronous malware scan job.
   *
   * SECURITY & RELIABILITY GUARANTEES:
   * 1. Payload contains ONLY minimal non-sensitive identifiers (fileRecordId, storageKey).
   *    Never contains tokens, credentials, presigned URLs, or raw file contents.
   * 2. Strict Zod schema validation before enqueueing.
   * 3. Idempotent deduplication using deterministic jobId: `malware-scan:{fileRecordId}`.
   * 4. Bounded retries (3 attempts) with exponential backoff.
   * 5. Strict completion/failure retention bounds to prevent unbounded Redis memory growth.
   */
  async enqueueMalwareScan(
    payload: MalwareScanJobPayload,
  ): Promise<{ jobId: string; status: 'enqueued' }> {
    const parseResult = MalwareScanJobPayloadSchema.safeParse(payload);
    if (!parseResult.success) {
      this.logger.warn(`Rejected invalid malware scan job payload: ${parseResult.error.message}`);
      throw new BadRequestException({
        errorCode: ErrorCode.JOB_PAYLOAD_INVALID,
        message: 'Invalid malware scan job payload',
        details: parseResult.error.flatten(),
      });
    }

    const validated = parseResult.data;
    const jobId = `${JOB_MALWARE_SCAN}:${validated.fileRecordId}`;

    if (!this.queue) {
      this.logger.warn(
        `Queue '${QUEUE_FILE_PROCESSING}' unavailable. Job '${jobId}' cannot be enqueued.`,
      );
      throw new ServiceUnavailableException({
        errorCode: ErrorCode.QUEUE_UNAVAILABLE,
        message: `Queue '${QUEUE_FILE_PROCESSING}' is currently unavailable`,
      });
    }

    try {
      const job = await this.queue.add(JOB_MALWARE_SCAN, validated, {
        jobId,
        attempts: DEFAULT_JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: DEFAULT_BACKOFF_DELAY_MS,
        },
        removeOnComplete: {
          count: COMPLETED_JOB_RETENTION_COUNT,
          age: COMPLETED_JOB_RETENTION_AGE_SECONDS,
        },
        removeOnFail: {
          count: FAILED_JOB_RETENTION_COUNT,
          age: FAILED_JOB_RETENTION_AGE_SECONDS,
        },
      });

      this.logger.log(`Enqueued malware scan job '${job.id}' for file '${validated.fileRecordId}'`);
      return {
        jobId: job.id || jobId,
        status: 'enqueued',
      };
    } catch (err: unknown) {
      this.logger.error(
        `Failed to enqueue malware scan job for file '${validated.fileRecordId}': ${(err as Error).message}`,
      );
      throw new InternalServerErrorException({
        errorCode: ErrorCode.JOB_ENQUEUE_FAILED,
        message: `Failed to enqueue malware scan job: ${(err as Error).message}`,
      });
    }
  }

  /**
   * Enqueues an asynchronous cleanup job for expired abandoned uploads.
   */
  async enqueueCleanupAbandoned(
    payload: CleanupAbandonedJobPayload = {},
  ): Promise<{ jobId: string; status: 'enqueued' }> {
    const parseResult = CleanupAbandonedJobPayloadSchema.safeParse(payload);
    if (!parseResult.success) {
      throw new BadRequestException({
        errorCode: ErrorCode.JOB_PAYLOAD_INVALID,
        message: 'Invalid abandoned cleanup job payload',
        details: parseResult.error.flatten(),
      });
    }

    const validated = parseResult.data;
    const timestampWindow = Math.floor(Date.now() / 60000); // 1-minute deduplication window
    const jobId = `${JOB_CLEANUP_ABANDONED}:${timestampWindow}`;

    if (!this.queue) {
      this.logger.warn(`Queue '${QUEUE_FILE_PROCESSING}' unavailable. Skipping cleanup enqueue.`);
      throw new ServiceUnavailableException({
        errorCode: ErrorCode.QUEUE_UNAVAILABLE,
        message: `Queue '${QUEUE_FILE_PROCESSING}' is currently unavailable`,
      });
    }

    try {
      const job = await this.queue.add(JOB_CLEANUP_ABANDONED, validated, {
        jobId,
        attempts: DEFAULT_JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: DEFAULT_BACKOFF_DELAY_MS,
        },
        removeOnComplete: {
          count: COMPLETED_JOB_RETENTION_COUNT,
          age: COMPLETED_JOB_RETENTION_AGE_SECONDS,
        },
        removeOnFail: {
          count: FAILED_JOB_RETENTION_COUNT,
          age: FAILED_JOB_RETENTION_AGE_SECONDS,
        },
      });

      this.logger.log(`Enqueued abandoned cleanup job '${job.id}'`);
      return {
        jobId: job.id || jobId,
        status: 'enqueued',
      };
    } catch (err: unknown) {
      this.logger.error(`Failed to enqueue abandoned cleanup job: ${(err as Error).message}`);
      throw new InternalServerErrorException({
        errorCode: ErrorCode.JOB_ENQUEUE_FAILED,
        message: `Failed to enqueue abandoned cleanup job: ${(err as Error).message}`,
      });
    }
  }

  /**
   * Alias for enqueueCleanupAbandoned
   */
  async enqueueAbandonedCleanup(
    payload: CleanupAbandonedJobPayload = {},
  ): Promise<{ jobId: string; status: 'enqueued' }> {
    return this.enqueueCleanupAbandoned(payload);
  }
}
