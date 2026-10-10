import {
  validateMimeAndExtension,
  sanitizeFilename,
  generateStorageKey,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from './file-security.util';
import { BadRequestException } from '@nestjs/common';

describe('FileSecurityUtil (Task 2.14)', () => {
  describe('validateMimeAndExtension', () => {
    it('should accept valid PDF files with .pdf extension', () => {
      expect(() =>
        validateMimeAndExtension('financial_model.pdf', 'application/pdf'),
      ).not.toThrow();
    });

    it('should accept valid Word document with .docx extension', () => {
      expect(() =>
        validateMimeAndExtension(
          'pmi_charter.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ).not.toThrow();
    });

    it('should accept valid Excel spreadsheet with .xlsx extension', () => {
      expect(() =>
        validateMimeAndExtension(
          'synergy_tracking.xlsx',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      ).not.toThrow();
    });

    it('should accept valid image files (png, jpeg, webp)', () => {
      expect(() => validateMimeAndExtension('profile.png', 'image/png')).not.toThrow();
      expect(() => validateMimeAndExtension('diagram.jpg', 'image/jpeg')).not.toThrow();
      expect(() => validateMimeAndExtension('chart.webp', 'image/webp')).not.toThrow();
    });

    it('should reject unpermitted MIME types (e.g. executables, html, scripts)', () => {
      expect(() => validateMimeAndExtension('script.js', 'application/javascript')).toThrow(
        BadRequestException,
      );
      expect(() => validateMimeAndExtension('payload.exe', 'application/x-msdownload')).toThrow(
        BadRequestException,
      );
      expect(() => validateMimeAndExtension('phishing.html', 'text/html')).toThrow(
        BadRequestException,
      );
    });

    it('should reject mismatched file extension even if MIME is allowed', () => {
      // Trying to upload .exe pretending to be a PDF
      expect(() => validateMimeAndExtension('exploit.exe', 'application/pdf')).toThrow(
        BadRequestException,
      );
      // Trying to upload .sh disguised as a PNG
      expect(() => validateMimeAndExtension('run.sh', 'image/png')).toThrow(BadRequestException);
    });

    it('should reject files without an extension', () => {
      expect(() => validateMimeAndExtension('noextensionfile', 'application/pdf')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('sanitizeFilename', () => {
    it('should clean and preserve safe alphanumeric filenames', () => {
      const sanitized = sanitizeFilename('Quarterly_Report-2026.pdf');
      expect(sanitized).toBe('Quarterly_Report-2026.pdf');
    });

    it('should replace special characters and whitespace with underscores', () => {
      const sanitized = sanitizeFilename('Deal Model (v2) [Final]!.xlsx');
      expect(sanitized).toBe('Deal_Model_v2_Final_.xlsx');
    });

    it('should reject path traversal sequences (../ and ..\\)', () => {
      expect(() => sanitizeFilename('../../etc/passwd.pdf')).toThrow(BadRequestException);
      expect(() => sanitizeFilename('..\\..\\windows\\system32\\cmd.pdf')).toThrow(
        BadRequestException,
      );
      expect(() => sanitizeFilename('foo/../../bar.pdf')).toThrow(BadRequestException);
    });

    it('should reject null bytes and control characters', () => {
      expect(() => sanitizeFilename('test\0payload.pdf')).toThrow(BadRequestException);
      expect(() => sanitizeFilename('test%00payload.pdf')).toThrow(BadRequestException);
    });

    it('should reject empty or invalid filenames', () => {
      expect(() => sanitizeFilename('')).toThrow(BadRequestException);
    });
  });

  describe('generateStorageKey', () => {
    it('should partition by tenant when tenantId is provided', () => {
      const key = generateStorageKey({
        tenantId: 'firm-uuid-123',
        userId: 'user-uuid-456',
        folder: 'diligence',
        fileId: 'file-uuid-789',
        filename: 'report.pdf',
      });

      expect(key).toBe('tenants/firm-uuid-123/diligence/file-uuid-789/report.pdf');
    });

    it('should partition by user when tenantId is absent (consultants)', () => {
      const key = generateStorageKey({
        userId: 'consultant-uuid-123',
        folder: 'credentials',
        fileId: 'file-uuid-789',
        filename: 'resume.pdf',
      });

      expect(key).toBe('users/consultant-uuid-123/credentials/file-uuid-789/resume.pdf');
    });

    it('should sanitize folder name and prevent path traversal in folders', () => {
      const key = generateStorageKey({
        tenantId: 'firm-uuid-123',
        userId: 'user-uuid-456',
        folder: '../../../sensitive',
        fileId: 'file-uuid-789',
        filename: 'safe.pdf',
      });

      // Special characters like / and . stripped from folder, fallback to valid
      expect(key).not.toContain('..');
      expect(key).toContain('file-uuid-789/safe.pdf');
    });
  });

  describe('Constraints', () => {
    it('should enforce 25MB maximum size boundary', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(25 * 1024 * 1024);
    });

    it('should define allowed MIME types', () => {
      expect(Object.keys(ALLOWED_MIME_TYPES).length).toBeGreaterThanOrEqual(10);
    });
  });
});
