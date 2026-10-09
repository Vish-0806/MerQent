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
import { ErrorCode, ApiErrorDetail } from '@merqent/shared-types';
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
    let errorCode: string = ErrorCode.INTERNAL_SERVER_ERROR;
    let details: ApiErrorDetail[] | undefined = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string | string[]) || exception.message;
        errorType = (resObj.error as string) || exception.name;
        if (resObj.errorCode && typeof resObj.errorCode === 'string') {
          errorCode = resObj.errorCode;
        } else {
          errorCode = this.deriveErrorCodeFromHttpStatus(statusCode, message);
        }
        if (Array.isArray(resObj.details)) {
          details = resObj.details as ApiErrorDetail[];
        }
      } else {
        message = String(res);
        errorType = exception.name;
        errorCode = this.deriveErrorCodeFromHttpStatus(statusCode, message);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Prisma known request error mapping
      switch (exception.code) {
        case 'P2002': {
          statusCode = HttpStatus.CONFLICT;
          errorCode = ErrorCode.UNIQUE_CONSTRAINT_VIOLATION;
          errorType = 'Conflict';
          const target = (exception.meta?.target as string[]) || ['field'];
          const field = Array.isArray(target) ? target.join(', ') : String(target);
          message = `Unique constraint violation on: ${field}`;
          details = [
            { field, message: `A record with this ${field} already exists.`, code: 'P2002' },
          ];
          break;
        }
        case 'P2025': {
          statusCode = HttpStatus.NOT_FOUND;
          errorCode = ErrorCode.RECORD_NOT_FOUND;
          errorType = 'Not Found';
          message = 'The requested database record was not found.';
          break;
        }
        case 'P2003': {
          statusCode = HttpStatus.BAD_REQUEST;
          errorCode = ErrorCode.FOREIGN_KEY_VIOLATION;
          errorType = 'Bad Request';
          message = 'Foreign key constraint violation.';
          break;
        }
        default: {
          statusCode = HttpStatus.BAD_REQUEST;
          errorCode = ErrorCode.BAD_REQUEST;
          errorType = 'Database Error';
          message = `Database operation error (${exception.code})`;
          break;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      errorCode = ErrorCode.VALIDATION_ERROR;
      errorType = 'Bad Request';
      message = 'Database schema validation failure.';
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${correlationId}] Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    // Never leak stack trace, secrets, or internal database query details to client
    const responsePayload: Record<string, unknown> = {
      statusCode,
      errorCode,
      error: errorType,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    };

    if (details && details.length > 0) {
      responsePayload.details = details;
    }

    response.status(statusCode).json(responsePayload);
  }

  private deriveErrorCodeFromHttpStatus(statusCode: number, message: string | string[]): string {
    const msgStr = Array.isArray(message) ? message.join(' ') : message;
    const lower = msgStr.toLowerCase();

    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return lower.includes('validation') || Array.isArray(message)
          ? ErrorCode.VALIDATION_ERROR
          : ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        if (lower.includes('expired')) return ErrorCode.TOKEN_EXPIRED;
        if (lower.includes('credential')) return ErrorCode.INVALID_CREDENTIALS;
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        if (lower.includes('permission')) return ErrorCode.INSUFFICIENT_PERMISSIONS;
        if (lower.includes('organization') || lower.includes('tenant'))
          return ErrorCode.TENANT_ACCESS_DENIED;
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE;
      default:
        return statusCode >= 500 ? ErrorCode.INTERNAL_SERVER_ERROR : ErrorCode.BAD_REQUEST;
    }
  }
}
