import { Readable } from 'stream';
import {
  IStorageService,
  PresignUploadRequest,
  PresignUploadResponse,
} from '../../infrastructure/storage/storage.interface';
import { StorageObjectMetadata } from '@merqent/shared-types';

export interface MockStorageService extends IStorageService {
  _objects: Map<string, Buffer>;
  reset: () => void;
}

/**
 * Creates an in-memory, deterministic MockStorageService simulating S3/MinIO operations.
 */
export function createMockStorageService(): MockStorageService {
  const objects = new Map<string, Buffer>();

  const service: MockStorageService = {
    _objects: objects,
    reset: () => {
      objects.clear();
      (service.getPresignedUploadUrl as jest.Mock).mockClear();
      (service.getPresignedDownloadUrl as jest.Mock).mockClear();
      (service.headObject as jest.Mock).mockClear();
      (service.deleteFile as jest.Mock).mockClear();
      if (service.uploadObject) (service.uploadObject as jest.Mock).mockClear();
      if (service.getObjectStream) (service.getObjectStream as jest.Mock).mockClear();
    },
    getPresignedUploadUrl: jest
      .fn()
      .mockImplementation(async (request: PresignUploadRequest): Promise<PresignUploadResponse> => {
        const fileKey = request.storageKey ?? `uploads/${request.filename}`;
        return {
          uploadUrl: `https://s3.mock.merqent.test/upload/${encodeURIComponent(fileKey)}?expires=900`,
          fileKey,
          expiresInSeconds: 900,
        };
      }),
    getPresignedDownloadUrl: jest
      .fn()
      .mockImplementation(async (fileKey: string): Promise<string> => {
        return `https://s3.mock.merqent.test/download/${encodeURIComponent(fileKey)}?expires=300`;
      }),
    headObject: jest
      .fn()
      .mockImplementation(async (fileKey: string): Promise<StorageObjectMetadata | null> => {
        const data = objects.get(fileKey);
        if (!data) return null;
        return {
          contentLength: data.length,
          contentType: 'application/pdf',
          etag: '"mock-etag-hash"',
          lastModified: new Date(),
        };
      }),
    deleteFile: jest.fn().mockImplementation(async (fileKey: string): Promise<void> => {
      objects.delete(fileKey);
    }),
    checkHealth: jest.fn().mockResolvedValue({
      status: 'connected',
      latencyMs: 1,
    }),
    uploadObject: jest
      .fn()
      .mockImplementation(async (fileKey: string, body: Buffer | Uint8Array): Promise<void> => {
        objects.set(fileKey, Buffer.from(body));
      }),
    getObjectStream: jest.fn().mockImplementation(async (fileKey: string): Promise<Readable> => {
      const data = objects.get(fileKey);
      if (!data) {
        throw new Error(`Storage object '${fileKey}' not found in mock storage`);
      }
      return Readable.from(data);
    }),
  };

  return service;
}
