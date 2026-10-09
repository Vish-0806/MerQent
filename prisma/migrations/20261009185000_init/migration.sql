-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PE_FIRM_ADMIN', 'PE_FIRM_MEMBER', 'CONSULTANT_OPERATOR', 'VERIFICATION_REVIEWER', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "FirmAumTier" AS ENUM ('UNDER_500M', 'TIER_500M_TO_2B', 'TIER_2B_TO_10B', 'OVER_10B');

-- CreateEnum
CREATE TYPE "PrimaryRoleType" AS ENUM ('STRATEGIC_CONSULTANT', 'HANDS_ON_OPERATOR', 'HYBRID');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('IMMEDIATELY_AVAILABLE', 'AVAILABLE_WITHIN_30_DAYS', 'BOOKED');

-- CreateEnum
CREATE TYPE "VerificationTier" AS ENUM ('TIER_0_UNVERIFIED', 'TIER_1_EMAIL_VERIFIED', 'TIER_2_CREDENTIAL_VERIFIED', 'TIER_3_REFERENCE_VERIFIED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'FULFILLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'RESCHEDULED', 'CANCELED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaxonomyCategory" AS ENUM ('ERP_SYSTEM', 'ACCOUNTING_SYSTEM', 'DEAL_TYPE', 'INTEGRATION_DISCIPLINE', 'INDUSTRY', 'PMI_TASK');

-- CreateEnum
CREATE TYPE "VerificationRequestStatus" AS ENUM ('PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'INFO_REQUESTED');

-- CreateEnum
CREATE TYPE "FileScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "avatar_url" VARCHAR(1024),
    "role" "UserRole" NOT NULL DEFAULT 'CONSULTANT_OPERATOR',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email_verified_at" TIMESTAMP(3),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" VARCHAR(255),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "device_info" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firms" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "legal_name" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "website_url" VARCHAR(512),
    "aum_tier" "FirmAumTier" NOT NULL DEFAULT 'UNDER_500M',
    "headquarters_country" VARCHAR(100) NOT NULL,
    "headquarters_city" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firm_members" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "firm_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PE_FIRM_MEMBER',
    "job_title" VARCHAR(150),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firm_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "headline" VARCHAR(150) NOT NULL,
    "bio" TEXT NOT NULL,
    "primary_role_type" "PrimaryRoleType" NOT NULL DEFAULT 'STRATEGIC_CONSULTANT',
    "years_pmi_experience" INTEGER NOT NULL,
    "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'IMMEDIATELY_AVAILABLE',
    "available_hours_per_week" INTEGER NOT NULL DEFAULT 40,
    "geography_country" VARCHAR(100) NOT NULL,
    "willing_to_travel_percent" INTEGER NOT NULL DEFAULT 25,
    "verification_tier" "VerificationTier" NOT NULL DEFAULT 'TIER_0_UNVERIFIED',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultant_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_experiences" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consultant_profile_id" UUID NOT NULL,
    "role_title" VARCHAR(150) NOT NULL,
    "deal_context_masked" VARCHAR(255) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "description" TEXT NOT NULL,
    "achievements" TEXT[],
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultant_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_certifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consultant_profile_id" UUID NOT NULL,
    "certification_name" VARCHAR(255) NOT NULL,
    "issuing_organization" VARCHAR(255) NOT NULL,
    "issue_date" DATE NOT NULL,
    "expiration_date" DATE,
    "credential_id" VARCHAR(255),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultant_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_references" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consultant_profile_id" UUID NOT NULL,
    "referrer_name" VARCHAR(255) NOT NULL,
    "referrer_title" VARCHAR(150) NOT NULL,
    "referrer_organization" VARCHAR(255) NOT NULL,
    "referrer_email" VARCHAR(255) NOT NULL,
    "relationship" VARCHAR(255) NOT NULL,
    "feedback_text" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultant_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxonomy_terms" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "category" "TaxonomyCategory" NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_term_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxonomy_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_taxonomies" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consultant_profile_id" UUID NOT NULL,
    "taxonomy_term_id" UUID NOT NULL,
    "years_experience" INTEGER,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "consultant_taxonomies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "firm_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "confidential_name_masked" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "target_close_date" DATE,
    "target_start_date" DATE NOT NULL,
    "estimated_duration_months" INTEGER NOT NULL DEFAULT 6,
    "required_travel_percent" INTEGER NOT NULL DEFAULT 25,
    "geography_country" VARCHAR(100) NOT NULL,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_requirements" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_taxonomies" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "taxonomy_term_id" UUID NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "project_taxonomies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_matches" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "consultant_profile_id" UUID NOT NULL,
    "match_score" DECIMAL(5,2) NOT NULL,
    "confidence_score" DECIMAL(5,2) NOT NULL,
    "is_low_confidence" BOOLEAN NOT NULL DEFAULT false,
    "model_provider" VARCHAR(50) NOT NULL,
    "model_version" VARCHAR(50) NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_explanations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "project_match_id" UUID NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "summary_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_explanations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_evidences" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "match_explanation_id" UUID NOT NULL,
    "source_entity_type" VARCHAR(100) NOT NULL,
    "source_entity_id" UUID NOT NULL,
    "excerpt" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlists" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "firm_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shortlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlist_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "shortlist_id" UUID NOT NULL,
    "consultant_profile_id" UUID NOT NULL,
    "internal_rating" INTEGER,
    "private_notes" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "firm_id" UUID NOT NULL,
    "consultant_profile_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "introductory_note" TEXT,
    "responded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "connection_id" UUID NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "conversation_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "message_id" UUID NOT NULL,
    "file_record_id" UUID NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "connection_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "agenda" TEXT,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "timezone" VARCHAR(100) NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'PROPOSED',
    "meeting_url" VARCHAR(1024),
    "ics_uid" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consultant_profile_id" UUID NOT NULL,
    "target_tier" "VerificationTier" NOT NULL,
    "status" "VerificationRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewer_notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_evidences" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "verification_request_id" UUID NOT NULL,
    "file_record_id" UUID NOT NULL,
    "evidence_type" VARCHAR(100) NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_records" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "storage_key" VARCHAR(255) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "checksum_sha256" VARCHAR(64) NOT NULL,
    "scan_status" "FileScanStatus" NOT NULL DEFAULT 'PENDING',
    "owner_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "actor_user_id" UUID,
    "actor_ip_address" VARCHAR(45),
    "action" VARCHAR(100) NOT NULL,
    "target_resource_type" VARCHAR(100) NOT NULL,
    "target_resource_id" VARCHAR(100),
    "payload_diff" JSONB,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_is_revoked_idx" ON "refresh_tokens"("user_id", "is_revoked");

-- CreateIndex
CREATE UNIQUE INDEX "firm_members_user_id_key" ON "firm_members"("user_id");

-- CreateIndex
CREATE INDEX "firm_members_firm_id_idx" ON "firm_members"("firm_id");

-- CreateIndex
CREATE UNIQUE INDEX "consultant_profiles_user_id_key" ON "consultant_profiles"("user_id");

-- CreateIndex
CREATE INDEX "consultant_profiles_availability_status_is_published_idx" ON "consultant_profiles"("availability_status", "is_published");

-- CreateIndex
CREATE INDEX "consultant_profiles_verification_tier_idx" ON "consultant_profiles"("verification_tier");

-- CreateIndex
CREATE INDEX "consultant_experiences_consultant_profile_id_idx" ON "consultant_experiences"("consultant_profile_id");

-- CreateIndex
CREATE INDEX "consultant_certifications_consultant_profile_id_idx" ON "consultant_certifications"("consultant_profile_id");

-- CreateIndex
CREATE INDEX "consultant_references_consultant_profile_id_idx" ON "consultant_references"("consultant_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "taxonomy_terms_code_key" ON "taxonomy_terms"("code");

-- CreateIndex
CREATE INDEX "taxonomy_terms_category_is_active_idx" ON "taxonomy_terms"("category", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "consultant_taxonomies_consultant_profile_id_taxonomy_term_i_key" ON "consultant_taxonomies"("consultant_profile_id", "taxonomy_term_id");

-- CreateIndex
CREATE INDEX "projects_firm_id_status_idx" ON "projects"("firm_id", "status");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "project_requirements_project_id_idx" ON "project_requirements"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_taxonomies_project_id_taxonomy_term_id_key" ON "project_taxonomies"("project_id", "taxonomy_term_id");

-- CreateIndex
CREATE INDEX "project_matches_project_id_match_score_idx" ON "project_matches"("project_id", "match_score");

-- CreateIndex
CREATE UNIQUE INDEX "project_matches_project_id_consultant_profile_id_key" ON "project_matches"("project_id", "consultant_profile_id");

-- CreateIndex
CREATE INDEX "match_explanations_project_match_id_idx" ON "match_explanations"("project_match_id");

-- CreateIndex
CREATE INDEX "match_evidences_match_explanation_id_idx" ON "match_evidences"("match_explanation_id");

-- CreateIndex
CREATE UNIQUE INDEX "shortlists_project_id_key" ON "shortlists"("project_id");

-- CreateIndex
CREATE INDEX "shortlists_firm_id_idx" ON "shortlists"("firm_id");

-- CreateIndex
CREATE UNIQUE INDEX "shortlist_items_shortlist_id_consultant_profile_id_key" ON "shortlist_items"("shortlist_id", "consultant_profile_id");

-- CreateIndex
CREATE INDEX "connections_status_idx" ON "connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "connections_firm_id_consultant_profile_id_project_id_key" ON "connections"("firm_id", "consultant_profile_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_connection_id_key" ON "conversations"("connection_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "message_attachments_message_id_idx" ON "message_attachments"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_ics_uid_key" ON "meetings"("ics_uid");

-- CreateIndex
CREATE INDEX "meetings_connection_id_start_time_idx" ON "meetings"("connection_id", "start_time");

-- CreateIndex
CREATE INDEX "verification_requests_status_idx" ON "verification_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "file_records_storage_key_key" ON "file_records"("storage_key");

-- CreateIndex
CREATE INDEX "file_records_owner_user_id_idx" ON "file_records"("owner_user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_event_type_key" ON "notification_preferences"("user_id", "event_type");

-- CreateIndex
CREATE INDEX "audit_logs_target_resource_type_target_resource_id_idx" ON "audit_logs"("target_resource_type", "target_resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firm_members" ADD CONSTRAINT "firm_members_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firm_members" ADD CONSTRAINT "firm_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_profiles" ADD CONSTRAINT "consultant_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_experiences" ADD CONSTRAINT "consultant_experiences_consultant_profile_id_fkey" FOREIGN KEY ("consultant_profile_id") REFERENCES "consultant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_certifications" ADD CONSTRAINT "consultant_certifications_consultant_profile_id_fkey" FOREIGN KEY ("consultant_profile_id") REFERENCES "consultant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_references" ADD CONSTRAINT "consultant_references_consultant_profile_id_fkey" FOREIGN KEY ("consultant_profile_id") REFERENCES "consultant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_parent_term_id_fkey" FOREIGN KEY ("parent_term_id") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_taxonomies" ADD CONSTRAINT "consultant_taxonomies_consultant_profile_id_fkey" FOREIGN KEY ("consultant_profile_id") REFERENCES "consultant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_taxonomies" ADD CONSTRAINT "consultant_taxonomies_taxonomy_term_id_fkey" FOREIGN KEY ("taxonomy_term_id") REFERENCES "taxonomy_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_requirements" ADD CONSTRAINT "project_requirements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_taxonomies" ADD CONSTRAINT "project_taxonomies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_taxonomies" ADD CONSTRAINT "project_taxonomies_taxonomy_term_id_fkey" FOREIGN KEY ("taxonomy_term_id") REFERENCES "taxonomy_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_matches" ADD CONSTRAINT "project_matches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_matches" ADD CONSTRAINT "project_matches_consultant_profile_id_fkey" FOREIGN KEY ("consultant_profile_id") REFERENCES "consultant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_explanations" ADD CONSTRAINT "match_explanations_project_match_id_fkey" FOREIGN KEY ("project_match_id") REFERENCES "project_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_evidences" ADD CONSTRAINT "match_evidences_match_explanation_id_fkey" FOREIGN KEY ("match_explanation_id") REFERENCES "match_explanations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_items" ADD CONSTRAINT "shortlist_items_shortlist_id_fkey" FOREIGN KEY ("shortlist_id") REFERENCES "shortlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_items" ADD CONSTRAINT "shortlist_items_consultant_profile_id_fkey" FOREIGN KEY ("consultant_profile_id") REFERENCES "consultant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_firm_id_fkey" FOREIGN KEY ("firm_id") REFERENCES "firms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_consultant_profile_id_fkey" FOREIGN KEY ("consultant_profile_id") REFERENCES "consultant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_file_record_id_fkey" FOREIGN KEY ("file_record_id") REFERENCES "file_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_consultant_profile_id_fkey" FOREIGN KEY ("consultant_profile_id") REFERENCES "consultant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_evidences" ADD CONSTRAINT "verification_evidences_verification_request_id_fkey" FOREIGN KEY ("verification_request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_evidences" ADD CONSTRAINT "verification_evidences_file_record_id_fkey" FOREIGN KEY ("file_record_id") REFERENCES "file_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

