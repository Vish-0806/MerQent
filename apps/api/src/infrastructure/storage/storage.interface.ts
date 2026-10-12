import { Readable } from 'stream';
import { StorageObjectMetadata } from '@merqent/shared-types';

export interface PresignUploadRequest {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  folder?: string;
  storageKey?: string;
}

export interface PresignUploadResponse {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

export const STORAGE_SERVICE_TOKEN = 'IStorageService';

export interface StorageHealthStatus {
  status: 'connected' | 'disconnected';
  latencyMs?: number;
  error?: string;
}

export interface IStorageService {
  getPresignedUploadUrl(request: PresignUploadRequest): Promise<PresignUploadResponse>;
  getPresignedDownloadUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;
  headObject(fileKey: string): Promise<StorageObjectMetadata | null>;
  deleteFile(fileKey: string): Promise<void>;
  checkHealth?(): Promise<StorageHealthStatus>;
  uploadObject?(fileKey: string, body: Buffer | Uint8Array, mimeType: string): Promise<void>;
  getObjectStream?(fileKey: string): Promise<Readable>;
}
