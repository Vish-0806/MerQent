import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApiErrorResponse,
  HealthResponse,
  PaginationMeta,
  DatabaseHealthStatus,
  GenericDependencyHealthStatus,
  DependencyStatusMap,
  QueueHealthStatus,
  RealtimeHealthStatus,
} from '@merqent/shared-types';

export class ApiErrorDetailDto {
  @ApiPropertyOptional({ example: 'email', description: 'Affected property path' })
  field?: string;

  @ApiProperty({
    example: 'Must be a valid email address',
    description: 'Constraint violation description',
  })
  message!: string;

  @ApiPropertyOptional({
    example: 'isEmail',
    description: 'Machine-readable rule or constraint identifier',
  })
  code?: string;
}

export class ErrorResponseDto implements ApiErrorResponse {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode!: number;

  @ApiPropertyOptional({
    example: 'VALIDATION_ERROR',
    description: 'Stable machine-readable error code',
  })
  errorCode?: string;

  @ApiProperty({ example: '2026-10-08T16:20:00.000Z', description: 'ISO timestamp of occurrence' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/projects', description: 'Request URI path' })
  path!: string;

  @ApiProperty({
    example: 'b5f2cfcf-9c6f-40e1-b4f0-4560a8a72b01',
    description: 'Unique request correlation ID',
  })
  correlationId!: string;

  @ApiProperty({
    example: 'Validation failed',
    description: 'Human-readable error description or array of constraint violations',
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request', description: 'Error classification category' })
  error!: string;

  @ApiPropertyOptional({
    type: [ApiErrorDetailDto],
    description: 'Granular constraint details for validation errors',
  })
  details?: ApiErrorDetailDto[];
}

export class DatabaseDependencyStatusDto implements DatabaseHealthStatus {
  @ApiProperty({ enum: ['connected', 'disconnected'], example: 'connected' })
  status!: 'connected' | 'disconnected';

  @ApiPropertyOptional({ example: 3, description: 'Query round-trip latency in milliseconds' })
  latencyMs?: number;
}

export class RedisDependencyStatusDto implements GenericDependencyHealthStatus {
  @ApiProperty({ enum: ['connected', 'disconnected'], example: 'connected' })
  status!: 'connected' | 'disconnected';

  @ApiPropertyOptional({ example: 1, description: 'Ping round-trip latency in milliseconds' })
  latencyMs?: number;
}

export class StorageDependencyStatusDto implements GenericDependencyHealthStatus {
  @ApiProperty({ enum: ['connected', 'disconnected'], example: 'connected' })
  status!: 'connected' | 'disconnected';

  @ApiPropertyOptional({ example: 1, description: 'Storage probe latency in milliseconds' })
  latencyMs?: number;
}

export class QueueDependencyStatusDto implements QueueHealthStatus {
  @ApiProperty({ enum: ['healthy', 'degraded', 'unhealthy'], example: 'healthy' })
  status!: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({
    example: {
      'file-processing': { isPaused: false, waiting: 0, active: 0, failed: 0 },
    },
  })
  queues!: Record<string, { isPaused: boolean; waiting: number; active: number; failed: number }>;

  @ApiProperty({ enum: ['running', 'paused', 'stopped'], example: 'running' })
  workerStatus!: 'running' | 'paused' | 'stopped';
}

export class RealtimeDependencyStatusDto implements RealtimeHealthStatus {
  @ApiProperty({ enum: ['connected', 'degraded', 'disconnected'], example: 'connected' })
  status!: 'connected' | 'degraded' | 'disconnected';

  @ApiProperty({ enum: ['redis', 'memory'], example: 'redis' })
  adapter!: 'redis' | 'memory';

  @ApiProperty({ example: 42, description: 'Number of active authenticated client sockets' })
  activeConnections!: number;

  @ApiProperty({ example: 15, description: 'Number of active rooms' })
  roomsCount!: number;
}

export class DependencyStatusMapDto implements DependencyStatusMap {
  @ApiProperty({ type: DatabaseDependencyStatusDto })
  database!: DatabaseDependencyStatusDto;

  @ApiPropertyOptional({ type: RedisDependencyStatusDto })
  redis?: RedisDependencyStatusDto;

  @ApiPropertyOptional({ type: StorageDependencyStatusDto })
  storage?: StorageDependencyStatusDto;

  @ApiPropertyOptional({ type: QueueDependencyStatusDto })
  queue?: QueueDependencyStatusDto;

  @ApiPropertyOptional({ type: RealtimeDependencyStatusDto })
  realtime?: RealtimeDependencyStatusDto;
}

export class HealthResponseDto implements HealthResponse {
  @ApiProperty({ enum: ['ok', 'degraded'], example: 'ok' })
  status!: 'ok' | 'degraded';

  @ApiProperty({ example: 'MerQent API' })
  service!: string;

  @ApiProperty({ example: '1.0.0' })
  version!: string;

  @ApiProperty({ example: 'development' })
  environment!: string;

  @ApiProperty({ example: '2026-10-08T16:20:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: 42.1, description: 'Process uptime in seconds' })
  uptime!: number;

  @ApiProperty({ type: DependencyStatusMapDto })
  dependencies!: DependencyStatusMapDto;
}

export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty({ example: 100, description: 'Total number of items' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page!: number;

  @ApiProperty({ example: 20, description: 'Items per page' })
  limit!: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages!: number;

  @ApiPropertyOptional({ example: true, description: 'Whether next page exists' })
  hasNextPage?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Whether previous page exists' })
  hasPreviousPage?: boolean;
}
