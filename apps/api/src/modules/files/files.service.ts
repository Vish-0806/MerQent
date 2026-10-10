import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AppLogger } from '../../infrastructure/observability/logger.service';
import { RequestContextService } from '../../common/context/request-context.service';
import {
  STORAGE_SERVICE_TOKEN,
  IStorageService,
} from '../../infrastructure/storage/storage.interface';
import {
  MALWARE_SCANNER_TOKEN,
  IMalwareScanner,
  MalwareScanResult,
} from '../../infrastructure/storage/malware/malware-scanner.interface';
import { FileScanStatus, UserContext, UserRole, ErrorCode } from '@merqent/shared-types';
import {
  MAX_FILE_SIZE_BYTES,
  validateMimeAndExtension,
  sanitizeFilename,
  generateStorageKey,
} from './utils/file-security.util';
import { RequestUploadDto } from './dto/request-upload.dto';
import {
  FileRecordDto,
  PresignUploadResponseDto,
  PresignDownloadResponseDto,
} from './dto/file-response.dto';

@Injectable()
export class FilesService {
  private readonly logger: AppLogger;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE_TOKEN)
    private readonly storage: IStorageService,
    @Inject(MALWARE_SCANNER_TOKEN)
    private readonly malwareScanner: IMalwareScanner,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new AppLogger(this.requestContext);
  }

  /**
   * Initiates a secure file upload by validating constraints, generating an isolated
   * server-side storage key, persisting a pending FileRecord, and creating a short-lived presigned URL.
   */
  async requestUpload(user: UserContext, dto: RequestUploadDto): Promise<PresignUploadResponseDto> {
    // 1. Validate MIME type and file extension
    validateMimeAndExtension(dto.originalFileName, dto.mimeType);

    // 2. Validate file size boundary
    if (dto.fileSizeBytes < 1 || dto.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException({
        errorCode: ErrorCode.FILE_TOO_LARGE,
        message: `File size must be between 1 byte and ${MAX_FILE_SIZE_BYTES} bytes (25MB)`,
      });
    }

    const fileRecordId = crypto.randomUUID();
    const cleanFileName = sanitizeFilename(dto.originalFileName);

    // 3. Generate server-controlled, collision-free, tenant-partitioned storage key
    const storageKey = generateStorageKey({
      tenantId: user.firmId,
      userId: user.id,
      folder: dto.folder,
      fileId: fileRecordId,
      filename: cleanFileName,
    });

    // 4. Persist pending file metadata record
    await this.prisma.fileRecord.create({
      data: {
        id: fileRecordId,
        storageKey,
        originalFileName: cleanFileName,
        mimeType: dto.mimeType,
        fileSizeBytes: dto.fileSizeBytes,
        checksumSha256:
          dto.checksumSha256 || '0000000000000000000000000000000000000000000000000000000000000000',
        scanStatus: FileScanStatus.PENDING,
        ownerUserId: user.id,
      },
    });

    // 5. Generate short-lived presigned upload URL from storage service
    const presigned = await this.storage.getPresignedUploadUrl({
      filename: cleanFileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.fileSizeBytes,
      storageKey,
    });

    this.logger.log(
      `Presigned upload URL issued for fileRecord '${fileRecordId}' by user '${user.id}'`,
    );

    return {
      fileRecordId,
      uploadUrl: presigned.uploadUrl,
      storageKey,
      expiresInSeconds: presigned.expiresInSeconds,
    };
  }

  /**
   * Confirms a completed upload by verifying S3 object presence, checking actual object size,
   * evaluating the malware scanning boundary, and marking the record as clean.
   */
  async confirmUpload(
    user: UserContext,
    fileRecordId: string,
    checksumSha256?: string,
  ): Promise<FileRecordDto> {
    const fileRecord = await this.prisma.fileRecord.findUnique({
      where: { id: fileRecordId },
    });

    if (!fileRecord) {
      throw new NotFoundException({
        errorCode: ErrorCode.FILE_NOT_FOUND,
        message: `File record '${fileRecordId}' not found`,
      });
    }

    // Strict ownership verification: only creator or platform admin can confirm upload
    if (fileRecord.ownerUserId !== user.id && user.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException({
        errorCode: ErrorCode.FORBIDDEN,
        message: 'Forbidden: You do not have permission to confirm this upload',
      });
    }

    // Verify S3 object presence and size
    const objectMeta = await this.storage.headObject(fileRecord.storageKey);
    if (!objectMeta) {
      throw new BadRequestException({
        errorCode: ErrorCode.STORAGE_ERROR,
        message:
          'Uploaded file object was not found in storage. Upload may have failed or timed out.',
      });
    }

    // Size boundary enforcement on actual uploaded payload
    if (objectMeta.contentLength > MAX_FILE_SIZE_BYTES) {
      await this.storage.deleteFile(fileRecord.storageKey);
      await this.prisma.fileRecord.delete({ where: { id: fileRecordId } });
      this.logger.warn(
        `Oversized object (${objectMeta.contentLength} bytes > 25MB) discarded and cleaned up for fileRecord '${fileRecordId}'`,
      );
      throw new BadRequestException({
        errorCode: ErrorCode.FILE_TOO_LARGE,
        message: 'Uploaded file exceeds maximum permitted size of 25MB. Object has been discarded.',
      });
    }

    if (objectMeta.contentLength === 0) {
      await this.storage.deleteFile(fileRecord.storageKey);
      await this.prisma.fileRecord.delete({ where: { id: fileRecordId } });
      throw new BadRequestException({
        errorCode: ErrorCode.STORAGE_ERROR,
        message: 'Uploaded file is empty (0 bytes). Object has been discarded.',
      });
    }

    // Execute malware scanning boundary inspection (fails closed)
    let scanResult: MalwareScanResult;
    try {
      if (!this.malwareScanner.isLive) {
        this.logger.warn(
          `Malware scanner daemon is inactive or not configured for file '${fileRecordId}'. Failing closed: file remains PENDING and cannot be cleared as clean.`,
        );
        const updatedPending = await this.prisma.fileRecord.update({
          where: { id: fileRecordId },
          data: {
            scanStatus: FileScanStatus.PENDING,
            fileSizeBytes: objectMeta.contentLength || fileRecord.fileSizeBytes,
            ...(checksumSha256 ? { checksumSha256 } : {}),
          },
        });
        return this.mapToFileRecordDto(updatedPending);
      }

      scanResult = await this.malwareScanner.scan(fileRecord.storageKey);
    } catch (scanErr: unknown) {
      this.logger.error(
        `Malware scanner encountered an error or timeout for '${fileRecordId}': ${(scanErr as Error).message}. Failing closed.`,
      );
      // Fail closed: file remains PENDING and unavailable for download
      const updatedFailed = await this.prisma.fileRecord.update({
        where: { id: fileRecordId },
        data: {
          scanStatus: FileScanStatus.PENDING,
          fileSizeBytes: objectMeta.contentLength || fileRecord.fileSizeBytes,
          ...(checksumSha256 ? { checksumSha256 } : {}),
        },
      });
      return this.mapToFileRecordDto(updatedFailed);
    }

    if (!scanResult.isClean) {
      if (scanResult.status === FileScanStatus.INFECTED) {
        await this.storage.deleteFile(fileRecord.storageKey);
        await this.prisma.fileRecord.update({
          where: { id: fileRecordId },
          data: { scanStatus: FileScanStatus.INFECTED },
        });

        this.logger.error(
          `SECURITY ALERT: Malware detected in file '${fileRecordId}'. Object quarantined and discarded.`,
        );

        throw new ForbiddenException({
          errorCode: ErrorCode.MALWARE_DETECTED,
          message:
            'Security threat detected: File failed malware scanning inspection and was rejected.',
        });
      }

      // Scanner returned non-clean without explicit infection (e.g. unverified, pending): fail closed
      const updatedNonClean = await this.prisma.fileRecord.update({
        where: { id: fileRecordId },
        data: {
          scanStatus: FileScanStatus.PENDING,
          fileSizeBytes: objectMeta.contentLength || fileRecord.fileSizeBytes,
          ...(checksumSha256 ? { checksumSha256 } : {}),
        },
      });
      return this.mapToFileRecordDto(updatedNonClean);
    }

    // Only cleared files with live scanner are marked CLEAN
    const updated = await this.prisma.fileRecord.update({
      where: { id: fileRecordId },
      data: {
        scanStatus: FileScanStatus.CLEAN,
        fileSizeBytes: objectMeta.contentLength || fileRecord.fileSizeBytes,
        ...(checksumSha256 ? { checksumSha256 } : {}),
      },
    });

    this.logger.log(`File upload confirmed and verified clean for '${fileRecordId}'`);

    return this.mapToFileRecordDto(updated);
  }

  /**
   * Generates a short-lived presigned download URL after enforcing tenant isolation,
   * ownership verification, and clearance status.
   */
  async getDownloadUrl(
    user: UserContext,
    fileRecordId: string,
  ): Promise<PresignDownloadResponseDto> {
    const fileRecord = await this.prisma.fileRecord.findUnique({
      where: { id: fileRecordId },
    });

    if (!fileRecord) {
      throw new NotFoundException({
        errorCode: ErrorCode.FILE_NOT_FOUND,
        message: `File record '${fileRecordId}' not found`,
      });
    }

    // Enforce Tenant & Ownership Authorization
    await this.authorizeFileAccess(user, fileRecord);

    // Enforce Quarantine & Clearance: Only CLEAN files can be downloaded
    if (fileRecord.scanStatus === FileScanStatus.INFECTED) {
      throw new ForbiddenException({
        errorCode: ErrorCode.MALWARE_DETECTED,
        message: 'Access prohibited: File is quarantined due to malware infection',
      });
    }

    if (fileRecord.scanStatus !== FileScanStatus.CLEAN) {
      throw new ForbiddenException({
        errorCode: ErrorCode.FILE_ACCESS_DENIED,
        message: `Access prohibited: File is unavailable for download until malware scanning has cleared it (current status: ${fileRecord.scanStatus})`,
      });
    }

    const expiresInSeconds = 900;
    const downloadUrl = await this.storage.getPresignedDownloadUrl(
      fileRecord.storageKey,
      expiresInSeconds,
    );

    this.logger.log(
      `Presigned download URL issued for file '${fileRecordId}' to user '${user.id}'`,
    );

    return {
      downloadUrl,
      expiresInSeconds,
      fileRecord: this.mapToFileRecordDto(fileRecord),
    };
  }

  /**
   * Retrieves verified file metadata without generating a presigned URL.
   */
  async getFileMetadata(user: UserContext, fileRecordId: string): Promise<FileRecordDto> {
    const fileRecord = await this.prisma.fileRecord.findUnique({
      where: { id: fileRecordId },
    });

    if (!fileRecord) {
      throw new NotFoundException({
        errorCode: ErrorCode.FILE_NOT_FOUND,
        message: `File record '${fileRecordId}' not found`,
      });
    }

    await this.authorizeFileAccess(user, fileRecord);
    return this.mapToFileRecordDto(fileRecord);
  }

  /**
   * Deletes a file record and its backing storage object.
   */
  async deleteFile(user: UserContext, fileRecordId: string): Promise<void> {
    const fileRecord = await this.prisma.fileRecord.findUnique({
      where: { id: fileRecordId },
    });

    if (!fileRecord) {
      throw new NotFoundException({
        errorCode: ErrorCode.FILE_NOT_FOUND,
        message: `File record '${fileRecordId}' not found`,
      });
    }

    await this.authorizeFileModification(user, fileRecord);

    // Delete backing object from S3
    await this.storage.deleteFile(fileRecord.storageKey);

    // Delete database metadata
    await this.prisma.fileRecord.delete({
      where: { id: fileRecordId },
    });

    this.logger.log(`File record '${fileRecordId}' deleted by user '${user.id}'`);
  }

  /**
   * Cleans up abandoned pending uploads that were never confirmed within the expiry window.
   * Requires administrative role and provides atomic race-safety against concurrent confirmation or deletion.
   */
  async cleanupAbandonedUploads(
    user: UserContext,
    maxAgeHours = 24,
  ): Promise<{ deletedCount: number }> {
    if (user.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException({
        errorCode: ErrorCode.FORBIDDEN,
        message: 'Forbidden: Only platform administrators can trigger abandoned upload cleanup',
      });
    }

    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    const abandonedRecords = await this.prisma.fileRecord.findMany({
      where: {
        scanStatus: FileScanStatus.PENDING,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    let deletedCount = 0;
    for (const record of abandonedRecords) {
      // Atomic conditional delete: ensure the record is still PENDING and older than cutoffDate.
      // If a concurrent user confirmed the upload (changing status to CLEAN) or deleted it,
      // count will be 0 and we avoid touching storage or deleting valid data.
      const deleteResult = await this.prisma.fileRecord.deleteMany({
        where: {
          id: record.id,
          scanStatus: FileScanStatus.PENDING,
          createdAt: { lt: cutoffDate },
        },
      });

      if (deleteResult.count > 0) {
        try {
          await this.storage.deleteFile(record.storageKey);
        } catch (err: unknown) {
          this.logger.debug(
            `Cleanup: Storage object '${record.storageKey}' already absent during cleanup: ${(err as Error).message}`,
          );
        }
        deletedCount++;
      }
    }

    this.logger.log(
      `Cleanup executed: Deleted ${deletedCount} abandoned upload records older than ${maxAgeHours} hours`,
    );

    return { deletedCount };
  }

  /**
   * Strictly enforces tenant isolation and ownership rules for file access:
   * 1. Platform admin -> full oversight
   * 2. Creator user -> authorized
   * 3. Tenant member -> authorized if file belongs to user's firm
   * 4. Any other user -> strictly rejected with ForbiddenException
   */
  private async authorizeFileAccess(
    user: UserContext,
    fileRecord: { storageKey: string; ownerUserId: string },
  ): Promise<void> {
    // 1. Platform admin oversight
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return;
    }

    // 2. Direct creator ownership
    if (fileRecord.ownerUserId === user.id) {
      return;
    }

    // 3. Organization tenant isolation
    if (user.firmId && fileRecord.storageKey.startsWith(`tenants/${user.firmId}/`)) {
      return;
    }

    // If storage key is tenant-scoped to another tenant, or belongs to another user
    throw new ForbiddenException({
      errorCode: ErrorCode.TENANT_ACCESS_DENIED,
      message:
        'Forbidden: Cross-tenant access prohibited. File belongs to another organization or user.',
    });
  }

  /**
   * Strictly enforces deletion authorization (owner, firm admin of tenant, or platform admin).
   */
  private async authorizeFileModification(
    user: UserContext,
    fileRecord: { storageKey: string; ownerUserId: string },
  ): Promise<void> {
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return;
    }

    if (fileRecord.ownerUserId === user.id) {
      return;
    }

    if (
      user.role === UserRole.PE_FIRM_ADMIN &&
      user.firmId &&
      fileRecord.storageKey.startsWith(`tenants/${user.firmId}/`)
    ) {
      return;
    }

    throw new ForbiddenException({
      errorCode: ErrorCode.FORBIDDEN,
      message: 'Forbidden: You do not have permission to delete this file',
    });
  }

  private mapToFileRecordDto(record: {
    id: string;
    storageKey: string;
    originalFileName: string;
    mimeType: string;
    fileSizeBytes: number;
    checksumSha256: string;
    scanStatus: FileScanStatus | string;
    ownerUserId: string;
    createdAt: Date;
  }): FileRecordDto {
    return {
      id: record.id,
      storageKey: record.storageKey,
      originalFileName: record.originalFileName,
      mimeType: record.mimeType,
      fileSizeBytes: record.fileSizeBytes,
      checksumSha256: record.checksumSha256,
      scanStatus: record.scanStatus as FileScanStatus,
      ownerUserId: record.ownerUserId,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
