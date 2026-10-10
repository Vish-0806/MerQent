import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FilesService } from './files.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { IStorageService } from '../../infrastructure/storage/storage.interface';
import { IMalwareScanner } from '../../infrastructure/storage/malware/malware-scanner.interface';
import { RequestContextService } from '../../common/context/request-context.service';
import { UserContext, UserRole, FileScanStatus } from '@merqent/shared-types';

describe('FilesService (Task 2.14)', () => {
  let filesService: FilesService;
  let mockPrisma: {
    fileRecord: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    firmMember: {
      findUnique: jest.Mock;
    };
  };
  let mockStorage: Partial<IStorageService>;
  let mockMalwareScanner: { isLive: boolean; scan: jest.Mock };
  let mockRequestContext: Partial<RequestContextService>;

  const mockUser: UserContext = {
    id: 'user-pe-1',
    email: 'operator@apollocapex.com',
    role: UserRole.PE_FIRM_MEMBER,
    firmId: 'firm-apollo-1',
  };

  const otherTenantUser: UserContext = {
    id: 'user-pe-2',
    email: 'partner@blackstone.com',
    role: UserRole.PE_FIRM_MEMBER,
    firmId: 'firm-blackstone-2',
  };

  const consultantUser: UserContext = {
    id: 'consultant-1',
    email: 'expert@pmi-advisors.com',
    role: UserRole.CONSULTANT_OPERATOR,
  };

  const adminUser: UserContext = {
    id: 'admin-1',
    email: 'secops@merqent.com',
    role: UserRole.PLATFORM_ADMIN,
  };

  beforeEach(() => {
    mockPrisma = {
      fileRecord: {
        create: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ ...data, createdAt: new Date() })),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ ...data, createdAt: new Date() })),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      firmMember: {
        findUnique: jest.fn(),
      },
    };

    mockStorage = {
      getPresignedUploadUrl: jest.fn().mockResolvedValue({
        uploadUrl: 'http://localhost:9000/merqent-secure-documents/upload?sig=abc',
        fileKey: 'tenants/firm-apollo-1/diligence/file-1/model.xlsx',
        expiresInSeconds: 900,
      }),
      getPresignedDownloadUrl: jest
        .fn()
        .mockResolvedValue('http://localhost:9000/merqent-secure-documents/download?sig=xyz'),
      headObject: jest.fn().mockResolvedValue({
        contentLength: 1048576,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        etag: '"etag-123"',
      }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    mockMalwareScanner = {
      isLive: true,
      scan: jest.fn().mockResolvedValue({
        isClean: true,
        status: FileScanStatus.CLEAN,
        scannerName: 'boundary-scanner',
        scannedAt: new Date(),
      }),
    };

    mockRequestContext = {
      getCorrelationId: jest.fn().mockReturnValue('req-corr-test'),
      getUser: jest.fn().mockReturnValue(mockUser),
      getTenantId: jest.fn().mockReturnValue(mockUser.firmId),
    };

    filesService = new FilesService(
      mockPrisma as unknown as PrismaService,
      mockStorage as IStorageService,
      mockMalwareScanner as unknown as IMalwareScanner,
      mockRequestContext as RequestContextService,
    );
  });

  describe('requestUpload', () => {
    it('should generate server-controlled storage key and return presigned upload URL', async () => {
      const result = await filesService.requestUpload(mockUser, {
        originalFileName: 'Deal_Financials.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSizeBytes: 2048000,
        folder: 'diligence',
      });

      expect(result).toBeDefined();
      expect(result.fileRecordId).toBeDefined();
      expect(result.storageKey).toContain('tenants/firm-apollo-1/diligence/');
      expect(result.storageKey).toContain('Deal_Financials.xlsx');
      expect(result.uploadUrl).toBeDefined();
      expect(result.expiresInSeconds).toBe(900);
      expect(mockPrisma.fileRecord.create).toHaveBeenCalledTimes(1);
    });

    it('should partition by user for consultants without firmId', async () => {
      const result = await filesService.requestUpload(consultantUser, {
        originalFileName: 'Consultant_Credentials.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 500000,
      });

      expect(result.storageKey).toContain('users/consultant-1/documents/');
      expect(result.storageKey).toContain('Consultant_Credentials.pdf');
    });

    it('should reject unpermitted MIME types (e.g. executables)', async () => {
      await expect(
        filesService.requestUpload(mockUser, {
          originalFileName: 'installer.exe',
          mimeType: 'application/x-msdownload',
          fileSizeBytes: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject mismatched file extension even if MIME is allowed', async () => {
      await expect(
        filesService.requestUpload(mockUser, {
          originalFileName: 'payload.exe',
          mimeType: 'application/pdf',
          fileSizeBytes: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept upload at exactly 25MB boundary (26214400 bytes)', async () => {
      const result = await filesService.requestUpload(mockUser, {
        originalFileName: 'boundary_archive.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 26214400,
      });
      expect(result).toBeDefined();
      expect(result.fileRecordId).toBeDefined();
    });

    it('should reject upload exceeding 25MB boundary by 1 byte (26214401 bytes)', async () => {
      await expect(
        filesService.requestUpload(mockUser, {
          originalFileName: 'huge_archive.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 26214401,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject path traversal in filename', async () => {
      await expect(
        filesService.requestUpload(mockUser, {
          originalFileName: '../../etc/passwd.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmUpload', () => {
    const existingFileRecord = {
      id: 'file-123',
      storageKey: 'tenants/firm-apollo-1/diligence/file-123/model.xlsx',
      originalFileName: 'model.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSizeBytes: 1048576,
      checksumSha256: '0000000000000000000000000000000000000000000000000000000000000000',
      scanStatus: FileScanStatus.PENDING,
      ownerUserId: mockUser.id,
      createdAt: new Date(),
    };

    it('should successfully confirm upload when S3 object exists and live malware scan is clean', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(existingFileRecord);

      const confirmed = await filesService.confirmUpload(mockUser, 'file-123');

      expect(confirmed).toBeDefined();
      expect(mockStorage.headObject).toHaveBeenCalledWith(existingFileRecord.storageKey);
      expect(mockMalwareScanner.scan).toHaveBeenCalledWith(existingFileRecord.storageKey);
      expect(mockPrisma.fileRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'file-123' },
          data: expect.objectContaining({ scanStatus: FileScanStatus.CLEAN }),
        }),
      );
    });

    it('should fail closed and keep file PENDING when scanner is inactive', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(existingFileRecord);
      mockMalwareScanner.isLive = false;

      const result = await filesService.confirmUpload(mockUser, 'file-123');

      expect(result.scanStatus).toBe(FileScanStatus.PENDING);
      expect(mockMalwareScanner.scan).not.toHaveBeenCalled();
      expect(mockPrisma.fileRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'file-123' },
          data: expect.objectContaining({ scanStatus: FileScanStatus.PENDING }),
        }),
      );
    });

    it('should fail closed and keep file PENDING when live scanner throws an error or times out', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(existingFileRecord);
      (mockMalwareScanner.scan as jest.Mock).mockRejectedValueOnce(
        new Error('Scanner daemon connection timed out'),
      );

      const result = await filesService.confirmUpload(mockUser, 'file-123');

      expect(result.scanStatus).toBe(FileScanStatus.PENDING);
      expect(mockPrisma.fileRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'file-123' },
          data: expect.objectContaining({ scanStatus: FileScanStatus.PENDING }),
        }),
      );
    });

    it('should reject confirmation and safely clean up object and DB record if uploaded payload exceeds 25MB', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(existingFileRecord);
      (mockStorage.headObject as jest.Mock).mockResolvedValueOnce({
        contentLength: 26214401, // 25MB + 1 byte
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await expect(filesService.confirmUpload(mockUser, 'file-123')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockStorage.deleteFile).toHaveBeenCalledWith(existingFileRecord.storageKey);
      expect(mockPrisma.fileRecord.delete).toHaveBeenCalledWith({ where: { id: 'file-123' } });
    });

    it('should reject confirmation and safely clean up if uploaded object is empty (0 bytes)', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(existingFileRecord);
      (mockStorage.headObject as jest.Mock).mockResolvedValueOnce({
        contentLength: 0,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await expect(filesService.confirmUpload(mockUser, 'file-123')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockStorage.deleteFile).toHaveBeenCalledWith(existingFileRecord.storageKey);
      expect(mockPrisma.fileRecord.delete).toHaveBeenCalledWith({ where: { id: 'file-123' } });
    });

    it('should reject confirmation by another user who is not owner or platform admin', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(existingFileRecord);

      await expect(filesService.confirmUpload(otherTenantUser, 'file-123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow platform admin to confirm upload on behalf of tenant', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(existingFileRecord);

      await expect(filesService.confirmUpload(adminUser, 'file-123')).resolves.not.toThrow();
    });

    it('should reject confirmation if S3 object is missing', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(existingFileRecord);
      (mockStorage.headObject as jest.Mock).mockResolvedValueOnce(null);

      await expect(filesService.confirmUpload(mockUser, 'file-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete object and mark infected when malware is detected', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(existingFileRecord);
      (mockMalwareScanner.scan as jest.Mock).mockResolvedValueOnce({
        isClean: false,
        status: FileScanStatus.INFECTED,
        scannerName: 'live-clamav-scanner',
        threatDetails: 'Eicar-Test-Signature',
      });

      await expect(filesService.confirmUpload(mockUser, 'file-123')).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockStorage.deleteFile).toHaveBeenCalledWith(existingFileRecord.storageKey);
      expect(mockPrisma.fileRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'file-123' },
          data: { scanStatus: FileScanStatus.INFECTED },
        }),
      );
    });
  });

  describe('getDownloadUrl & Tenant Isolation', () => {
    const apolloFileRecord = {
      id: 'file-apollo-1',
      storageKey: 'tenants/firm-apollo-1/diligence/file-apollo-1/contract.pdf',
      originalFileName: 'contract.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 200000,
      checksumSha256: 'abc123456789',
      scanStatus: FileScanStatus.CLEAN,
      ownerUserId: mockUser.id,
      createdAt: new Date(),
    };

    it('should allow file owner to obtain presigned download URL when scan is CLEAN', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(apolloFileRecord);

      const result = await filesService.getDownloadUrl(mockUser, 'file-apollo-1');

      expect(result.downloadUrl).toBeDefined();
      expect(result.expiresInSeconds).toBe(900);
      expect(mockStorage.getPresignedDownloadUrl).toHaveBeenCalledWith(
        apolloFileRecord.storageKey,
        900,
      );
    });

    it('should deny download request if file scan is still PENDING', async () => {
      const pendingFile = {
        ...apolloFileRecord,
        scanStatus: FileScanStatus.PENDING,
      };
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(pendingFile);

      await expect(filesService.getDownloadUrl(mockUser, 'file-apollo-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject download request if file is quarantined as INFECTED', async () => {
      const infectedFile = {
        ...apolloFileRecord,
        scanStatus: FileScanStatus.INFECTED,
      };
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(infectedFile);

      await expect(filesService.getDownloadUrl(mockUser, 'file-apollo-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow member of the same firm tenant to obtain download URL when CLEAN', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(apolloFileRecord);

      const colleagueUser: UserContext = {
        id: 'user-apollo-colleague',
        email: 'colleague@apollocapex.com',
        role: UserRole.PE_FIRM_MEMBER,
        firmId: 'firm-apollo-1',
      };

      const result = await filesService.getDownloadUrl(colleagueUser, 'file-apollo-1');
      expect(result.downloadUrl).toBeDefined();
    });

    it('should strictly prohibit cross-tenant access to another firm files', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(apolloFileRecord);

      // Blackstone user attempts to access Apollo confidential contract
      await expect(filesService.getDownloadUrl(otherTenantUser, 'file-apollo-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow platform admin cross-tenant oversight for clean files', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(apolloFileRecord);

      const result = await filesService.getDownloadUrl(adminUser, 'file-apollo-1');
      expect(result.downloadUrl).toBeDefined();
    });

    it('should return 404 NotFound when file does not exist', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(null);

      await expect(filesService.getDownloadUrl(mockUser, 'nonexistent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteFile', () => {
    const existingFile = {
      id: 'file-del-1',
      storageKey: 'tenants/firm-apollo-1/documents/file-del-1/notes.docx',
      ownerUserId: mockUser.id,
    };

    it('should delete from storage and database when owner deletes file', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(existingFile);

      await filesService.deleteFile(mockUser, 'file-del-1');

      expect(mockStorage.deleteFile).toHaveBeenCalledWith(existingFile.storageKey);
      expect(mockPrisma.fileRecord.delete).toHaveBeenCalledWith({ where: { id: 'file-del-1' } });
    });

    it('should reject deletion attempt by another tenant user', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(existingFile);

      await expect(filesService.deleteFile(otherTenantUser, 'file-del-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('cleanupAbandonedUploads', () => {
    const abandonedList = [
      {
        id: 'abandoned-1',
        storageKey: 'tenants/firm-apollo-1/documents/abandoned-1/draft.pdf',
        scanStatus: FileScanStatus.PENDING,
      },
    ];

    it('should reject cleanup invocation by non-admin users', async () => {
      await expect(filesService.cleanupAbandonedUploads(mockUser, 24)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow platform admin to delete expired unconfirmed pending records', async () => {
      mockPrisma.fileRecord.findMany.mockResolvedValueOnce(abandonedList);
      mockPrisma.fileRecord.deleteMany.mockResolvedValueOnce({ count: 1 });

      const result = await filesService.cleanupAbandonedUploads(adminUser, 24);

      expect(result.deletedCount).toBe(1);
      expect(mockPrisma.fileRecord.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'abandoned-1',
            scanStatus: FileScanStatus.PENDING,
          }),
        }),
      );
      expect(mockStorage.deleteFile).toHaveBeenCalledWith(abandonedList[0]!.storageKey);
    });

    it('should protect against concurrent confirmation race condition (deleteMany count 0)', async () => {
      mockPrisma.fileRecord.findMany.mockResolvedValueOnce(abandonedList);
      // Simulate concurrent confirmation: scanStatus changed to CLEAN so deleteMany returns count 0
      mockPrisma.fileRecord.deleteMany.mockResolvedValueOnce({ count: 0 });

      const result = await filesService.cleanupAbandonedUploads(adminUser, 24);

      expect(result.deletedCount).toBe(0);
      expect(mockStorage.deleteFile).not.toHaveBeenCalled();
    });

    it('should handle storage delete failures gracefully during cleanup without crashing', async () => {
      mockPrisma.fileRecord.findMany.mockResolvedValueOnce(abandonedList);
      mockPrisma.fileRecord.deleteMany.mockResolvedValueOnce({ count: 1 });
      (mockStorage.deleteFile as jest.Mock).mockRejectedValueOnce(
        new Error('Object not found in S3'),
      );

      const result = await filesService.cleanupAbandonedUploads(adminUser, 24);

      expect(result.deletedCount).toBe(1);
    });
  });
});
