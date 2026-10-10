import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { StorageObjectMetadata } from '@merqent/shared-types';
import {
  IStorageService,
  PresignUploadRequest,
  PresignUploadResponse,
  StorageHealthStatus,
} from './storage.interface';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly defaultExpirySeconds: number;

  constructor(private readonly configService: ConfigService) {
    const endpoint =
      this.configService.get<string>('storage.endpoint') ||
      process.env.STORAGE_ENDPOINT ||
      'http://localhost:9000';
    const region =
      this.configService.get<string>('storage.region') || process.env.STORAGE_REGION || 'us-east-1';
    const accessKeyId =
      this.configService.get<string>('storage.accessKeyId') ||
      process.env.STORAGE_ACCESS_KEY_ID ||
      'minioadmin';
    const secretAccessKey =
      this.configService.get<string>('storage.secretAccessKey') ||
      process.env.STORAGE_SECRET_ACCESS_KEY ||
      'minioadmin';

    this.bucket =
      this.configService.get<string>('storage.bucket') ||
      process.env.STORAGE_BUCKET_NAME ||
      'merqent-secure-documents';

    this.defaultExpirySeconds =
      this.configService.get<number>('storage.signedUrlExpirySeconds') ||
      Number(process.env.STORAGE_SIGNED_URL_EXPIRY_SECONDS) ||
      900;

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO & local S3-compatible endpoints
    });

    this.logger.log(
      `S3StorageService initialized: bucket='${this.bucket}', endpoint='${endpoint}', region='${region}'`,
    );
  }

  /**
   * Generates a short-lived presigned PUT URL for direct client-to-storage upload.
   * Credentials and bucket authorization remain strictly on the server.
   *
   * SECURITY & SIZE ENFORCEMENT NOTE:
   * Binds ContentLength to the PutObjectCommand signature. Note that S3-compatible storage
   * presigned PUT endpoints cannot reject an oversized HTTP stream at the storage boundary
   * prior to receiving bytes unless the client includes the signed Content-Length header.
   * To prevent denial-of-service and storage abuse, MerQent enforces a dual-control constraint:
   * 1. Pre-upload: Server validates declared size <= 25MB before issuing presigned URLs.
   * 2. Post-upload: Server executes HeadObjectCommand during confirmUpload, immediately
   *    deleting and discarding any object exceeding 25MB before confirmation.
   */
  async getPresignedUploadUrl(request: PresignUploadRequest): Promise<PresignUploadResponse> {
    const fileKey =
      request.storageKey || `${request.folder || 'documents'}/${Date.now()}-${request.filename}`;
    const expiresInSeconds = this.defaultExpirySeconds;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: request.mimeType,
      ContentLength: request.sizeBytes,
    });

    try {
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return {
        uploadUrl,
        fileKey,
        expiresInSeconds,
      };
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Failed to generate presigned upload URL for key '${fileKey}': ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generates a short-lived presigned GET URL for authenticated download access.
   */
  async getPresignedDownloadUrl(
    fileKey: string,
    expiresInSeconds = this.defaultExpirySeconds,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    try {
      const downloadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return downloadUrl;
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Failed to generate presigned download URL for key '${fileKey}': ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Queries object metadata in S3 without retrieving object payload.
   * Returns null if the object does not exist.
   */
  async headObject(fileKey: string): Promise<StorageObjectMetadata | null> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    try {
      const response = await this.s3Client.send(command);
      return {
        contentLength: response.ContentLength ?? 0,
        contentType: response.ContentType,
        etag: response.ETag,
        lastModified: response.LastModified,
      };
    } catch (err: unknown) {
      const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (
        error.name === 'NotFound' ||
        error.name === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return null;
      }
      this.logger.warn(`HeadObject query error for key '${fileKey}': ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Deletes an object from the S3 bucket.
   */
  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });

    try {
      await this.s3Client.send(command);
      this.logger.debug(`Deleted storage object '${fileKey}' from bucket '${this.bucket}'`);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Failed to delete object '${fileKey}': ${error.message}`);
      throw error;
    }
  }

  /**
   * Direct server-side object upload (for test fixtures / internal ingestion).
   */
  async uploadObject(fileKey: string, body: Buffer | Uint8Array, mimeType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      Body: body,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);
  }

  /**
   * Evaluates storage availability and connectivity via a lightweight HeadBucket probe.
   * Reports exact connection status and latency without leaking credentials.
   */
  async checkHealth(): Promise<StorageHealthStatus> {
    const startTime = Date.now();
    try {
      const command = new HeadBucketCommand({ Bucket: this.bucket });
      await this.s3Client.send(command);
      const latencyMs = Date.now() - startTime;

      return {
        status: 'connected',
        latencyMs,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const error = err as Error;
      return {
        status: 'disconnected',
        latencyMs,
        error: error.message,
      };
    }
  }
}
