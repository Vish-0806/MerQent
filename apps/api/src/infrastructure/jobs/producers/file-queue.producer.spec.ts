import { Test, TestingModule } from '@nestjs/testing';
import { Queue, Job } from 'bullmq';
import {
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MalwareScanJobPayload } from '@merqent/shared-types';
import { FileQueueProducer } from './file-queue.producer';
import {
  JOB_MALWARE_SCAN,
  JOB_CLEANUP_ABANDONED,
  DEFAULT_JOB_ATTEMPTS,
  DEFAULT_JOB_BACKOFF_DELAY_MS,
} from '../jobs.constants';

describe('FileQueueProducer', () => {
  let producer: FileQueueProducer;
  let mockQueue: jest.Mocked<Partial<Queue>>;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' } as unknown as Job),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FileQueueProducer],
    }).compile();

    producer = module.get<FileQueueProducer>(FileQueueProducer);
    producer.setQueue(mockQueue as unknown as Queue);
  });

  describe('enqueueMalwareScan', () => {
    it('successfully enqueues a valid malware scan job with deterministic ID and retry policy', async () => {
      const payload = {
        fileRecordId: 'c1234567-89ab-cdef-0123-456789abcdef',
        storageKey: 'tenants/tenant-1/uploads/test.pdf',
        requestedByUserId: 'a1234567-89ab-cdef-0123-456789abcdef',
        tenantId: 'tenant-1',
      };

      const result = await producer.enqueueMalwareScan(payload);

      expect(result).toEqual({
        jobId: 'job-123',
        status: 'enqueued',
      });
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        JOB_MALWARE_SCAN,
        payload,
        expect.objectContaining({
          jobId: `malware-scan:${payload.fileRecordId}`,
          attempts: DEFAULT_JOB_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: DEFAULT_JOB_BACKOFF_DELAY_MS,
          },
          removeOnComplete: expect.any(Object),
          removeOnFail: expect.any(Object),
        }),
      );
    });

    it('rejects invalid payload with JOB_PAYLOAD_INVALID error code', async () => {
      const invalidPayload = {
        fileRecordId: 'not-a-uuid',
        storageKey: '', // Empty storage key
      };

      await expect(
        producer.enqueueMalwareScan(invalidPayload as unknown as MalwareScanJobPayload),
      ).rejects.toThrow(BadRequestException);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException if queue is not initialized', async () => {
      producer.setQueue(null);

      await expect(
        producer.enqueueMalwareScan({
          fileRecordId: 'c1234567-89ab-cdef-0123-456789abcdef',
          storageKey: 'tenants/tenant-1/uploads/test.pdf',
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('throws InternalServerErrorException when queue.add fails', async () => {
      (mockQueue.add as jest.Mock).mockRejectedValueOnce(new Error('Redis connection refused'));

      await expect(
        producer.enqueueMalwareScan({
          fileRecordId: 'c1234567-89ab-cdef-0123-456789abcdef',
          storageKey: 'tenants/tenant-1/uploads/test.pdf',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('enqueueCleanupAbandoned', () => {
    it('successfully enqueues an abandoned upload cleanup job', async () => {
      const payload = {
        maxAgeHours: 48,
        triggeredBy: 'cron-scheduler',
      };

      const result = await producer.enqueueCleanupAbandoned(payload);

      expect(result).toEqual({
        jobId: 'job-123',
        status: 'enqueued',
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        JOB_CLEANUP_ABANDONED,
        payload,
        expect.objectContaining({
          attempts: DEFAULT_JOB_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: DEFAULT_JOB_BACKOFF_DELAY_MS,
          },
        }),
      );
    });

    it('rejects invalid maxAgeHours (negative number)', async () => {
      await expect(
        producer.enqueueCleanupAbandoned({
          maxAgeHours: -5,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});
