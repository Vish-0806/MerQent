// Canonical Domain Enums & Types for MerQent

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

export enum FileScanStatus {
  PENDING = 'PENDING',
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
}

export interface UserContext {
  id: string;
  email: string;
  role: UserRole;
  firmId?: string;
  consultantProfileId?: string;
}
