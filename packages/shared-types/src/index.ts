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

// ============================================================================
// 4. Standardized API Responses & Errors
// ============================================================================

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

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path?: string;
  correlationId?: string;
  details?: ApiErrorDetail[];
}

export type HealthCheckStatus = 'ok' | 'degraded';
export type DependencyStatus = 'connected' | 'disconnected';

export interface DatabaseHealthStatus {
  status: DependencyStatus;
  latencyMs?: number;
}

export interface DependencyStatusMap {
  database: DatabaseHealthStatus;
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
