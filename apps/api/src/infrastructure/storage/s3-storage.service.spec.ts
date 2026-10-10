import { ConfigService } from '@nestjs/config';
import { S3StorageService } from './s3-storage.service';

const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn().mockImplementation((args) => args),
    GetObjectCommand: jest.fn().mockImplementation((args) => args),
    DeleteObjectCommand: jest.fn().mockImplementation((args) => args),
    HeadObjectCommand: jest.fn().mockImplementation((args) => args),
    HeadBucketCommand: jest.fn().mockImplementation((args) => args),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest
    .fn()
    .mockImplementation((_client, command, options) =>
      Promise.resolve(
        `http://localhost:9000/merqent-secure-documents/${command.Key}?expires=${options.expiresIn}`,
      ),
    ),
}));

describe('S3StorageService (Task 2.14)', () => {
  let storageService: S3StorageService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const configMap: Record<string, unknown> = {
          'storage.endpoint': 'http://localhost:9000',
          'storage.region': 'us-east-1',
          'storage.bucket': 'merqent-secure-documents',
          'storage.accessKeyId': 'minioadmin',
          'storage.secretAccessKey': 'minioadmin',
          'storage.signedUrlExpirySeconds': 900,
        };
        return configMap[key] ?? defaultValue;
      }),
    };

    storageService = new S3StorageService(mockConfigService as ConfigService);
  });

  describe('getPresignedUploadUrl', () => {
    it('should generate a valid presigned upload URL with server-controlled key', async () => {
      const result = await storageService.getPresignedUploadUrl({
        filename: 'deal_overview.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1048576,
        storageKey: 'tenants/firm-123/documents/file-456/deal_overview.pdf',
      });

      expect(result.fileKey).toBe('tenants/firm-123/documents/file-456/deal_overview.pdf');
      expect(result.expiresInSeconds).toBe(900);
      expect(result.uploadUrl).toContain('deal_overview.pdf');
      expect(result.uploadUrl).toContain('expires=900');
    });
  });

  describe('getPresignedDownloadUrl', () => {
    it('should generate a short-lived presigned download URL', async () => {
      const url = await storageService.getPresignedDownloadUrl(
        'tenants/firm-123/documents/file-456/deal_overview.pdf',
        600,
      );

      expect(url).toContain('deal_overview.pdf');
      expect(url).toContain('expires=600');
    });
  });

  describe('headObject', () => {
    it('should return metadata when object exists in storage', async () => {
      mockSend.mockResolvedValueOnce({
        ContentLength: 2048,
        ContentType: 'application/pdf',
        ETag: '"etag-123"',
        LastModified: new Date('2026-10-10T12:00:00Z'),
      });

      const meta = await storageService.headObject('tenants/firm-123/file.pdf');

      expect(meta).toBeDefined();
      expect(meta?.contentLength).toBe(2048);
      expect(meta?.contentType).toBe('application/pdf');
      expect(meta?.etag).toBe('"etag-123"');
    });

    it('should return null when object is not found (404)', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as { name: string }).name = 'NotFound';
      mockSend.mockRejectedValueOnce(notFoundError);

      const meta = await storageService.headObject('tenants/firm-123/missing.pdf');
      expect(meta).toBeNull();
    });
  });

  describe('deleteFile', () => {
    it('should issue DeleteObjectCommand to storage client', async () => {
      mockSend.mockResolvedValueOnce({});

      await expect(storageService.deleteFile('tenants/firm-123/file.pdf')).resolves.not.toThrow();

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkHealth', () => {
    it('should return connected status and latency when HeadBucket succeeds', async () => {
      mockSend.mockResolvedValueOnce({});

      const health = await storageService.checkHealth();

      expect(health.status).toBe('connected');
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return disconnected status and latency when HeadBucket fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('MinIO connection refused'));

      const health = await storageService.checkHealth();

      expect(health.status).toBe('disconnected');
      expect(health.error).toBe('MinIO connection refused');
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
