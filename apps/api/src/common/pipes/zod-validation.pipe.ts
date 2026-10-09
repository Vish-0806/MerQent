import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import { ErrorCode, ApiErrorDetail } from '@merqent/shared-types';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: ApiErrorDetail[] = error.errors.map((e) => ({
          field: e.path.join('.') || undefined,
          message: e.message,
          code: e.code,
        }));

        const errorMessages = details.map((d) =>
          d.field ? `${d.field}: ${d.message}` : d.message,
        );

        throw new BadRequestException({
          message: errorMessages,
          errorCode: ErrorCode.VALIDATION_ERROR,
          error: 'Bad Request',
          details,
        });
      }
      throw new BadRequestException({
        message: 'Validation failed',
        errorCode: ErrorCode.VALIDATION_ERROR,
        error: 'Bad Request',
      });
    }
  }
}
