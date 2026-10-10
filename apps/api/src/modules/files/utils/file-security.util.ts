import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '@merqent/shared-types';

/**
 * Strict allowlist of permissible document and image MIME types mapped to extensions.
 * Executable formats (.exe, .sh, .bat, .js, .wasm, etc.) are strictly forbidden.
 */
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  // Document Formats
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
  'text/plain': ['.txt'],

  // Image Formats
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Validates that the client-supplied MIME type is permitted and that the file extension
 * matches the declared MIME type. Rejects mismatched, spoofed, or prohibited types.
 */
export function validateMimeAndExtension(originalFileName: string, mimeType: string): void {
  const normalizedMime = mimeType.trim().toLowerCase();
  const allowedExtensions = ALLOWED_MIME_TYPES[normalizedMime];

  if (!allowedExtensions) {
    throw new BadRequestException({
      errorCode: ErrorCode.INVALID_FILE_TYPE,
      message: `File type '${mimeType}' is not permitted. Allowed types include PDF, DOCX, XLSX, CSV, TXT, PNG, JPEG, WEBP.`,
    });
  }

  const ext = path.extname(originalFileName).toLowerCase();
  if (!ext || !allowedExtensions.includes(ext)) {
    throw new BadRequestException({
      errorCode: ErrorCode.INVALID_FILE_TYPE,
      message: `File extension '${ext}' does not match declared MIME type '${mimeType}'. Expected one of: ${allowedExtensions.join(', ')}`,
    });
  }
}

/**
 * Sanitizes a client-provided filename to prevent path traversal, control character injection,
 * and dangerous filesystem characters.
 */
export function sanitizeFilename(rawFilename: string): string {
  if (!rawFilename || typeof rawFilename !== 'string') {
    throw new BadRequestException({
      errorCode: ErrorCode.BAD_REQUEST,
      message: 'Filename must be a non-empty string',
    });
  }

  // Reject path traversal sequences explicitly
  if (
    rawFilename.includes('..') ||
    rawFilename.includes('/') ||
    rawFilename.includes('\\') ||
    rawFilename.includes('\0') ||
    rawFilename.includes('%00')
  ) {
    throw new BadRequestException({
      errorCode: ErrorCode.BAD_REQUEST,
      message: 'Filename contains forbidden path traversal or null-byte characters',
    });
  }

  const baseName = path.basename(rawFilename).trim();
  const ext = path.extname(baseName);
  const nameWithoutExt = path.basename(baseName, ext);

  // Strip non-alphanumeric characters from the base name, keeping dashes and underscores
  const cleanName = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100);

  const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();

  return `${cleanName || 'file'}${cleanExt}`;
}

/**
 * Generates an isolated, server-controlled object storage key.
 *
 * Pattern:
 *   - Organization-scoped: `tenants/{tenantId}/{folder}/{fileId}/{sanitizedFilename}`
 *   - User-scoped (consultants/operators): `users/{userId}/{folder}/{fileId}/{sanitizedFilename}`
 *
 * Ensures:
 *   1. Clients cannot choose arbitrary storage keys.
 *   2. Storage paths are strictly partitioned by tenant or individual account.
 *   3. UUID prefix prevents object collision and key enumeration.
 */
export function generateStorageKey(params: {
  tenantId?: string;
  userId: string;
  folder?: string;
  fileId: string;
  filename: string;
}): string {
  const cleanFolder = params.folder
    ? params.folder.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || 'documents'
    : 'documents';

  const sanitizedBase = sanitizeFilename(params.filename);

  if (params.tenantId) {
    return `tenants/${params.tenantId}/${cleanFolder}/${params.fileId}/${sanitizedBase}`;
  }

  return `users/${params.userId}/${cleanFolder}/${params.fileId}/${sanitizedBase}`;
}
