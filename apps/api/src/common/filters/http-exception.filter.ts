import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { RequestWithCorrelation } from '../middleware/correlation-id.middleware';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithCorrelation>();

    const correlationId = request.correlationId || 'no-correlation-id';
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorType = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string | string[]) || exception.message;
        errorType = (resObj.error as string) || exception.name;
      } else {
        message = String(res);
        errorType = exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Prisma error mapping
      switch (exception.code) {
        case 'P2002': {
          statusCode = HttpStatus.CONFLICT;
          const target = (exception.meta?.target as string[]) || ['field'];
          message = `Unique constraint violation on: ${Array.isArray(target) ? target.join(', ') : String(target)}`;
          errorType = 'Conflict';
          break;
        }
        case 'P2025': {
          statusCode = HttpStatus.NOT_FOUND;
          message = 'The requested database record was not found.';
          errorType = 'Not Found';
          break;
        }
        case 'P2003': {
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint violation.';
          errorType = 'Bad Request';
          break;
        }
        default: {
          statusCode = HttpStatus.BAD_REQUEST;
          message = `Database operation error (${exception.code})`;
          errorType = 'Database Error';
          break;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Database schema validation failure.';
      errorType = 'Bad Request';
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${correlationId}] Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    // Never leak stack trace to the client
    response.status(statusCode).json({
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
      message,
      error: errorType,
    });
  }
}
