import { Injectable, Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { STORAGE_SERVICE_TOKEN, IStorageService } from '../../storage/storage.interface';
import {
  MALWARE_SCANNER_TOKEN,
  IMalwareScanner,
} from '../../storage/malware/malware-scanner.interface';
import { FileScanStatus, QueueJobResult } from '@merqent/shared-types';
import { MalwareScanJobPayloadSchema, CleanupAbandonedJobPayloadSchema } from '@merqent/validation';
import { JOB_MALWARE_SCAN, JOB_CLEANUP_ABANDONED } from '../jobs.constants';

@Injectable()
export class FileQueueProcessor {
  private readonly logger = new Logger(FileQueueProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE_TOKEN)
    private readonly storage: IStorageService,
    @Inject(MALWARE_SCANNER_TOKEN)
    private readonly malwareScanner: IMalwareScanner,
  ) {}

  /**
   * Processes an incoming job from the 'file-processing' queue.
   */
  async process(job: Job): Promise<QueueJobResult> {
    this.logger.log(`Processing job '${job.id}' of type '${job.name}'`);

    switch (job.name) {
      case JOB_MALWARE_SCAN:
        return this.processMalwareScan(job);
      case JOB_CLEANUP_ABANDONED:
        return this.processAbandonedCleanup(job);
      default:
        this.logger.warn(`Unknown job type '${job.name}' for job '${job.id}'`);
        return {
          jobId: job.id || 'unknown',
          queueName: job.queueName,
          status: 'skipped',
          message: `Unknown job type '${job.name}'`,
          processedAt: new Date().toISOString(),
        };
    }
  }

  /**
   * Processes a background malware scan job.
   *
   * SECURITY & TENANT VALIDATION:
   * 1. Fetches current record from PostgreSQL.
   * 2. Verifies storageKey matches database record to prevent arbitrary key manipulation.
   * 3. Idempotent: Skips re-processing if already CLEAN or INFECTED.
   * 4. Fails closed: Never marks CLEAN if scanner is unattached/inactive or throws.
   * 5. Quarantines and purges object from S3 if infected.
   */
  private async processMalwareScan(job: Job): Promise<QueueJobResult> {
    const parseResult = MalwareScanJobPayloadSchema.safeParse(job.data);
    if (!parseResult.success) {
      this.logger.error(
        `Invalid malware scan payload in job '${job.id}': ${parseResult.error.message}`,
      );
      throw new Error(`Invalid job payload: ${parseResult.error.message}`);
    }

    const { fileRecordId, storageKey, tenantId } = parseResult.data;

    const fileRecord = await this.prisma.fileRecord.findUnique({
      where: { id: fileRecordId },
    });

    if (!fileRecord) {
      this.logger.warn(`FileRecord '${fileRecordId}' not found. Job '${job.id}' skipped.`);
      return {
        jobId: job.id || fileRecordId,
        queueName: job.queueName,
        status: 'skipped',
        message: `FileRecord '${fileRecordId}' not found`,
        processedAt: new Date().toISOString(),
      };
    }

    // Tenant & Storage Key Verification against DB ground truth
    if (fileRecord.storageKey !== storageKey) {
      this.logger.error(
        `SECURITY ALERT: Queued storageKey '${storageKey}' does not match DB storageKey '${fileRecord.storageKey}' for file '${fileRecordId}'. Aborting job.`,
      );
      throw new Error('Tenant storage key mismatch');
    }

    if (tenantId && !fileRecord.storageKey.startsWith(`tenants/${tenantId}/`)) {
      this.logger.error(
        `SECURITY ALERT: Queued tenantId '${tenantId}' does not own file '${fileRecordId}' with key '${fileRecord.storageKey}'. Aborting job.`,
      );
      throw new Error('Tenant ownership mismatch');
    }

    // Idempotency check: Skip if already verified
    if (fileRecord.scanStatus === FileScanStatus.CLEAN) {
      this.logger.log(`File '${fileRecordId}' is already verified CLEAN. Skipping scan.`);
      return {
        jobId: job.id || fileRecordId,
        queueName: job.queueName,
        status: 'completed',
        message: 'File already CLEAN',
        processedAt: new Date().toISOString(),
      };
    }

    if (fileRecord.scanStatus === FileScanStatus.INFECTED) {
      this.logger.warn(`File '${fileRecordId}' is already quarantined as INFECTED. Skipping scan.`);
      return {
        jobId: job.id || fileRecordId,
        queueName: job.queueName,
        status: 'completed',
        message: 'File already INFECTED and quarantined',
        processedAt: new Date().toISOString(),
      };
    }

    // Verify object presence in S3
    const objectMeta = await this.storage.headObject(fileRecord.storageKey);
    if (!objectMeta) {
      this.logger.warn(`Object '${fileRecord.storageKey}' not found in S3 during background scan.`);
      return {
        jobId: job.id || fileRecordId,
        queueName: job.queueName,
        status: 'failed',
        message: 'Storage object missing in S3',
        processedAt: new Date().toISOString(),
      };
    }

    // Fail-closed inspection: Inactive scanner check
    if (!this.malwareScanner.isLive) {
      this.logger.warn(
        `Malware scanner daemon is unattached/inactive for file '${fileRecordId}'. Failing closed: status remains PENDING.`,
      );
      return {
        jobId: job.id || fileRecordId,
        queueName: job.queueName,
        status: 'completed',
        message: 'Scanner inactive; file remains PENDING',
        processedAt: new Date().toISOString(),
      };
    }

    // Execute scan with active scanner
    try {
      const scanResult = await this.malwareScanner.scan(fileRecord.storageKey);

      if (!scanResult.isClean) {
        if (scanResult.status === FileScanStatus.INFECTED) {
          // Quarantine: delete object from storage immediately
          await this.storage.deleteFile(fileRecord.storageKey);
          await this.prisma.fileRecord.update({
            where: { id: fileRecordId },
            data: { scanStatus: FileScanStatus.INFECTED },
          });

          this.logger.error(
            `SECURITY ALERT: Background scan detected malware in '${fileRecordId}'. Object purged and quarantined.`,
          );

          return {
            jobId: job.id || fileRecordId,
            queueName: job.queueName,
            status: 'completed',
            message: 'Infected object quarantined and deleted from storage',
            processedAt: new Date().toISOString(),
          };
        }

        // Scanner returned non-clean without explicit infection
        this.logger.warn(
          `Scanner returned non-clean status for '${fileRecordId}'. File remains PENDING.`,
        );
        return {
          jobId: job.id || fileRecordId,
          queueName: job.queueName,
          status: 'completed',
          message: 'Scan inconclusive; file remains PENDING',
          processedAt: new Date().toISOString(),
        };
      }

      // Scanner explicitly cleared the file as clean
      await this.prisma.fileRecord.update({
        where: { id: fileRecordId },
        data: { scanStatus: FileScanStatus.CLEAN },
      });

      this.logger.log(`Background scan verified file '${fileRecordId}' CLEAN`);

      return {
        jobId: job.id || fileRecordId,
        queueName: job.queueName,
        status: 'completed',
        message: 'File verified CLEAN',
        processedAt: new Date().toISOString(),
      };
    } catch (scanErr: unknown) {
      this.logger.error(
        `Malware scanner failed or timed out for '${fileRecordId}': ${(scanErr as Error).message}. Failing closed.`,
      );
      throw scanErr; // Retried by BullMQ with bounded attempts & backoff
    }
  }

  /**
   * Processes a background cleanup job for abandoned uploads.
   * Atomic and race-safe against concurrent confirmations or deletions.
   */
  private async processAbandonedCleanup(job: Job): Promise<QueueJobResult> {
    const parseResult = CleanupAbandonedJobPayloadSchema.safeParse(job.data);
    if (!parseResult.success) {
      throw new Error(`Invalid cleanup job payload: ${parseResult.error.message}`);
    }

    const { maxAgeHours } = parseResult.data;
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    const abandonedRecords = await this.prisma.fileRecord.findMany({
      where: {
        scanStatus: FileScanStatus.PENDING,
        createdAt: { lt: cutoffDate },
      },
    });

    let deletedCount = 0;
    for (const record of abandonedRecords) {
      const deleteResult = await this.prisma.fileRecord.deleteMany({
        where: {
          id: record.id,
          scanStatus: FileScanStatus.PENDING,
          createdAt: { lt: cutoffDate },
        },
      });

      if (deleteResult.count > 0) {
        try {
          await this.storage.deleteFile(record.storageKey);
        } catch (err: unknown) {
          this.logger.debug(
            `Cleanup: Storage object '${record.storageKey}' already absent: ${(err as Error).message}`,
          );
        }
        deletedCount++;
      }
    }

    this.logger.log(
      `Background cleanup completed: Deleted ${deletedCount} abandoned upload records`,
    );

    return {
      jobId: job.id || 'cleanup',
      queueName: job.queueName,
      status: 'completed',
      message: `Deleted ${deletedCount} abandoned upload records older than ${maxAgeHours} hours`,
      processedAt: new Date().toISOString(),
    };
  }
}
