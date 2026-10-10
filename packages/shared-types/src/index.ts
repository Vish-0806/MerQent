/**
 * Canonical Domain Enums, Contracts, and Shared Types for MerQent
 * Shared across frontend (Next.js), backend (NestJS), and workspace packages.
 */

// ============================================================================
// 1. Domain Enums (Aligned with Prisma Schema)
// ============================================================================

export enum UserRole {
  PE_FIRM_ADMIN = 'PE_FIRM_ADMIN',
  PE_FIRM_MEMBER = 'PE_FIRM_MEMBER',
  CONSULTANT_OPERATOR = 'CONSULTANT_OPERATOR',
  VERIFICATION_REVIEWER = 'VERIFICATION_REVIEWER',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

// SystemRole alias for backward compatibility across backend guards & decorators
export type SystemRole = UserRole;
export const SystemRole = UserRole;

export enum BaseRole {
  PE_FIRM = 'PE_FIRM',
  CONSULTANT = 'CONSULTANT',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum FirmAumTier {
  UNDER_500M = 'UNDER_500M',
  TIER_500M_TO_2B = 'TIER_500M_TO_2B',
  TIER_2B_TO_10B = 'TIER_2B_TO_10B',
  OVER_10B = 'OVER_10B',
}

export enum PrimaryRoleType {
  STRATEGIC_CONSULTANT = 'STRATEGIC_CONSULTANT',
  HANDS_ON_OPERATOR = 'HANDS_ON_OPERATOR',
  HYBRID = 'HYBRID',
}

export enum AvailabilityStatus {
  IMMEDIATELY_AVAILABLE = 'IMMEDIATELY_AVAILABLE',
  AVAILABLE_WITHIN_30_DAYS = 'AVAILABLE_WITHIN_30_DAYS',
  BOOKED = 'BOOKED',
}

export enum VerificationTier {
  TIER_0_UNVERIFIED = 'TIER_0_UNVERIFIED',
  TIER_1_EMAIL_VERIFIED = 'TIER_1_EMAIL_VERIFIED',
  TIER_2_CREDENTIAL_VERIFIED = 'TIER_2_CREDENTIAL_VERIFIED',
  TIER_3_REFERENCE_VERIFIED = 'TIER_3_REFERENCE_VERIFIED',
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  FULFILLED = 'FULFILLED',
  CLOSED = 'CLOSED',
}

export enum ConnectionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}

export enum MeetingStatus {
  PROPOSED = 'PROPOSED',
  CONFIRMED = 'CONFIRMED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELED = 'CANCELED',
  COMPLETED = 'COMPLETED',
}

export enum TaxonomyCategory {
  ERP_SYSTEM = 'ERP_SYSTEM',
  ACCOUNTING_SYSTEM = 'ACCOUNTING_SYSTEM',
  DEAL_TYPE = 'DEAL_TYPE',
  INTEGRATION_DISCIPLINE = 'INTEGRATION_DISCIPLINE',
  INDUSTRY = 'INDUSTRY',
  PMI_TASK = 'PMI_TASK',
}

export enum VerificationRequestStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  INFO_REQUESTED = 'INFO_REQUESTED',
}

export enum FileScanStatus {
  PENDING = 'PENDING',
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
}

// ============================================================================
// 2. Canonical Permissions & RBAC Matrix
// ============================================================================

export enum Permission {
  // Organizations & Firms
  ORGANIZATION_READ = 'ORGANIZATION_READ',
  ORGANIZATION_UPDATE = 'ORGANIZATION_UPDATE',
  ORGANIZATION_MEMBER_MANAGE = 'ORGANIZATION_MEMBER_MANAGE',

  // Projects / PMI Mandates
  PROJECT_CREATE = 'PROJECT_CREATE',
  PROJECT_READ = 'PROJECT_READ',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  PROJECT_DELETE = 'PROJECT_DELETE',

  // Consultant Profiles
  CONSULTANT_PROFILE_READ = 'CONSULTANT_PROFILE_READ',
  CONSULTANT_PROFILE_UPDATE = 'CONSULTANT_PROFILE_UPDATE',
  CONSULTANT_AVAILABILITY_UPDATE = 'CONSULTANT_AVAILABILITY_UPDATE',

  // Matching & Shortlists
  MATCHING_RUN = 'MATCHING_RUN',
  SHORTLIST_MANAGE = 'SHORTLIST_MANAGE',

  // Connections & Messaging
  CONNECTION_REQUEST = 'CONNECTION_REQUEST',
  CONNECTION_RESPOND = 'CONNECTION_RESPOND',
  MESSAGE_SEND = 'MESSAGE_SEND',
  MESSAGE_READ = 'MESSAGE_READ',

  // Verification & Credentials
  VERIFICATION_SUBMIT = 'VERIFICATION_SUBMIT',
  VERIFICATION_REVIEW = 'VERIFICATION_REVIEW',

  // Platform Administration & Governance
  AUDIT_LOG_READ = 'AUDIT_LOG_READ',
  PLATFORM_USER_MANAGE = 'PLATFORM_USER_MANAGE',
  PLATFORM_TAXONOMY_MANAGE = 'PLATFORM_TAXONOMY_MANAGE',
}

export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.PLATFORM_ADMIN]: ALL_PERMISSIONS,

  [UserRole.PE_FIRM_ADMIN]: [
    Permission.ORGANIZATION_READ,
    Permission.ORGANIZATION_UPDATE,
    Permission.ORGANIZATION_MEMBER_MANAGE,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.CONSULTANT_PROFILE_READ,
    Permission.MATCHING_RUN,
    Permission.SHORTLIST_MANAGE,
    Permission.CONNECTION_REQUEST,
    Permission.CONNECTION_RESPOND,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],

  [UserRole.PE_FIRM_MEMBER]: [
    Permission.ORGANIZATION_READ,
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.CONSULTANT_PROFILE_READ,
    Permission.MATCHING_RUN,
    Permission.SHORTLIST_MANAGE,
    Permission.CONNECTION_REQUEST,
    Permission.CONNECTION_RESPOND,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],

  [UserRole.CONSULTANT_OPERATOR]: [
    Permission.CONSULTANT_PROFILE_READ,
    Permission.CONSULTANT_PROFILE_UPDATE,
    Permission.CONSULTANT_AVAILABILITY_UPDATE,
    Permission.VERIFICATION_SUBMIT,
    Permission.CONNECTION_RESPOND,
    Permission.MESSAGE_SEND,
    Permission.MESSAGE_READ,
  ],

  [UserRole.VERIFICATION_REVIEWER]: [
    Permission.CONSULTANT_PROFILE_READ,
    Permission.VERIFICATION_REVIEW,
    Permission.AUDIT_LOG_READ,
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((perm) => hasPermission(role, perm));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((perm) => hasPermission(role, perm));
}

export function hasRole(currentRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(currentRole);
}

// ============================================================================
// 3. User & Session Context
// ============================================================================

export interface UserContext {
  id: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  firmId?: string;
  consultantProfileId?: string;
}

// ============================================================================
// 3. Pagination & Query Parameters
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export type SortOrder = 'asc' | 'desc';

export interface SortParams {
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface SearchQueryParams extends PaginationParams, SortParams {
  query?: string;
  filter?: Record<string, unknown>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

/**
 * Computes standardized pagination metadata with accurate page bounds and flags.
 */
export function createPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const safeTotal = Math.max(0, total);
  const safeLimit = Math.max(1, limit);
  const safePage = Math.max(1, page);
  const totalPages = Math.ceil(safeTotal / safeLimit);

  return {
    total: safeTotal,
    page: safePage,
    limit: safeLimit,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1 && safePage <= totalPages + 1,
  };
}

// ============================================================================
// 4. Standardized API Responses & Errors
// ============================================================================

/**
 * Canonical Machine-Readable Error Codes for MerQent API
 */
export enum ErrorCode {
  // General & System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',

  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  ACCOUNT_DEACTIVATED = 'ACCOUNT_DEACTIVATED',

  // Database & Entity Lifecycle
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',

  // Rate Limiting & Networking
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Storage & File Operations
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_SCAN_FAILED = 'FILE_SCAN_FAILED',
  MALWARE_DETECTED = 'MALWARE_DETECTED',
  STORAGE_ERROR = 'STORAGE_ERROR',

  // Background Job & Queue Operations
  JOB_ENQUEUE_FAILED = 'JOB_ENQUEUE_FAILED',
  JOB_PAYLOAD_INVALID = 'JOB_PAYLOAD_INVALID',
  JOB_EXECUTION_FAILED = 'JOB_EXECUTION_FAILED',
  QUEUE_UNAVAILABLE = 'QUEUE_UNAVAILABLE',

  // Realtime & WebSocket Operations
  WS_AUTHENTICATION_FAILED = 'WS_AUTHENTICATION_FAILED',
  WS_UNAUTHORIZED = 'WS_UNAUTHORIZED',
  WS_FORBIDDEN = 'WS_FORBIDDEN',
  WS_ROOM_JOIN_DENIED = 'WS_ROOM_JOIN_DENIED',
  WS_RATE_LIMIT_EXCEEDED = 'WS_RATE_LIMIT_EXCEEDED',
  WS_INVALID_PAYLOAD = 'WS_INVALID_PAYLOAD',
  WS_ADAPTER_ERROR = 'WS_ADAPTER_ERROR',
}

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: PaginationMeta;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  message?: string;
  timestamp: string;
}

/**
 * Creates a standard API response envelope with an ISO timestamp.
 */
export function createApiResponse<T>(
  data: T,
  meta?: PaginationMeta,
  message?: string,
): ApiResponse<T> {
  return {
    data,
    ...(meta ? { meta } : {}),
    ...(message ? { message } : {}),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates a standard paginated response envelope with calculated metadata.
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string,
): PaginatedResponse<T> {
  const meta = createPaginationMeta(total, page, limit);
  return {
    data,
    meta,
    ...(message ? { message } : {}),
    timestamp: new Date().toISOString(),
  };
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  errorCode?: ErrorCode | string;
  message: string | string[];
  error: string;
  timestamp: string;
  path?: string;
  correlationId?: string;
  details?: ApiErrorDetail[];
}

export type HealthCheckStatus = 'ok' | 'degraded';
export type DependencyStatus = 'connected' | 'disconnected';

export interface GenericDependencyHealthStatus {
  status: DependencyStatus;
  latencyMs?: number;
}

export type DatabaseHealthStatus = GenericDependencyHealthStatus;
export type RedisHealthStatus = GenericDependencyHealthStatus;
export type StorageHealthStatus = GenericDependencyHealthStatus;

export interface DependencyStatusMap {
  database: DatabaseHealthStatus;
  redis?: RedisHealthStatus;
  storage?: StorageHealthStatus;
  queue?: QueueHealthStatus;
  realtime?: RealtimeHealthStatus;
}

export interface HealthResponse {
  status: HealthCheckStatus;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  uptime: number;
  dependencies: DependencyStatusMap;
}

export interface LivenessResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  dependencies: DependencyStatusMap;
}

export interface MetricsSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  requests: {
    total: number;
    inFlight: number;
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
  };
  latencyMs: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  errors: {
    total: number;
    clientErrors: number;
    serverErrors: number;
    errorRatePercent: number;
  };
  memoryBytes: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  dependencies: Record<string, { healthy: boolean; latencyMs?: number }>;
}

// ============================================================================
// 5. Common Identifiers & Primitives
// ============================================================================

export interface IdParam {
  id: string;
}

export interface TimestampFields {
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface DateRangeParams {
  startDate?: string | Date;
  endDate?: string | Date;
}

// ============================================================================
// 6. File & Storage Domain Types
// ============================================================================

export interface FileRecordDto {
  id: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256: string;
  scanStatus: FileScanStatus;
  ownerUserId: string;
  createdAt: string;
}

export interface PresignUploadRequestDto {
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksumSha256?: string;
  folder?: string;
}

export interface PresignUploadResponseDto {
  fileRecordId: string;
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

export interface ConfirmUploadRequestDto {
  fileRecordId: string;
  checksumSha256?: string;
}

export interface PresignDownloadResponseDto {
  downloadUrl: string;
  expiresInSeconds: number;
  fileRecord: FileRecordDto;
}

export interface StorageObjectMetadata {
  contentLength: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
}

// ============================================================================
// 10. Background Job & Queue Infrastructure
// ============================================================================

export enum QueueName {
  FILE_PROCESSING = 'file-processing',
  NOTIFICATIONS = 'notifications',
}

export enum JobType {
  MALWARE_SCAN = 'malware-scan',
  CLEANUP_ABANDONED = 'cleanup-abandoned',
}

export interface MalwareScanJobPayload {
  fileRecordId: string;
  storageKey: string;
  requestedByUserId?: string;
  tenantId?: string;
}

export interface CleanupAbandonedJobPayload {
  maxAgeHours?: number;
  triggeredBy?: string;
}

export interface QueueJobResult {
  jobId: string;
  queueName: string;
  status: 'completed' | 'failed' | 'skipped';
  message?: string;
  processedAt: string;
}

export interface QueueHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  queues: Record<string, { isPaused: boolean; waiting: number; active: number; failed: number }>;
  workerStatus: 'running' | 'paused' | 'stopped';
}

// ============================================================================
// 11. Realtime & WebSocket Infrastructure
// ============================================================================

export enum RealtimeEvent {
  CONNECTION_ESTABLISHED = 'connection:established',
  ROOM_JOIN = 'room:join',
  ROOM_JOINED = 'room:joined',
  ROOM_LEAVE = 'room:leave',
  ROOM_LEFT = 'room:left',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',
  HEARTBEAT_ACK = 'heartbeat:ack',
  DISCONNECT = 'disconnect',
}

export interface WsAuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firmId?: string;
  consultantProfileId?: string;
}

export interface WsConnectionPayload {
  socketId: string;
  userId: string;
  connectedAt: string;
}

export interface WsRoomJoinPayload {
  roomId: string;
}

export interface WsRoomJoinedPayload {
  roomId: string;
  userId: string;
}

export interface WsRoomLeavePayload {
  roomId: string;
}

export interface WsRoomLeftPayload {
  roomId: string;
  userId: string;
}

export interface WsHeartbeatPayload {
  timestamp?: number;
}

export interface WsErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface RealtimeHealthStatus {
  status: 'connected' | 'degraded' | 'disconnected';
  adapter: 'redis' | 'memory';
  activeConnections: number;
  roomsCount: number;
}
