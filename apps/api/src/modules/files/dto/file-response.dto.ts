import { ApiProperty } from '@nestjs/swagger';
import { FileScanStatus } from '@merqent/shared-types';

export class FileRecordDto {
  @ApiProperty({ description: 'Unique file record ID' })
  id!: string;

  @ApiProperty({ description: 'Server-controlled storage key' })
  storageKey!: string;

  @ApiProperty({ description: 'Original file name' })
  originalFileName!: string;

  @ApiProperty({ description: 'MIME type' })
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSizeBytes!: number;

  @ApiProperty({ description: 'SHA-256 checksum' })
  checksumSha256!: string;

  @ApiProperty({ enum: FileScanStatus, description: 'Malware scan status' })
  scanStatus!: FileScanStatus;

  @ApiProperty({ description: 'Owner user ID' })
  ownerUserId!: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: string;
}

export class PresignUploadResponseDto {
  @ApiProperty({ description: 'Created file record ID' })
  fileRecordId!: string;

  @ApiProperty({ description: 'Short-lived presigned upload URL' })
  uploadUrl!: string;

  @ApiProperty({ description: 'Server-controlled storage key' })
  storageKey!: string;

  @ApiProperty({ description: 'Expiry duration in seconds' })
  expiresInSeconds!: number;
}

export class PresignDownloadResponseDto {
  @ApiProperty({ description: 'Short-lived presigned download URL' })
  downloadUrl!: string;

  @ApiProperty({ description: 'Expiry duration in seconds' })
  expiresInSeconds!: number;

  @ApiProperty({ type: FileRecordDto, description: 'File metadata' })
  fileRecord!: FileRecordDto;
}
