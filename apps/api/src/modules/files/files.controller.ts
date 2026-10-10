import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserContext, UserRole } from '@merqent/shared-types';
import { RequestUploadDto } from './dto/request-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import {
  FileRecordDto,
  PresignUploadResponseDto,
  PresignDownloadResponseDto,
} from './dto/file-response.dto';

@ApiTags('Files & Storage')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('presign')
  @ApiOperation({
    summary: 'Request Short-Lived Presigned Upload URL',
    description:
      'Validates MIME type, file size and extension, generates an isolated server-side storage key, and returns a short-lived presigned PUT URL for direct upload.',
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned upload URL created successfully',
    type: PresignUploadResponseDto,
  })
  @ApiResponse({ status: 400, description: 'File size exceeds limit or invalid MIME type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestUpload(
    @CurrentUser() user: UserContext,
    @Body() dto: RequestUploadDto,
  ): Promise<PresignUploadResponseDto> {
    return this.filesService.requestUpload(user, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({
    summary: 'Confirm Upload & Trigger Malware Inspection',
    description:
      'Verifies the object in S3, checks actual object size against constraints, passes the malware scanning boundary, and marks the file clean.',
  })
  @ApiParam({ name: 'id', description: 'File record UUID' })
  @ApiResponse({
    status: 200,
    description: 'Upload confirmed and verified clean',
    type: FileRecordDto,
  })
  @ApiResponse({ status: 400, description: 'File not found in storage or size mismatch' })
  @ApiResponse({ status: 403, description: 'Malware detected or access forbidden' })
  @ApiResponse({ status: 404, description: 'File record not found' })
  async confirmUpload(
    @CurrentUser() user: UserContext,
    @Param('id') fileRecordId: string,
    @Body() dto: ConfirmUploadDto,
  ): Promise<FileRecordDto> {
    return this.filesService.confirmUpload(user, fileRecordId, dto?.checksumSha256);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get File Metadata',
    description: 'Retrieves verified file record metadata with tenant isolation enforcement.',
  })
  @ApiParam({ name: 'id', description: 'File record UUID' })
  @ApiResponse({
    status: 200,
    description: 'File metadata retrieved',
    type: FileRecordDto,
  })
  @ApiResponse({ status: 403, description: 'Cross-tenant access forbidden' })
  @ApiResponse({ status: 404, description: 'File record not found' })
  async getFileMetadata(
    @CurrentUser() user: UserContext,
    @Param('id') fileRecordId: string,
  ): Promise<FileRecordDto> {
    return this.filesService.getFileMetadata(user, fileRecordId);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Request Short-Lived Presigned Download URL',
    description:
      'Enforces tenant and ownership authorization, checks infection status, and generates a temporary presigned GET URL.',
  })
  @ApiParam({ name: 'id', description: 'File record UUID' })
  @ApiResponse({
    status: 200,
    description: 'Presigned download URL generated',
    type: PresignDownloadResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access forbidden or file quarantined' })
  @ApiResponse({ status: 404, description: 'File record not found' })
  async getDownloadUrl(
    @CurrentUser() user: UserContext,
    @Param('id') fileRecordId: string,
  ): Promise<PresignDownloadResponseDto> {
    return this.filesService.getDownloadUrl(user, fileRecordId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete File Record & Storage Object',
    description: 'Deletes object from S3 storage and removes metadata from database.',
  })
  @ApiParam({ name: 'id', description: 'File record UUID' })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions to delete file' })
  @ApiResponse({ status: 404, description: 'File record not found' })
  async deleteFile(
    @CurrentUser() user: UserContext,
    @Param('id') fileRecordId: string,
  ): Promise<void> {
    await this.filesService.deleteFile(user, fileRecordId);
  }

  @Post('cleanup')
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({
    summary: 'Cleanup Abandoned Uploads (Admin Only)',
    description:
      'Purges unconfirmed pending uploads older than specified hours without affecting verified tenant data.',
  })
  @ApiQuery({
    name: 'maxAgeHours',
    required: false,
    description: 'Threshold in hours (default 24)',
    example: 24,
  })
  @ApiResponse({ status: 200, description: 'Cleanup executed' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  async cleanupAbandoned(
    @CurrentUser() user: UserContext,
    @Query('maxAgeHours') maxAgeHours?: number,
  ): Promise<{ deletedCount: number }> {
    return this.filesService.cleanupAbandonedUploads(user, maxAgeHours ? Number(maxAgeHours) : 24);
  }
}
