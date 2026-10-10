import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { FileQueueProcessor } from './file-queue.processor';
import { PrismaService } from '../../database/prisma.service';
import { STORAGE_SERVICE_TOKEN, IStorageService } from '../../storage/storage.interface';
import { MALWARE_SCANNER_TOKEN } from '../../storage/malware/malware-scanner.interface';
import { JOB_MALWARE_SCAN, JOB_CLEANUP_ABANDONED, FILE_PROCESSING_QUEUE } from '../jobs.constants';
import { FileScanStatus } from '@merqent/shared-types';

describe('FileQueueProcessor', () => {
  let processor: FileQueueProcessor;
  let mockPrisma: {
    fileRecord: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let mockStorage: jest.Mocked<Partial<IStorageService>>;
  let mockScanner: { isLive: boolean; scan: jest.Mock };

  beforeEach(async () => {
    mockPrisma = {
      fileRecord: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    mockStorage = {
      headObject: jest.fn().mockResolvedValue({
        key: 'tenants/tenant-1/uploads/test.pdf',
        sizeBytes: 1024,
        lastModified: new Date(),
        contentType: 'application/pdf',
      }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    mockScanner = {
      isLive: true,
      scan: jest.fn().mockResolvedValue({
        status: FileScanStatus.CLEAN,
        isClean: true,
        scannerName: 'test-scanner-v1',
        scannedAt: new Date(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileQueueProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: STORAGE_SERVICE_TOKEN, useValue: mockStorage },
        { provide: MALWARE_SCANNER_TOKEN, useValue: mockScanner },
      ],
    }).compile();

    processor = module.get<FileQueueProcessor>(FileQueueProcessor);
  });

  const createMockJob = (name: string, data: unknown, id = 'job-456'): Job =>
    ({
      id,
      name,
      data,
      queueName: FILE_PROCESSING_QUEUE,
    }) as unknown as Job;

  describe('process - malware-scan', () => {
    const validPayload = {
      fileRecordId: 'c1234567-89ab-cdef-0123-456789abcdef',
      storageKey: 'tenants/tenant-1/uploads/test.pdf',
      requestedByUserId: 'a1234567-89ab-cdef-0123-456789abcdef',
      tenantId: 'tenant-1',
    };

    it('rejects invalid payload by throwing validation error', async () => {
      const job = createMockJob(JOB_MALWARE_SCAN, { fileRecordId: 'bad' });

      await expect(processor.process(job)).rejects.toThrow('Invalid job payload');
      expect(mockPrisma.fileRecord.findUnique).not.toHaveBeenCalled();
    });

    it('returns skipped if file record does not exist in DB', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValue(null);
      const job = createMockJob(JOB_MALWARE_SCAN, validPayload);

      const result = await processor.process(job);

      expect(result.status).toBe('skipped');
      expect(result.message).toContain('not found');
    });

    it('throws error on security violation if storageKey does not match DB ground truth', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValue({
        id: validPayload.fileRecordId,
        storageKey: 'tenants/tenant-different/uploads/other.pdf',
        scanStatus: FileScanStatus.PENDING,
      });

      const job = createMockJob(JOB_MALWARE_SCAN, validPayload);

      await expect(processor.process(job)).rejects.toThrow('Tenant storage key mismatch');
      expect(mockStorage.headObject).not.toHaveBeenCalled();
    });

    it('throws error on security violation if tenantId does not match DB ground truth', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValue({
        id: validPayload.fileRecordId,
        storageKey: validPayload.storageKey,
        scanStatus: FileScanStatus.PENDING,
      });

      const job = createMockJob(JOB_MALWARE_SCAN, {
        ...validPayload,
        tenantId: 'tenant-attacker',
      });

      await expect(processor.process(job)).rejects.toThrow('Tenant ownership mismatch');
    });

    it('is idempotent: skips scanning if file already has CLEAN status', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValue({
        id: validPayload.fileRecordId,
        storageKey: validPayload.storageKey,
        scanStatus: FileScanStatus.CLEAN,
      });

      const job = createMockJob(JOB_MALWARE_SCAN, validPayload);
      const result = await processor.process(job);

      expect(result.status).toBe('completed');
      expect(result.message).toContain('already CLEAN');
      expect(mockScanner.scan).not.toHaveBeenCalled();
    });

    it('is idempotent: skips scanning if file already has INFECTED status', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValue({
        id: validPayload.fileRecordId,
        storageKey: validPayload.storageKey,
        scanStatus: FileScanStatus.INFECTED,
      });

      const job = createMockJob(JOB_MALWARE_SCAN, validPayload);
      const result = await processor.process(job);

      expect(result.status).toBe('completed');
      expect(result.message).toContain('already INFECTED');
      expect(mockScanner.scan).not.toHaveBeenCalled();
    });

    it('returns failed if storage object is missing from S3', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValue({
        id: validPayload.fileRecordId,
        storageKey: validPayload.storageKey,
        scanStatus: FileScanStatus.PENDING,
      });
      (mockStorage.headObject as jest.Mock).mockResolvedValueOnce(null);

      const job = createMockJob(JOB_MALWARE_SCAN, validPayload);
      const result = await processor.process(job);

      expect(result.status).toBe('failed');
      expect(result.message).toContain('Storage object missing');
    });

    it('fails closed when malware scanner is not live (does not mark CLEAN)', async () => {
      mockScanner.isLive = false;
      mockPrisma.fileRecord.findUnique.mockResolvedValue({
        id: validPayload.fileRecordId,
        storageKey: validPayload.storageKey,
        scanStatus: FileScanStatus.PENDING,
      });

      const job = createMockJob(JOB_MALWARE_SCAN, validPayload);
      const result = await processor.process(job);

      expect(result.status).toBe('completed');
      expect(result.message).toContain('Scanner inactive; file remains PENDING');
      // Ensure file record was NOT updated to CLEAN
      expect(mockPrisma.fileRecord.update).not.toHaveBeenCalled();
    });

    it('successfully updates file to CLEAN when active scanner clears file', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValue({
        id: validPayload.fileRecordId,
        storageKey: validPayload.storageKey,
        scanStatus: FileScanStatus.PENDING,
      });

      const job = createMockJob(JOB_MALWARE_SCAN, validPayload);
      const result = await processor.process(job);

      expect(result.status).toBe('completed');
      expect(result.message).toContain('verified CLEAN');
      expect(mockPrisma.fileRecord.update).toHaveBeenCalledWith({
        where: { id: validPayload.fileRecordId },
        data: { scanStatus: FileScanStatus.CLEAN },
      });
    });

    it('quarantines and deletes storage file when malware is detected', async () => {
      mockScanner.scan.mockResolvedValueOnce({
        status: FileScanStatus.INFECTED,
        isClean: false,
        scannerName: 'test-scanner-v1',
        scannedAt: new Date(),
        threatDetails: 'Win32.Trojan.Generic',
      });

      mockPrisma.fileRecord.findUnique.mockResolvedValue({
        id: validPayload.fileRecordId,
        storageKey: validPayload.storageKey,
        scanStatus: FileScanStatus.PENDING,
      });

      const job = createMockJob(JOB_MALWARE_SCAN, validPayload);
      const result = await processor.process(job);

      expect(result.status).toBe('completed');
      expect(result.message).toContain('Infected object quarantined');
      expect(mockStorage.deleteFile).toHaveBeenCalledWith(validPayload.storageKey);
      expect(mockPrisma.fileRecord.update).toHaveBeenCalledWith({
        where: { id: validPayload.fileRecordId },
        data: { scanStatus: FileScanStatus.INFECTED },
      });
    });

    it('rethrows unexpected error during scan to trigger bounded BullMQ retries', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValue({
        id: validPayload.fileRecordId,
        storageKey: validPayload.storageKey,
        scanStatus: FileScanStatus.PENDING,
      });
      mockScanner.scan.mockRejectedValueOnce(new Error('Scanning daemon socket timeout'));

      const job = createMockJob(JOB_MALWARE_SCAN, validPayload);

      await expect(processor.process(job)).rejects.toThrow('Scanning daemon socket timeout');
      expect(mockPrisma.fileRecord.update).not.toHaveBeenCalled();
    });
  });

  describe('process - cleanup-abandoned', () => {
    it('cleans up abandoned pending uploads older than cutoff', async () => {
      mockPrisma.fileRecord.findMany.mockResolvedValue([
        { id: 'file-1', storageKey: 'tenants/tenant-1/uploads/stale1.bin' },
        { id: 'file-2', storageKey: 'tenants/tenant-1/uploads/stale2.bin' },
      ]);
      mockPrisma.fileRecord.deleteMany.mockResolvedValue({ count: 1 });

      const job = createMockJob(JOB_CLEANUP_ABANDONED, { maxAgeHours: 24 });
      const result = await processor.process(job);

      expect(result.status).toBe('completed');
      expect(result.message).toContain('Deleted 2 abandoned upload records');
      expect(mockStorage.deleteFile).toHaveBeenCalledWith('tenants/tenant-1/uploads/stale1.bin');
      expect(mockStorage.deleteFile).toHaveBeenCalledWith('tenants/tenant-1/uploads/stale2.bin');
      expect(mockPrisma.fileRecord.deleteMany).toHaveBeenCalledTimes(2);
    });

    it('handles zero abandoned uploads cleanly', async () => {
      mockPrisma.fileRecord.findMany.mockResolvedValue([]);

      const job = createMockJob(JOB_CLEANUP_ABANDONED, {});
      const result = await processor.process(job);

      expect(result.status).toBe('completed');
      expect(result.message).toContain('Deleted 0 abandoned upload records');
      expect(mockStorage.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('process - unknown job', () => {
    it('returns skipped for unrecognized job types', async () => {
      const job = createMockJob('unknown-job-type', {});
      const result = await processor.process(job);

      expect(result.status).toBe('skipped');
      expect(result.message).toContain('Unknown job type');
    });
  });
});
