-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";

-- CreateEnum
CREATE TYPE "vendor_tier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "vendor_status" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('owner', 'admin', 'staff', 'readonly');

-- CreateEnum
CREATE TYPE "service_category" AS ENUM ('venue', 'catering', 'photography', 'videography', 'music', 'decoration', 'transportation', 'accommodation', 'planning', 'entertainment', 'equipment', 'staffing', 'other');

-- CreateEnum
CREATE TYPE "unit_type" AS ENUM ('per_hour', 'per_day', 'per_event', 'per_person', 'per_unit', 'flat_rate', 'custom');

-- CreateEnum
CREATE TYPE "currency_code" AS ENUM ('USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED');

-- CreateEnum
CREATE TYPE "pricing_status" AS ENUM ('draft', 'pending_approval', 'active', 'expired', 'rejected');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('business_license', 'tax_certificate', 'insurance', 'identity', 'bank_details', 'portfolio', 'contract', 'other');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('pending', 'verified', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'password_change', 'settings_change', 'api_key_generate', 'document_upload', 'document_verify', 'status_change');

-- CreateEnum
CREATE TYPE "entity_type" AS ENUM ('vendor', 'vendor_user', 'service', 'pricing', 'document', 'booking', 'api_key', 'webhook');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected', 'no_show');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'partial', 'paid', 'refunded', 'failed');

-- CreateEnum
CREATE TYPE "api_key_status" AS ENUM ('active', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "api_scope" AS ENUM ('read', 'write', 'admin');

-- CreateEnum
CREATE TYPE "webhook_event" AS ENUM ('booking.created', 'booking.confirmed', 'booking.cancelled', 'booking.completed', 'message.received', 'pricing.updated', 'service.updated');

-- CreateEnum
CREATE TYPE "webhook_status" AS ENUM ('active', 'inactive', 'failing');

-- CreateEnum
CREATE TYPE "availability_status" AS ENUM ('available', 'booked', 'blocked', 'tentative');

-- CreateEnum
CREATE TYPE "price_upload_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'partial');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('draft', 'planning', 'quoted', 'approved', 'confirmed', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "business_type" VARCHAR(100),
    "contact_email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "address" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT,
    "logo_url" VARCHAR(500),
    "website" VARCHAR(500),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ,
    "verified_by" UUID,
    "status" "vendor_status" NOT NULL DEFAULT 'PENDING',
    "tier" "vendor_tier" NOT NULL DEFAULT 'BRONZE',
    "api_enabled" BOOLEAN NOT NULL DEFAULT false,
    "api_config" JSONB NOT NULL DEFAULT '{}',
    "service_areas" JSONB NOT NULL DEFAULT '[]',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pricing_min" DECIMAL(15,2),
    "pricing_max" DECIMAL(15,2),
    "rating" DECIMAL(3,2) DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "category" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "role" "user_role" NOT NULL DEFAULT 'staff',
    "phone" VARCHAR(50),
    "avatar_url" VARCHAR(500),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" VARCHAR(255),
    "two_factor_backup_codes" TEXT[],
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ,
    "email_verification_token" VARCHAR(255),
    "email_verification_expires" TIMESTAMPTZ,
    "password_reset_token" VARCHAR(255),
    "password_reset_expires" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "last_login_ip" INET,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" "service_category" NOT NULL,
    "description" TEXT,
    "short_description" VARCHAR(500),
    "unit_type" "unit_type" NOT NULL DEFAULT 'per_event',
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_quantity" INTEGER,
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "available_from" TIMESTAMPTZ,
    "available_until" TIMESTAMPTZ,
    "lead_time_days" INTEGER NOT NULL DEFAULT 0,
    "images" JSONB NOT NULL DEFAULT '[]',
    "featured_image" VARCHAR(500),
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "inclusions" JSONB NOT NULL DEFAULT '[]',
    "exclusions" JSONB NOT NULL DEFAULT '[]',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "booking_count" INTEGER NOT NULL DEFAULT 0,
    "rating_average" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" "currency_code" NOT NULL DEFAULT 'USD',
    "effective_date" DATE NOT NULL,
    "expiry_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" "pricing_status" NOT NULL DEFAULT 'active',
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "holiday_surcharge_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "weekend_surcharge_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "rush_surcharge_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "min_quantity_for_discount" INTEGER,
    "bulk_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pricing_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "old_price" DECIMAL(12,2) NOT NULL,
    "new_price" DECIMAL(12,2) NOT NULL,
    "price_change_percent" DECIMAL(5,2),
    "changed_by" UUID,
    "change_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "document_type" "document_type" NOT NULL,
    "document_name" VARCHAR(255) NOT NULL,
    "document_url" VARCHAR(500) NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "status" "document_status" NOT NULL DEFAULT 'pending',
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "expiry_date" DATE,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "uploaded_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID,
    "user_id" UUID,
    "action" "audit_action" NOT NULL,
    "entity_type" "entity_type" NOT NULL,
    "entity_id" UUID,
    "old_value" JSONB,
    "new_value" JSONB,
    "changes" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "request_id" VARCHAR(100),
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "event_id" UUID,
    "event_name" VARCHAR(255),
    "event_date" DATE NOT NULL,
    "event_start_time" TIME,
    "event_end_time" TIME,
    "event_location" JSONB,
    "client_name" VARCHAR(255),
    "client_email" VARCHAR(255),
    "client_phone" VARCHAR(50),
    "guest_count" INTEGER,
    "status" "booking_status" NOT NULL DEFAULT 'pending',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "special_requirements" TEXT,
    "notes" TEXT,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "currency" "currency_code" NOT NULL DEFAULT 'USD',
    "payment_status" "payment_status" NOT NULL DEFAULT 'pending',
    "deposit_amount" DECIMAL(12,2),
    "deposit_paid_at" TIMESTAMPTZ,
    "confirmed_at" TIMESTAMPTZ,
    "confirmed_by" UUID,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by" UUID,
    "cancellation_reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "sender_id" UUID,
    "sender_type" VARCHAR(20) NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "key_prefix" VARCHAR(8) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "scopes" "api_scope"[] DEFAULT ARRAY['read']::"api_scope"[],
    "status" "api_key_status" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "revoked_by" UUID,
    "revoke_reason" TEXT,
    "last_used_at" TIMESTAMPTZ,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 60,
    "rate_limit_per_day" INTEGER NOT NULL DEFAULT 10000,
    "description" TEXT,
    "allowed_ips" TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "events" "webhook_event"[],
    "secret" VARCHAR(255),
    "status" "webhook_status" NOT NULL DEFAULT 'active',
    "max_retries" INTEGER NOT NULL DEFAULT 5,
    "retry_delay_seconds" INTEGER NOT NULL DEFAULT 60,
    "last_triggered_at" TIMESTAMPTZ,
    "last_success_at" TIMESTAMPTZ,
    "last_failure_at" TIMESTAMPTZ,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "total_deliveries" INTEGER NOT NULL DEFAULT 0,
    "failed_deliveries" INTEGER NOT NULL DEFAULT 0,
    "custom_headers" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_id" UUID NOT NULL,
    "event" "webhook_event" NOT NULL,
    "payload" JSONB NOT NULL,
    "response_status" INTEGER,
    "response_body" TEXT,
    "response_time_ms" INTEGER,
    "success" BOOLEAN DEFAULT false,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMPTZ,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" VARCHAR(100) NOT NULL,
    "event_name" VARCHAR(255),
    "event_date" DATE NOT NULL,
    "event_time" TIME,
    "event_end_date" DATE,
    "event_end_time" TIME,
    "location" VARCHAR(255),
    "venue_details" JSONB NOT NULL DEFAULT '{}',
    "client_name" VARCHAR(255),
    "client_email" VARCHAR(255),
    "client_phone" VARCHAR(50),
    "attendees" INTEGER,
    "budget" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
    "total_quoted" DECIMAL(15,2),
    "total_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" "event_status" NOT NULL DEFAULT 'draft',
    "preferences" JSONB NOT NULL DEFAULT '[]',
    "requirements" TEXT,
    "agent_session_id" VARCHAR(255),
    "agent_plan" JSONB NOT NULL DEFAULT '{}',
    "agent_logs" JSONB NOT NULL DEFAULT '[]',
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "approved_at" TIMESTAMPTZ,
    "approved_by" VARCHAR(255),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "service_id" UUID,
    "selected_by" VARCHAR(50) NOT NULL DEFAULT 'agent',
    "selection_reason" TEXT,
    "match_score" DECIMAL(5,4),
    "quoted_price" DECIMAL(15,2),
    "final_price" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
    "status" VARCHAR(50) NOT NULL DEFAULT 'proposed',
    "vendor_response" TEXT,
    "responded_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "service_id" UUID,
    "date" DATE NOT NULL,
    "start_time" TIME,
    "end_time" TIME,
    "status" "availability_status" NOT NULL DEFAULT 'available',
    "booking_id" UUID,
    "notes" TEXT,
    "blocked_by" UUID,
    "blocked_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_uploads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(500),
    "file_size" INTEGER,
    "status" "price_upload_status" NOT NULL DEFAULT 'pending',
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "processed_records" INTEGER NOT NULL DEFAULT 0,
    "failed_records" INTEGER NOT NULL DEFAULT 0,
    "error_log" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_upload_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "upload_id" UUID NOT NULL,
    "service_id" UUID,
    "service_name" VARCHAR(255),
    "price" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
    "unit_type" VARCHAR(50),
    "effective_date" DATE,
    "expiry_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "raw_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMPTZ,

    CONSTRAINT "price_upload_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_performance_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query_type" VARCHAR(100) NOT NULL,
    "query_text" TEXT,
    "execution_time_ms" INTEGER,
    "rows_affected" INTEGER,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_performance_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "embedding" vector(1536),
    "content" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "embedding" vector(1536),
    "content" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_contact_email_key" ON "vendors"("contact_email");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_users_email_key" ON "vendor_users"("email");

-- CreateIndex
CREATE INDEX "vendor_users_vendor_id_idx" ON "vendor_users"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_users_email_idx" ON "vendor_users"("email");

-- CreateIndex
CREATE INDEX "vendor_users_role_idx" ON "vendor_users"("role");

-- CreateIndex
CREATE INDEX "vendor_users_email_verified_idx" ON "vendor_users"("email_verified");

-- CreateIndex
CREATE INDEX "services_vendor_id_idx" ON "services"("vendor_id");

-- CreateIndex
CREATE INDEX "services_category_idx" ON "services"("category");

-- CreateIndex
CREATE INDEX "services_is_active_idx" ON "services"("is_active");

-- CreateIndex
CREATE INDEX "pricing_service_id_idx" ON "pricing"("service_id");

-- CreateIndex
CREATE INDEX "pricing_vendor_id_idx" ON "pricing"("vendor_id");

-- CreateIndex
CREATE INDEX "pricing_is_active_idx" ON "pricing"("is_active");

-- CreateIndex
CREATE INDEX "pricing_status_idx" ON "pricing"("status");

-- CreateIndex
CREATE INDEX "pricing_effective_date_idx" ON "pricing"("effective_date");

-- CreateIndex
CREATE INDEX "price_history_pricing_id_idx" ON "price_history"("pricing_id");

-- CreateIndex
CREATE INDEX "price_history_service_id_idx" ON "price_history"("service_id");

-- CreateIndex
CREATE INDEX "price_history_vendor_id_idx" ON "price_history"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_documents_vendor_id_idx" ON "vendor_documents"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_documents_document_type_idx" ON "vendor_documents"("document_type");

-- CreateIndex
CREATE INDEX "vendor_documents_status_idx" ON "vendor_documents"("status");

-- CreateIndex
CREATE INDEX "audit_logs_vendor_id_idx" ON "audit_logs"("vendor_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "bookings_vendor_id_idx" ON "bookings"("vendor_id");

-- CreateIndex
CREATE INDEX "bookings_service_id_idx" ON "bookings"("service_id");

-- CreateIndex
CREATE INDEX "bookings_event_id_idx" ON "bookings"("event_id");

-- CreateIndex
CREATE INDEX "bookings_event_date_idx" ON "bookings"("event_date");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_payment_status_idx" ON "bookings"("payment_status");

-- CreateIndex
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at" DESC);

-- CreateIndex
CREATE INDEX "bookings_vendor_id_event_date_idx" ON "bookings"("vendor_id", "event_date");

-- CreateIndex
CREATE INDEX "booking_messages_booking_id_idx" ON "booking_messages"("booking_id");

-- CreateIndex
CREATE INDEX "booking_messages_sender_id_idx" ON "booking_messages"("sender_id");

-- CreateIndex
CREATE INDEX "booking_messages_created_at_idx" ON "booking_messages"("created_at" DESC);

-- CreateIndex
CREATE INDEX "api_keys_vendor_id_idx" ON "api_keys"("vendor_id");

-- CreateIndex
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");

-- CreateIndex
CREATE INDEX "api_keys_status_idx" ON "api_keys"("status");

-- CreateIndex
CREATE INDEX "webhooks_vendor_id_idx" ON "webhooks"("vendor_id");

-- CreateIndex
CREATE INDEX "webhooks_status_idx" ON "webhooks"("status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries"("webhook_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_created_at_idx" ON "webhook_deliveries"("created_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_deliveries_success_idx" ON "webhook_deliveries"("success");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_event_date_idx" ON "events"("event_date");

-- CreateIndex
CREATE INDEX "events_event_type_idx" ON "events"("event_type");

-- CreateIndex
CREATE INDEX "events_client_email_idx" ON "events"("client_email");

-- CreateIndex
CREATE INDEX "events_agent_session_id_idx" ON "events"("agent_session_id");

-- CreateIndex
CREATE INDEX "events_created_at_idx" ON "events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "event_vendors_event_id_idx" ON "event_vendors"("event_id");

-- CreateIndex
CREATE INDEX "event_vendors_vendor_id_idx" ON "event_vendors"("vendor_id");

-- CreateIndex
CREATE INDEX "event_vendors_status_idx" ON "event_vendors"("status");

-- CreateIndex
CREATE UNIQUE INDEX "event_vendors_event_id_vendor_id_key" ON "event_vendors"("event_id", "vendor_id");

-- CreateIndex
CREATE INDEX "vendor_availability_vendor_id_date_idx" ON "vendor_availability"("vendor_id", "date");

-- CreateIndex
CREATE INDEX "vendor_availability_status_idx" ON "vendor_availability"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_availability_vendor_id_date_service_id_key" ON "vendor_availability"("vendor_id", "date", "service_id");

-- CreateIndex
CREATE INDEX "price_uploads_vendor_id_idx" ON "price_uploads"("vendor_id");

-- CreateIndex
CREATE INDEX "price_uploads_status_idx" ON "price_uploads"("status");

-- CreateIndex
CREATE INDEX "price_upload_records_upload_id_idx" ON "price_upload_records"("upload_id");

-- CreateIndex
CREATE INDEX "price_upload_records_status_idx" ON "price_upload_records"("status");

-- CreateIndex
CREATE INDEX "query_performance_log_query_type_idx" ON "query_performance_log"("query_type");

-- CreateIndex
CREATE INDEX "query_performance_log_created_at_idx" ON "query_performance_log"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_embeddings_vendor_id_key" ON "vendor_embeddings"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_embeddings_vendor_id_idx" ON "vendor_embeddings"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_embeddings_event_id_key" ON "event_embeddings"("event_id");

-- CreateIndex
CREATE INDEX "event_embeddings_event_id_idx" ON "event_embeddings"("event_id");

-- AddForeignKey
ALTER TABLE "vendor_users" ADD CONSTRAINT "vendor_users_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing" ADD CONSTRAINT "pricing_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing" ADD CONSTRAINT "pricing_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing" ADD CONSTRAINT "pricing_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing" ADD CONSTRAINT "pricing_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_pricing_id_fkey" FOREIGN KEY ("pricing_id") REFERENCES "pricing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_messages" ADD CONSTRAINT "booking_messages_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_messages" ADD CONSTRAINT "booking_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vendors" ADD CONSTRAINT "event_vendors_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vendors" ADD CONSTRAINT "event_vendors_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_vendors" ADD CONSTRAINT "event_vendors_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_availability" ADD CONSTRAINT "vendor_availability_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_availability" ADD CONSTRAINT "vendor_availability_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_availability" ADD CONSTRAINT "vendor_availability_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_availability" ADD CONSTRAINT "vendor_availability_blocked_by_fkey" FOREIGN KEY ("blocked_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_uploads" ADD CONSTRAINT "price_uploads_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_uploads" ADD CONSTRAINT "price_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_upload_records" ADD CONSTRAINT "price_upload_records_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "price_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_embeddings" ADD CONSTRAINT "vendor_embeddings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_embeddings" ADD CONSTRAINT "event_embeddings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
