import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  buildDocumentSlug,
  verifyDirectUploadSession,
} from "@/features/documents/server/direct-upload-session";

const DOCUMENT_SCOPE_GLOBAL = "GLOBAL";
const DOCUMENT_STATUS_DRAFT = "DRAFT";
const VERSION_STATUS_DRAFT = "DRAFT";
const PROCESSING_STATUS_PENDING = "PENDING";

export const runtime = "nodejs";

type TransactionClient = {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
};

export async function POST(request: Request) {
  const requestId = randomUUID();
  console.info("[documents/upload/complete]", {
    requestId,
    stage: "request_start",
  });

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return uploadCompleteError("Voce precisa estar autenticado.", 401);
  }

  if (currentUser.role !== "ADMIN") {
    return uploadCompleteError("Apenas administradores podem enviar normas.", 403);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return uploadCompleteError("Nao foi possivel concluir o cadastro.", 400);
  }

  const uploadSession =
    typeof body === "object" && body !== null && "uploadSession" in body
      ? String((body as { uploadSession?: unknown }).uploadSession ?? "")
      : "";
  const payload = verifyDirectUploadSession(uploadSession);

  if (!payload) {
    return uploadCompleteError("Sessao de upload invalida ou expirada.", 400);
  }

  const { metadata, bucket, storagePath } = payload;
  const documentSlug = buildDocumentSlug(metadata.title);
  const publishedAt = parseOptionalDate(metadata.publishedAt);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const documentId = randomUUID();
      const versionId = randomUUID();

      console.info("[documents/upload/complete]", {
        requestId,
        stage: "technical_document_create",
        state: metadata.state,
        documentType: metadata.documentType,
      });

      const document = await createTechnicalDocumentRaw(tx, {
        id: documentId,
        scope: DOCUMENT_SCOPE_GLOBAL,
        title: metadata.title,
        slug: `${documentSlug}-${randomUUID().slice(0, 8)}`,
        description: metadata.description,
        concessionaire: metadata.concessionaire,
        stateCodes: [metadata.state],
        documentType: metadata.documentType,
        status: DOCUMENT_STATUS_DRAFT,
        tags: metadata.tags,
        metadata: {
          uploadStage: "uploaded",
          temporaryGlobalDocument: true,
          publicationDate: publishedAt?.toISOString() ?? null,
          currentVersionLabel: metadata.versionLabel,
          uploadMode: "direct_storage_signed_url",
        },
      });

      console.info("[documents/upload/complete]", {
        requestId,
        stage: "document_version_create",
        documentId: document.id,
        bucket,
      });

      await createDocumentVersionRaw(tx, {
        id: versionId,
        documentId: document.id,
        uploadedByUserId: currentUser.id,
        versionLabel: metadata.versionLabel,
        sourceFileName: metadata.fileName,
        storagePath,
        status: VERSION_STATUS_DRAFT,
        processingStatus: PROCESSING_STATUS_PENDING,
        publishedAt,
        metadata: {
          storageBucket: bucket,
          originalFileName: metadata.fileName,
          mimeType: metadata.mimeType,
          fileSizeBytes: metadata.fileSizeBytes,
          uploadedByUserId: currentUser.id,
          uploadRequestId: requestId,
          uploadSessionId: payload.id,
        },
      });

      await createAuditLogRaw(tx, {
        userId: currentUser.id,
        entityId: document.id,
        metadata: {
          requestId,
          versionId,
          action: "document_upload",
          uploadMode: "direct_storage_signed_url",
        },
      });

      return {
        document,
        version: { id: versionId },
      };
    });

    console.info("[documents/upload/complete]", {
      requestId,
      stage: "upload_completed",
      documentId: result.document.id,
      versionId: result.version.id,
    });

    return NextResponse.json({
      ok: true,
      success: true,
      document: {
        id: result.document.id,
        title: result.document.title,
        versionId: result.version.id,
      },
    });
  } catch (error) {
    console.error("[documents/upload/complete]", {
      requestId,
      stage: "database_create",
      message: error instanceof Error ? error.message : "Unknown error",
      errorName: error instanceof Error ? error.name : typeof error,
    });

    await removePrivateObject(bucket, storagePath);

    return uploadCompleteError(buildDatabaseErrorMessage(error), 500);
  }
}

async function createTechnicalDocumentRaw(
  tx: TransactionClient,
  data: {
    id: string;
    scope: string;
    title: string;
    slug: string;
    description?: string;
    concessionaire: string;
    stateCodes: string[];
    documentType: string;
    status: string;
    tags: string[];
    metadata: Record<string, unknown>;
  },
) {
  const rows = await tx.$queryRaw<Array<{ id: string; title: string }>>`
    insert into technical_documents (
      id,
      scope,
      title,
      slug,
      description,
      concessionaire,
      state_codes,
      document_type,
      status,
      tags,
      metadata,
      created_at,
      updated_at
    )
    values (
      ${data.id},
      ${data.scope}::document_scope,
      ${data.title},
      ${data.slug},
      ${data.description ?? null},
      ${data.concessionaire},
      ${data.stateCodes},
      ${data.documentType}::technical_document_type,
      ${data.status}::document_status,
      ${data.tags},
      ${JSON.stringify(data.metadata)}::jsonb,
      now(),
      now()
    )
    returning id, title
  `;

  return rows[0] ?? { id: data.id, title: data.title };
}

async function createDocumentVersionRaw(
  tx: TransactionClient,
  data: {
    id: string;
    documentId: string;
    uploadedByUserId?: string;
    versionLabel: string;
    sourceFileName: string;
    storagePath: string;
    status: string;
    processingStatus: string;
    publishedAt?: Date;
    metadata: Record<string, unknown>;
  },
) {
  await tx.$executeRaw`
    insert into document_versions (
      id,
      document_id,
      uploaded_by_user_id,
      version_label,
      source_file_name,
      storage_path,
      status,
      processing_status,
      published_at,
      metadata,
      created_at,
      updated_at
    )
    values (
      ${data.id},
      ${data.documentId},
      ${data.uploadedByUserId ?? null},
      ${data.versionLabel},
      ${data.sourceFileName},
      ${data.storagePath},
      ${data.status}::version_status,
      ${data.processingStatus}::processing_status,
      ${data.publishedAt ?? null},
      ${JSON.stringify(data.metadata)}::jsonb,
      now(),
      now()
    )
  `;
}

async function createAuditLogRaw(
  tx: TransactionClient,
  data: {
    userId?: string;
    entityId: string;
    metadata: Record<string, unknown>;
  },
) {
  try {
    await tx.$executeRaw`
      insert into audit_logs (
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at
      )
      values (
        ${randomUUID()},
        ${data.userId ?? null},
        ${"DOCUMENT_CREATED"}::audit_action,
        ${"TechnicalDocument"},
        ${data.entityId},
        ${JSON.stringify(data.metadata)}::jsonb,
        now()
      )
    `;
  } catch (error) {
    console.error("[documents/upload/complete]", {
      stage: "audit_log_create",
      message: "Audit log insert skipped.",
      errorName: error instanceof Error ? error.name : typeof error,
    });
  }
}

async function removePrivateObject(bucket: string, storagePath: string) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase.storage.from(bucket).remove([storagePath]);

    if (error) {
      console.error("[documents/upload/complete]", {
        stage: "storage_cleanup",
        message: error.message,
        bucket,
      });
    }
  } catch (error) {
    console.error("[documents/upload/complete]", {
      stage: "storage_cleanup",
      message: error instanceof Error ? error.message : "Unknown error",
      errorName: error instanceof Error ? error.name : typeof error,
      bucket,
    });
  }
}

function parseOptionalDate(value: string | undefined) {
  if (!value) return undefined;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function buildDatabaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Tenant or user not found")) {
    return "PDF enviado, mas o banco recusou o tenant/usuario. Confira DATABASE_URL.";
  }

  return "PDF enviado, mas o cadastro no banco falhou. O arquivo foi removido do Storage.";
}

function uploadCompleteError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      message,
      error: message,
    },
    { status },
  );
}
