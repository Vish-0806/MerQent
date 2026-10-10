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
    };
    firmMember: {
      findUnique: jest.Mock;
    };
  };
  let mockStorage: Partial<IStorageService>;
  let mockMalwareScanner: Partial<IMalwareScanner>;
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
      isLive: false,
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
      mockMalwareScanner as IMalwareScanner,
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

    it('should reject oversized uploads exceeding 25MB boundary', async () => {
      await expect(
        filesService.requestUpload(mockUser, {
          originalFileName: 'huge_archive.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 30 * 1024 * 1024, // 30MB
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

    it('should successfully confirm upload when S3 object exists and malware scan is clean', async () => {
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

    it('should allow file owner to obtain presigned download URL', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(apolloFileRecord);

      const result = await filesService.getDownloadUrl(mockUser, 'file-apollo-1');

      expect(result.downloadUrl).toBeDefined();
      expect(result.expiresInSeconds).toBe(900);
      expect(mockStorage.getPresignedDownloadUrl).toHaveBeenCalledWith(
        apolloFileRecord.storageKey,
        900,
      );
    });

    it('should allow member of the same firm tenant to obtain download URL', async () => {
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

    it('should allow platform admin cross-tenant oversight', async () => {
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(apolloFileRecord);

      const result = await filesService.getDownloadUrl(adminUser, 'file-apollo-1');
      expect(result.downloadUrl).toBeDefined();
    });

    it('should reject download request if file is quarantined as infected', async () => {
      const infectedFile = {
        ...apolloFileRecord,
        scanStatus: FileScanStatus.INFECTED,
      };
      mockPrisma.fileRecord.findUnique.mockResolvedValueOnce(infectedFile);

      await expect(filesService.getDownloadUrl(mockUser, 'file-apollo-1')).rejects.toThrow(
        ForbiddenException,
      );
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
    it('should delete expired unconfirmed pending records without touching other data', async () => {
      const abandonedList = [
        {
          id: 'abandoned-1',
          storageKey: 'tenants/firm-apollo-1/documents/abandoned-1/draft.pdf',
          scanStatus: FileScanStatus.PENDING,
        },
      ];

      mockPrisma.fileRecord.findMany.mockResolvedValueOnce(abandonedList);

      const result = await filesService.cleanupAbandonedUploads(24);

      expect(result.deletedCount).toBe(1);
      expect(mockStorage.deleteFile).toHaveBeenCalledWith(abandonedList[0]!.storageKey);
      expect(mockPrisma.fileRecord.delete).toHaveBeenCalledWith({ where: { id: 'abandoned-1' } });
    });
  });
});
