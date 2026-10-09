import {
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCode } from '@merqent/shared-types';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter (Task 2.10: Error Architecture)', () => {
  let filter: AllExceptionsFilter;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;
  let mockResponse: { status: jest.Mock };
  let mockRequest: { url: string; method: string; correlationId?: string };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus };
    mockRequest = {
      url: '/api/v1/test',
      method: 'GET',
      correlationId: 'req-corr-123',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('formats standard HttpException with status, message, errorCode, and correlationId', () => {
    const exception = new HttpException('Resource not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        errorCode: ErrorCode.NOT_FOUND,
        error: 'HttpException',
        message: 'Resource not found',
        correlationId: 'req-corr-123',
        path: '/api/v1/test',
        timestamp: expect.any(String),
      }),
    );
  });

  it('formats validation errors with structured details and ErrorCode.VALIDATION_ERROR', () => {
    const exception = new BadRequestException({
      message: ['email: Invalid email format', 'password: Minimum 8 chars'],
      errorCode: ErrorCode.VALIDATION_ERROR,
      error: 'Bad Request',
      details: [
        { field: 'email', message: 'Invalid email format', code: 'isEmail' },
        { field: 'password', message: 'Minimum 8 chars', code: 'minLength' },
      ],
    });

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errorCode: ErrorCode.VALIDATION_ERROR,
        error: 'Bad Request',
        details: [
          { field: 'email', message: 'Invalid email format', code: 'isEmail' },
          { field: 'password', message: 'Minimum 8 chars', code: 'minLength' },
        ],
        correlationId: 'req-corr-123',
      }),
    );
  });

  it('correctly maps 401 Unauthorized with token expired error code', () => {
    const exception = new UnauthorizedException('Token has expired');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        errorCode: ErrorCode.TOKEN_EXPIRED,
        message: 'Token has expired',
      }),
    );
  });

  it('correctly maps 403 Forbidden with permissions or tenant error code', () => {
    const permException = new ForbiddenException(
      'Role lacks required permissions [PROJECT_CREATE]',
    );

    filter.catch(permException, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        errorCode: ErrorCode.INSUFFICIENT_PERMISSIONS,
      }),
    );

    const tenantException = new ForbiddenException(
      'Access denied: Resource belongs to another organization',
    );
    filter.catch(tenantException, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        errorCode: ErrorCode.TENANT_ACCESS_DENIED,
      }),
    );
  });

  it('maps Prisma P2002 unique constraint error to HTTP 409 Conflict with structured details', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.22.0',
      meta: { target: ['email'] },
    });

    filter.catch(prismaError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        errorCode: ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
        error: 'Conflict',
        message: 'Unique constraint violation on: email',
        details: [
          { field: 'email', message: 'A record with this email already exists.', code: 'P2002' },
        ],
        correlationId: 'req-corr-123',
      }),
    );
  });

  it('maps Prisma P2025 record not found to HTTP 404 Not Found', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.22.0',
    });

    filter.catch(prismaError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        errorCode: ErrorCode.RECORD_NOT_FOUND,
        error: 'Not Found',
        message: 'The requested database record was not found.',
      }),
    );
  });

  it('maps Prisma P2003 foreign key error to HTTP 400 Bad Request', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Foreign key failed', {
      code: 'P2003',
      clientVersion: '5.22.0',
    });

    filter.catch(prismaError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errorCode: ErrorCode.FOREIGN_KEY_VIOLATION,
        error: 'Bad Request',
        message: 'Foreign key constraint violation.',
      }),
    );
  });

  it('maps unhandled generic Error to HTTP 500 without leaking stack traces or internal messages', () => {
    const error = new Error('Database password was compromised in query: SELECT * FROM users');

    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
        correlationId: 'req-corr-123',
      }),
    );
    // Explicitly assert that the internal error message was never passed to the response
    const passedJson = mockJson.mock.calls[0][0];
    expect(passedJson.message).not.toContain('Database password');
    expect(passedJson.stack).toBeUndefined();
  });
});
