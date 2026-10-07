export interface PresignUploadRequest {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  folder: string;
}

export interface PresignUploadResponse {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

export const STORAGE_SERVICE_TOKEN = 'IStorageService';

export interface IStorageService {
  getPresignedUploadUrl(request: PresignUploadRequest): Promise<PresignUploadResponse>;
  getPresignedDownloadUrl(fileKey: string, expiresInSeconds?: number): Promise<string>;
  deleteFile(fileKey: string): Promise<void>;
}
