import { FileScanStatus } from '@merqent/shared-types';
import type { RequestUploadDto } from '../../modules/files/dto/request-upload.dto';

export interface TestFileRecordEntity {
  id: string;
  firmId: string;
  uploadedById: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageKey: string;
  scanStatus: FileScanStatus;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

let fileCounter = 1;

/**
 * Factory for creating deterministic FileRecord entities.
 */
export function createTestFileRecord(
  overrides: Partial<TestFileRecordEntity> = {},
): TestFileRecordEntity {
  const index = fileCounter++;
  const firmId = overrides.firmId ?? 'f0000000-0000-0000-0000-000000000001';
  const fileId = overrides.id ?? `file0000-0000-0000-0000-${String(index).padStart(12, '0')}`;

  return {
    id: fileId,
    firmId,
    uploadedById: overrides.uploadedById ?? 'u0000000-0000-0000-0000-000000000001',
    fileName: `document-${index}.pdf`,
    fileSizeBytes: 1024 * 1024, // 1 MB
    mimeType: 'application/pdf',
    storageKey: `tenants/${firmId}/documents/${fileId}/document-${index}.pdf`,
    scanStatus: FileScanStatus.PENDING,
    confirmedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Factory for creating valid RequestUploadDto payloads.
 */
export function createTestUploadPayload(
  overrides: Partial<RequestUploadDto> = {},
): RequestUploadDto {
  return {
    originalFileName: 'executive-summary.pdf',
    fileSizeBytes: 2 * 1024 * 1024, // 2 MB
    mimeType: 'application/pdf',
    folder: 'diligence',
    ...overrides,
  };
}
