import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ErrorCode } from '@merqent/shared-types';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe (Task 2.10: Contract Validation)', () => {
  const schema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
  });

  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(schema);
  });

  it('successfully returns valid parsed data', () => {
    const validData = { name: 'Apollo Global', email: 'partner@apollo.com' };
    const result = pipe.transform(validData, { type: 'body' });

    expect(result).toEqual(validData);
  });

  it('throws BadRequestException with structured details on validation failure', () => {
    const invalidData = { name: 'Al', email: 'not-an-email' };

    try {
      pipe.transform(invalidData, { type: 'body' });
      fail('Expected pipe to throw BadRequestException');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const res = (err as BadRequestException).getResponse() as Record<string, unknown>;

      expect(res.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
      expect(res.error).toBe('Bad Request');
      expect(Array.isArray(res.details)).toBe(true);

      const details = res.details as Array<{ field?: string; message: string; code?: string }>;
      expect(details).toHaveLength(2);
      expect(details[0]).toEqual(
        expect.objectContaining({
          field: 'name',
          message: 'Name must be at least 3 characters',
        }),
      );
      expect(details[1]).toEqual(
        expect.objectContaining({
          field: 'email',
          message: 'Invalid email address',
        }),
      );
    }
  });
});
