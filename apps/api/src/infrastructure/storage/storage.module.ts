import { Module } from '@nestjs/common';
import {
  STORAGE_SERVICE_TOKEN,
  IStorageService,
  PresignUploadRequest,
  PresignUploadResponse,
} from './storage.interface';

class SandboxStorageService implements IStorageService {
  async getPresignedUploadUrl(request: PresignUploadRequest): Promise<PresignUploadResponse> {
    const fileKey = `${request.folder}/${Date.now()}-${request.filename}`;
    return {
      uploadUrl: `http://localhost:9000/merqent-dev-documents/${fileKey}?signature=mock_presigned_url`,
      fileKey,
      expiresInSeconds: 900,
    };
  }

  async getPresignedDownloadUrl(fileKey: string, _expiresInSeconds = 900): Promise<string> {
    return `http://localhost:9000/merqent-dev-documents/${fileKey}?signature=mock_download_url`;
  }

  async deleteFile(_fileKey: string): Promise<void> {}
}

@Module({
  providers: [
    {
      provide: STORAGE_SERVICE_TOKEN,
      useClass: SandboxStorageService,
    },
  ],
  exports: [STORAGE_SERVICE_TOKEN],
})
export class StorageModule {}
