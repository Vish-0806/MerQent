import { ForbiddenException } from '@nestjs/common';
import { FileScanStatus, UserContext, UserRole } from '@merqent/shared-types';
import { Job } from 'bullmq';
import { FilesService } from '../modules/files/files.service';
import { FileQueueProcessor } from '../infrastructure/jobs/processors/file-queue.processor';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { RequestContextService } from '../common/context/request-context.service';
import {
  createTestFileRecord,
  createMockPrismaService,
  createMockStorageService,
  createMockMalwareScanner,
} from '../test-utils';

describe('Cross-Module Integration: File Storage & Malware Clearance Pipeline', () => {
  const firmId = 'f1234567-89ab-cdef-0123-456789abcdef';
  const userContext: UserContext = {
    id: 'u1234567-89ab-cdef-0123-456789abcdef',
    email: 'operator@merqent.test',
    role: UserRole.PE_FIRM_MEMBER,
    firmId,
  };

  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockStorage: ReturnType<typeof createMockStorageService>;
  let mockScanner: ReturnType<typeof createMockMalwareScanner>;
  let filesService: FilesService;
  let fileQueueProcessor: FileQueueProcessor;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockStorage = createMockStorageService();
    mockScanner = createMockMalwareScanner(true);

    filesService = new FilesService(
      mockPrisma as unknown as PrismaService,
      mockStorage,
      mockScanner,
      {
        getUser: jest.fn().mockReturnValue(userContext),
        getCorrelationId: jest.fn().mockReturnValue('req-corr-int-file-01'),
      } as unknown as RequestContextService,
    );

    fileQueueProcessor = new FileQueueProcessor(
      mockPrisma as unknown as PrismaService,
      mockStorage,
      mockScanner,
    );
  });

  it('Stage 1 -> 2 -> 3: Full Clean Pipeline (Upload -> Confirmation -> Scan -> Download clearance)', async () => {
    const fileId = '11111111-1111-1111-1111-111111111111';
    const storageKey = `tenants/${firmId}/documents/${fileId}/financial_model.xlsx`;

    const fileRecord = {
      ...createTestFileRecord({
        id: fileId,
        firmId,
        uploadedById: userContext.id,
        storageKey,
        scanStatus: FileScanStatus.PENDING,
        fileSizeBytes: 2048,
      }),
      ownerUserId: userContext.id,
    };

    // 1. Initial State: File is in database in PENDING status
    mockPrisma.fileRecord.findUnique.mockResolvedValue(fileRecord);
    mockPrisma.fileRecord.update.mockImplementation((args: { data: Record<string, unknown> }) => ({
      ...fileRecord,
      ...args.data,
    }));

    // S3 contains uploaded object
    if (mockStorage.uploadObject) {
      await mockStorage.uploadObject(
        storageKey,
        Buffer.alloc(2048),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    }

    // 2. Client confirms upload
    const confirmResult = await filesService.confirmUpload(userContext, fileId);

    expect(confirmResult.id).toBe(fileId);

    // 3. Worker executes background malware scan job
    const job = {
      name: 'malware-scan',
      data: {
        fileRecordId: fileId,
        storageKey,
        tenantId: firmId,
      },
    } as unknown as Job;

    const workerResult = await fileQueueProcessor.process(job);

    expect(workerResult.status).toBe('completed');
    expect(mockPrisma.fileRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: fileId },
        data: expect.objectContaining({ scanStatus: FileScanStatus.CLEAN }),
      }),
    );

    // 4. Download authorization: File is now CLEAN, presigned download URL is issued
    mockPrisma.fileRecord.findUnique.mockResolvedValue({
      ...fileRecord,
      scanStatus: FileScanStatus.CLEAN,
    });

    const downloadResponse = await filesService.getDownloadUrl(userContext, fileId);
    expect(downloadResponse.downloadUrl).toContain('https://s3.mock.merqent.test/download/');
    expect(mockStorage.getPresignedDownloadUrl).toHaveBeenCalledWith(storageKey, 900);
  });

  it('Fail-Closed: Infected file is quarantined, deleted from storage, and denied download', async () => {
    const fileId = '22222222-2222-2222-2222-222222222222';
    const storageKey = `tenants/${firmId}/documents/${fileId}/malicious.exe`;

    const fileRecord = {
      ...createTestFileRecord({
        id: fileId,
        firmId,
        uploadedById: userContext.id,
        storageKey,
        scanStatus: FileScanStatus.PENDING,
      }),
      ownerUserId: userContext.id,
    };

    mockPrisma.fileRecord.findUnique.mockResolvedValue(fileRecord);
    if (mockStorage.uploadObject) {
      await mockStorage.uploadObject(
        storageKey,
        Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'),
        'application/x-msdownload',
      );
    }

    // Configure scanner to detect virus
    mockScanner.setInfected(true, 'Win32/TrojanDownloader.Eicar');

    const job = {
      name: 'malware-scan',
      data: {
        fileRecordId: fileId,
        storageKey,
        tenantId: firmId,
      },
    } as unknown as Job;

    const workerResult = await fileQueueProcessor.process(job);

    expect(workerResult.status).toBe('completed');
    expect(mockStorage.deleteFile).toHaveBeenCalledWith(storageKey);
    expect(mockPrisma.fileRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: fileId },
        data: expect.objectContaining({ scanStatus: FileScanStatus.INFECTED }),
      }),
    );

    // Download attempt on INFECTED file must be rejected with ForbiddenException
    mockPrisma.fileRecord.findUnique.mockResolvedValue({
      ...fileRecord,
      scanStatus: FileScanStatus.INFECTED,
    });

    await expect(filesService.getDownloadUrl(userContext, fileId)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('Fail-Closed: Inactive scanner leaves file in PENDING and denies download', async () => {
    const fileId = '33333333-3333-3333-3333-333333333333';
    const storageKey = `tenants/${firmId}/documents/${fileId}/unscanned.pdf`;

    const fileRecord = {
      ...createTestFileRecord({
        id: fileId,
        firmId,
        uploadedById: userContext.id,
        storageKey,
        scanStatus: FileScanStatus.PENDING,
      }),
      ownerUserId: userContext.id,
    };

    mockPrisma.fileRecord.findUnique.mockResolvedValue(fileRecord);
    if (mockStorage.uploadObject) {
      await mockStorage.uploadObject(storageKey, Buffer.alloc(1024), 'application/pdf');
    }
    mockScanner.setLive(false); // Inactive daemon

    const job = {
      name: 'malware-scan',
      data: {
        fileRecordId: fileId,
        storageKey,
        tenantId: firmId,
      },
    } as unknown as Job;

    const workerResult = await fileQueueProcessor.process(job);

    expect(workerResult.status).toBe('completed');
    expect(workerResult.message).toContain('Scanner inactive');
    expect(mockStorage.deleteFile).not.toHaveBeenCalled();

    // Download attempt on unscanned PENDING file must be denied
    await expect(filesService.getDownloadUrl(userContext, fileId)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
