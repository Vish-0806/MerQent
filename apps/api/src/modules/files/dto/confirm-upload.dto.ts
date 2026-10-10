import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmUploadDto {
  @ApiPropertyOptional({
    description: 'Verified SHA-256 hex checksum (64 characters)',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  })
  @IsOptional()
  @IsString()
  checksumSha256?: string;
}
