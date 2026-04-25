-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "company_member_role" AS ENUM ('OWNER', 'ADMIN', 'ENGINEER', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "company_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "subscription_plan" AS ENUM ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "document_scope" AS ENUM ('GLOBAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "technical_document_type" AS ENUM ('TECHNICAL_STANDARD', 'CONNECTION_STANDARD', 'PROCEDURE', 'MANUAL', 'RESOLUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "version_status" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "processing_status" AS ENUM ('PENDING', 'EXTRACTING', 'CHUNKING', 'EMBEDDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "rag_question_status" AS ENUM ('RECEIVED', 'RETRIEVING', 'ANSWERING', 'ANSWERED', 'FAILED');

-- CreateEnum
CREATE TYPE "rag_answer_status" AS ENUM ('DRAFT', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('USER_LOGIN', 'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'DOCUMENT_VERSION_CREATED', 'DOCUMENT_PROCESSED', 'RAG_QUESTION_CREATED', 'RAG_ANSWER_CREATED', 'PLAN_USAGE_RECORDED', 'SYSTEM_EVENT');

-- CreateEnum
CREATE TYPE "usage_metric" AS ENUM ('RAG_QUESTION', 'DOCUMENT_UPLOAD', 'DOCUMENT_PAGE', 'DOCUMENT_CHUNK', 'STORAGE_MB', 'EMBEDDING_TOKEN', 'CHAT_TOKEN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'MEMBER',
    "avatar_url" TEXT,
    "external_auth_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "document_number" TEXT,
    "slug" TEXT NOT NULL,
    "status" "company_status" NOT NULL DEFAULT 'ACTIVE',
    "plan" "subscription_plan" NOT NULL DEFAULT 'FREE',
    "state_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_members" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "company_member_role" NOT NULL DEFAULT 'VIEWER',
    "title" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_documents" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "scope" "document_scope" NOT NULL DEFAULT 'COMPANY',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "concessionaire" TEXT,
    "state_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "document_type" "technical_document_type" NOT NULL DEFAULT 'TECHNICAL_STANDARD',
    "status" "document_status" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT,
    "version_label" TEXT NOT NULL,
    "source_file_name" TEXT,
    "storage_path" TEXT,
    "checksum_sha256" TEXT,
    "status" "version_status" NOT NULL DEFAULT 'DRAFT',
    "processing_status" "processing_status" NOT NULL DEFAULT 'PENDING',
    "page_count" INTEGER NOT NULL DEFAULT 0,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "embedding_model" TEXT,
    "published_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "processing_error" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_pages" (
    "id" TEXT NOT NULL,
    "document_version_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "text" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "document_version_id" TEXT NOT NULL,
    "document_page_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "token_count" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(1536),
    "embedding_model" TEXT,
    "embedded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_questions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "user_id" TEXT,
    "technical_document_id" TEXT,
    "question" TEXT NOT NULL,
    "normalized_question" TEXT,
    "status" "rag_question_status" NOT NULL DEFAULT 'RECEIVED',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_answers" (
    "id" TEXT NOT NULL,
    "rag_question_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "status" "rag_answer_status" NOT NULL DEFAULT 'COMPLETED',
    "model_name" TEXT,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "latency_ms" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rag_answer_sources" (
    "id" TEXT NOT NULL,
    "rag_answer_id" TEXT NOT NULL,
    "document_chunk_id" TEXT,
    "page_number" INTEGER NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "source_title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "relevance_score" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_answer_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "user_id" TEXT,
    "action" "audit_action" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_usages" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "plan" "subscription_plan" NOT NULL,
    "metric" "usage_metric" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_external_auth_id_key" ON "users"("external_auth_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_document_number_key" ON "companies"("document_number");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_slug_idx" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "companies_status_plan_idx" ON "companies"("status", "plan");

-- CreateIndex
CREATE INDEX "company_members_user_id_idx" ON "company_members"("user_id");

-- CreateIndex
CREATE INDEX "company_members_company_id_role_idx" ON "company_members"("company_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "company_members_company_id_user_id_key" ON "company_members"("company_id", "user_id");

-- CreateIndex
CREATE INDEX "technical_documents_scope_status_idx" ON "technical_documents"("scope", "status");

-- CreateIndex
CREATE INDEX "technical_documents_concessionaire_idx" ON "technical_documents"("concessionaire");

-- CreateIndex
CREATE INDEX "technical_documents_document_type_idx" ON "technical_documents"("document_type");

-- CreateIndex
CREATE UNIQUE INDEX "technical_documents_company_id_slug_key" ON "technical_documents"("company_id", "slug");

-- CreateIndex
CREATE INDEX "document_versions_status_processing_status_idx" ON "document_versions"("status", "processing_status");

-- CreateIndex
CREATE INDEX "document_versions_uploaded_by_user_id_idx" ON "document_versions"("uploaded_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_document_id_version_label_key" ON "document_versions"("document_id", "version_label");

-- CreateIndex
CREATE INDEX "document_pages_page_number_idx" ON "document_pages"("page_number");

-- CreateIndex
CREATE UNIQUE INDEX "document_pages_document_version_id_page_number_key" ON "document_pages"("document_version_id", "page_number");

-- CreateIndex
CREATE INDEX "document_chunks_document_version_id_page_number_idx" ON "document_chunks"("document_version_id", "page_number");

-- CreateIndex
CREATE INDEX "document_chunks_document_page_id_idx" ON "document_chunks"("document_page_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_chunks_document_version_id_chunk_index_key" ON "document_chunks"("document_version_id", "chunk_index");

-- CreateIndex
CREATE INDEX "rag_questions_company_id_created_at_idx" ON "rag_questions"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "rag_questions_user_id_created_at_idx" ON "rag_questions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "rag_questions_technical_document_id_idx" ON "rag_questions"("technical_document_id");

-- CreateIndex
CREATE INDEX "rag_questions_status_idx" ON "rag_questions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rag_answers_rag_question_id_key" ON "rag_answers"("rag_question_id");

-- CreateIndex
CREATE INDEX "rag_answers_status_idx" ON "rag_answers"("status");

-- CreateIndex
CREATE INDEX "rag_answer_sources_rag_answer_id_idx" ON "rag_answer_sources"("rag_answer_id");

-- CreateIndex
CREATE INDEX "rag_answer_sources_document_chunk_id_idx" ON "rag_answer_sources"("document_chunk_id");

-- CreateIndex
CREATE INDEX "rag_answer_sources_page_number_idx" ON "rag_answer_sources"("page_number");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "plan_usages_company_id_plan_idx" ON "plan_usages"("company_id", "plan");

-- CreateIndex
CREATE INDEX "plan_usages_metric_idx" ON "plan_usages"("metric");

-- CreateIndex
CREATE UNIQUE INDEX "plan_usages_company_id_metric_period_start_period_end_key" ON "plan_usages"("company_id", "metric", "period_start", "period_end");

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_documents" ADD CONSTRAINT "technical_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "technical_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_page_id_fkey" FOREIGN KEY ("document_page_id") REFERENCES "document_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_questions" ADD CONSTRAINT "rag_questions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_questions" ADD CONSTRAINT "rag_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_questions" ADD CONSTRAINT "rag_questions_technical_document_id_fkey" FOREIGN KEY ("technical_document_id") REFERENCES "technical_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_answers" ADD CONSTRAINT "rag_answers_rag_question_id_fkey" FOREIGN KEY ("rag_question_id") REFERENCES "rag_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_answer_sources" ADD CONSTRAINT "rag_answer_sources_rag_answer_id_fkey" FOREIGN KEY ("rag_answer_id") REFERENCES "rag_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rag_answer_sources" ADD CONSTRAINT "rag_answer_sources_document_chunk_id_fkey" FOREIGN KEY ("document_chunk_id") REFERENCES "document_chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_usages" ADD CONSTRAINT "plan_usages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
