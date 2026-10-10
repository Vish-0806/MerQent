import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { UserContext, UserRole, FileScanStatus } from '@merqent/shared-types';

describe('FilesController (Task 2.14)', () => {
  let controller: FilesController;
  let mockFilesService: Partial<FilesService>;

  const mockUser: UserContext = {
    id: 'user-pe-1',
    email: 'operator@apollocapex.com',
    role: UserRole.PE_FIRM_MEMBER,
    firmId: 'firm-apollo-1',
  };

  beforeEach(() => {
    mockFilesService = {
      requestUpload: jest.fn().mockResolvedValue({
        fileRecordId: 'file-123',
        uploadUrl: 'http://localhost:9000/upload',
        storageKey: 'tenants/firm-apollo-1/documents/file-123/doc.pdf',
        expiresInSeconds: 900,
      }),
      confirmUpload: jest.fn().mockResolvedValue({
        id: 'file-123',
        storageKey: 'tenants/firm-apollo-1/documents/file-123/doc.pdf',
        originalFileName: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        checksumSha256: 'sha256hex',
        scanStatus: FileScanStatus.CLEAN,
        ownerUserId: 'user-pe-1',
        createdAt: new Date().toISOString(),
      }),
      getFileMetadata: jest.fn().mockResolvedValue({
        id: 'file-123',
        storageKey: 'tenants/firm-apollo-1/documents/file-123/doc.pdf',
        originalFileName: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        checksumSha256: 'sha256hex',
        scanStatus: FileScanStatus.CLEAN,
        ownerUserId: 'user-pe-1',
        createdAt: new Date().toISOString(),
      }),
      getDownloadUrl: jest.fn().mockResolvedValue({
        downloadUrl: 'http://localhost:9000/download',
        expiresInSeconds: 900,
        fileRecord: {
          id: 'file-123',
          storageKey: 'tenants/firm-apollo-1/documents/file-123/doc.pdf',
          originalFileName: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 1024,
          checksumSha256: 'sha256hex',
          scanStatus: FileScanStatus.CLEAN,
          ownerUserId: 'user-pe-1',
          createdAt: new Date().toISOString(),
        },
      }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      cleanupAbandonedUploads: jest.fn().mockResolvedValue({ deletedCount: 3 }),
    };

    controller = new FilesController(mockFilesService as FilesService);
  });

  it('should request presigned upload URL', async () => {
    const res = await controller.requestUpload(mockUser, {
      originalFileName: 'doc.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024,
    });

    expect(res.uploadUrl).toBe('http://localhost:9000/upload');
    expect(res.fileRecordId).toBe('file-123');
    expect(mockFilesService.requestUpload).toHaveBeenCalledWith(mockUser, expect.anything());
  });

  it('should confirm file upload', async () => {
    const res = await controller.confirmUpload(mockUser, 'file-123', {
      checksumSha256: 'sha256hex',
    });

    expect(res.id).toBe('file-123');
    expect(res.scanStatus).toBe(FileScanStatus.CLEAN);
    expect(mockFilesService.confirmUpload).toHaveBeenCalledWith(mockUser, 'file-123', 'sha256hex');
  });

  it('should get file metadata', async () => {
    const res = await controller.getFileMetadata(mockUser, 'file-123');
    expect(res.id).toBe('file-123');
    expect(mockFilesService.getFileMetadata).toHaveBeenCalledWith(mockUser, 'file-123');
  });

  it('should get presigned download URL', async () => {
    const res = await controller.getDownloadUrl(mockUser, 'file-123');
    expect(res.downloadUrl).toBe('http://localhost:9000/download');
    expect(mockFilesService.getDownloadUrl).toHaveBeenCalledWith(mockUser, 'file-123');
  });

  it('should delete file', async () => {
    await expect(controller.deleteFile(mockUser, 'file-123')).resolves.not.toThrow();
    expect(mockFilesService.deleteFile).toHaveBeenCalledWith(mockUser, 'file-123');
  });

  it('should cleanup abandoned uploads', async () => {
    const res = await controller.cleanupAbandoned(24);
    expect(res.deletedCount).toBe(3);
    expect(mockFilesService.cleanupAbandonedUploads).toHaveBeenCalledWith(24);
  });
});
