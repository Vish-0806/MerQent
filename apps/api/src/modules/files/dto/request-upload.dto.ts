import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_FILE_SIZE_BYTES } from '../utils/file-security.util';

export class RequestUploadDto {
  @ApiProperty({
    description: 'Original name of the file to be uploaded',
    example: 'deal_financial_model.xlsx',
  })
  @IsString()
  @IsNotEmpty()
  originalFileName!: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes (max 25MB)',
    example: 2048576,
  })
  @IsNumber()
  @Min(1)
  @Max(MAX_FILE_SIZE_BYTES)
  fileSizeBytes!: number;

  @ApiPropertyOptional({
    description: 'Expected SHA-256 hex checksum (64 characters)',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  @IsOptional()
  @IsString()
  checksumSha256?: string;

  @ApiPropertyOptional({
    description: 'Storage subfolder category (e.g. diligence, credentials)',
    example: 'diligence',
  })
  @IsOptional()
  @IsString()
  folder?: string;
}
