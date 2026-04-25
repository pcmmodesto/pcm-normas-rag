import { randomUUID } from "crypto";
import {
  DocumentScope,
  DocumentStatus,
  ProcessingStatus,
  TechnicalDocumentType,
  VersionStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  BRAZILIAN_STATES,
  DEFAULT_DOCUMENTS_BUCKET,
  DOCUMENTS_BUCKET_ENV,
  MAX_DOCUMENT_UPLOAD_BYTES,
} from "@/features/documents/lib/upload-constants";

type ValidationResult =
  | {
      ok: true;
      data: {
        title: string;
        concessionaire: string;
        state: string;
        documentType: TechnicalDocumentType;
        versionLabel: string;
        publishedAt?: Date;
        description?: string;
        tags: string[];
        file: File;
      };
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

type UploadStage =
  | "request_start"
  | "form_data_read"
  | "file_validation"
  | "supabase_server_client"
  | "storage_upload"
  | "technical_document_create"
  | "document_version_create"
  | "storage_cleanup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = randomUUID();
  logUploadStage(requestId, "request_start", "Upload request started.");

  let formData: FormData;

  try {
    formData = await request.formData();
    logUploadStage(requestId, "form_data_read", "FormData parsed.");
  } catch (error) {
    logUploadError(requestId, "form_data_read", error);
    return uploadErrorResponse(
      "form_data_read",
      "Nao foi possivel ler os dados do formulario.",
      400,
    );
  }

  const validation = validateUploadForm(formData);

  if (!validation.ok) {
    logUploadStage(requestId, "file_validation", "Validation failed.", {
      status: validation.status,
    });
    return uploadErrorResponse(
      "file_validation",
      validation.error,
      validation.status,
    );
  }

  logUploadStage(requestId, "file_validation", "Validation passed.", {
    contentType: validation.data.file.type || "application/pdf",
    fileSizeBytes: validation.data.file.size,
    state: validation.data.state,
    documentType: validation.data.documentType,
  });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket =
    process.env[DOCUMENTS_BUCKET_ENV]?.trim() || DEFAULT_DOCUMENTS_BUCKET;

  if (!supabaseUrl || !serviceRoleKey) {
    logUploadStage(
      requestId,
      "supabase_server_client",
      "Missing Supabase server configuration.",
      {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
        bucket,
      },
    );
    return uploadErrorResponse(
      "supabase_server_client",
      "Storage do Supabase nao esta configurado.",
      500,
    );
  }

  if (!isValidSupabaseProjectUrl(supabaseUrl)) {
    logUploadStage(
      requestId,
      "supabase_server_client",
      "Invalid Supabase project URL shape.",
    );
    return uploadErrorResponse(
      "supabase_server_client",
      "SUPABASE_URL deve estar no formato https://PROJECT_REF.supabase.co.",
      500,
    );
  }

  logUploadStage(requestId, "supabase_server_client", "Storage client ready.", {
    bucket,
    supabaseHost: new URL(supabaseUrl).hostname,
  });

  const { data } = validation;
  const documentSlug = buildSlug(data.title);
  const storagePath = buildStoragePath(documentSlug, data.file.name);
  let fileBytes: ArrayBuffer;

  try {
    fileBytes = await data.file.arrayBuffer();
  } catch (error) {
    logUploadError(requestId, "file_validation", error);
    return uploadErrorResponse(
      "file_validation",
      "Nao foi possivel preparar o PDF para envio.",
      400,
    );
  }

  logUploadStage(requestId, "storage_upload", "Uploading PDF to Storage.", {
    bucket,
    contentType: data.file.type || "application/pdf",
    fileSizeBytes: data.file.size,
    storagePathSegments: storagePath.split("/").length,
  });
  const storageResult = await uploadPrivateObject({
    supabaseUrl,
    serviceRoleKey,
    bucket,
    path: storagePath,
    fileBytes,
    contentType: data.file.type || "application/pdf",
  });

  if (!storageResult.ok) {
    logUploadStage(requestId, "storage_upload", "Storage upload failed.", {
      bucket,
      errorCode: storageResult.errorCode,
      errorName: storageResult.errorName,
      storageStatus: storageResult.status,
    });
    return uploadErrorResponse("storage_upload", storageResult.error, 502);
  }

  logUploadStage(requestId, "storage_upload", "Storage upload completed.", {
    bucket,
  });

  let databaseStage: UploadStage = "technical_document_create";

  try {
    const result = await prisma.$transaction(async (tx) => {
      databaseStage = "technical_document_create";
      logUploadStage(
        requestId,
        "technical_document_create",
        "Creating TechnicalDocument.",
        {
          documentType: data.documentType,
          state: data.state,
        },
      );
      const document = await tx.technicalDocument.create({
        data: {
          scope: DocumentScope.GLOBAL,
          title: data.title,
          slug: `${documentSlug}-${randomUUID().slice(0, 8)}`,
          description: data.description,
          concessionaire: data.concessionaire,
          stateCodes: [data.state],
          documentType: data.documentType,
          status: DocumentStatus.DRAFT,
          tags: data.tags,
          metadata: {
            uploadStage: "uploaded",
            temporaryGlobalDocument: true,
            publicationDate: data.publishedAt?.toISOString() ?? null,
          },
        },
        select: {
          id: true,
          title: true,
        },
      });
      logUploadStage(
        requestId,
        "technical_document_create",
        "TechnicalDocument created.",
        {
          documentId: document.id,
        },
      );

      databaseStage = "document_version_create";
      logUploadStage(
        requestId,
        "document_version_create",
        "Creating DocumentVersion.",
        {
          documentId: document.id,
          bucket,
        },
      );
      const version = await tx.documentVersion.create({
        data: {
          documentId: document.id,
          versionLabel: data.versionLabel,
          sourceFileName: data.file.name,
          storagePath,
          status: VersionStatus.DRAFT,
          processingStatus: ProcessingStatus.PENDING,
          publishedAt: data.publishedAt,
          metadata: {
            storageBucket: bucket,
            storagePath,
            originalFileName: data.file.name,
            mimeType: data.file.type || "application/pdf",
            fileSizeBytes: data.file.size,
            uploadedBy: "temporary-global-upload",
          },
        },
        select: {
          id: true,
        },
      });
      logUploadStage(
        requestId,
        "document_version_create",
        "DocumentVersion created.",
        {
          documentId: document.id,
          versionId: version.id,
        },
      );

      return {
        document,
        version,
      };
    });

    logUploadStage(requestId, "document_version_create", "Upload completed.", {
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
    logUploadError(requestId, databaseStage, error);
    logUploadStage(requestId, "storage_cleanup", "Removing orphan Storage object.", {
      bucket,
    });
    await removePrivateObject({
      supabaseUrl,
      serviceRoleKey,
      bucket,
      path: storagePath,
    });

    return uploadErrorResponse(
      databaseStage,
      buildDatabaseErrorMessage(error),
      500,
    );
  }
}

function validateUploadForm(formData: FormData): ValidationResult {
  const title = readRequiredString(formData, "title");
  const concessionaire = readRequiredString(formData, "concessionaire");
  const state = readRequiredString(formData, "state");
  const documentType = readRequiredString(formData, "documentType");
  const versionLabel = readRequiredString(formData, "versionLabel");
  const description = readOptionalString(formData, "description");
  const publishedAt = readOptionalDate(formData, "publishedAt");
  const tags = parseTags(readOptionalString(formData, "tags"));
  const file = formData.get("file");

  if (!title) {
    return { ok: false, error: "Informe o titulo da norma.", status: 400 };
  }

  if (!concessionaire) {
    return { ok: false, error: "Informe a concessionaria.", status: 400 };
  }

  if (
    !state ||
    !BRAZILIAN_STATES.includes(state as (typeof BRAZILIAN_STATES)[number])
  ) {
    return { ok: false, error: "Informe um estado valido.", status: 400 };
  }

  if (!isTechnicalDocumentType(documentType)) {
    return {
      ok: false,
      error: "Informe um tipo de documento valido.",
      status: 400,
    };
  }

  if (!versionLabel) {
    return { ok: false, error: "Informe a versao.", status: 400 };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione um arquivo PDF.", status: 400 };
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return { ok: false, error: "Envie somente arquivos PDF.", status: 400 };
  }

  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return { ok: false, error: "O PDF deve ter no maximo 50 MB.", status: 413 };
  }

  return {
    ok: true,
    data: {
      title,
      concessionaire,
      state,
      documentType,
      versionLabel,
      publishedAt,
      description,
      tags,
      file,
    },
  };
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function readOptionalString(formData: FormData, key: string) {
  const value = readRequiredString(formData, key);
  return value || undefined;
}

function readOptionalDate(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);

  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseTags(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function isTechnicalDocumentType(value: string): value is TechnicalDocumentType {
  return Object.values(TechnicalDocumentType).includes(
    value as TechnicalDocumentType,
  );
}

function buildSlug(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "documento"
  );
}

function buildStoragePath(documentSlug: string, fileName: string) {
  const safeFileName = sanitizeFileName(fileName);
  const year = new Date().getUTCFullYear();
  return `global/${year}/${documentSlug}/${randomUUID()}-${safeFileName}`;
}

function sanitizeFileName(fileName: string) {
  const fallback = "documento.pdf";
  const normalized = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);

  return normalized.toLowerCase().endsWith(".pdf")
    ? normalized || fallback
    : `${normalized || "documento"}.pdf`;
}

async function uploadPrivateObject({
  supabaseUrl,
  serviceRoleKey,
  bucket,
  path,
  fileBytes,
  contentType,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
  path: string;
  fileBytes: ArrayBuffer;
  contentType: string;
}) {
  let response: Response;

  try {
    response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${path}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "cache-control": "3600",
          "content-type": contentType,
          "x-upsert": "false",
        },
        body: fileBytes,
      },
    );
  } catch (error) {
    const safeError = getSafeErrorDetails(error);
    return {
      ok: false as const,
      error: buildStorageConnectionErrorMessage(safeError),
      errorCode: safeError.code,
      errorName: safeError.name,
    };
  }

  if (!response.ok) {
    return {
      ok: false as const,
      error: "Nao foi possivel enviar o PDF para o Storage.",
      status: response.status,
    };
  }

  return { ok: true as const };
}

function buildStorageConnectionErrorMessage(error: SafeErrorDetails) {
  if (error.code === "ENOTFOUND") {
    return "Nao foi possivel resolver o host do Supabase Storage. Confira se SUPABASE_URL usa o PROJECT_REF correto.";
  }

  if (error.code === "ETIMEDOUT" || error.code === "ECONNRESET") {
    return "Nao foi possivel conectar ao Supabase Storage. Verifique sua rede e tente novamente.";
  }

  return "Nao foi possivel conectar ao Supabase Storage. Confira SUPABASE_URL e a conectividade da rede.";
}

function buildDatabaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Tenant or user not found")) {
    return "PDF enviado, mas o banco recusou o tenant/usuario. Confira se DATABASE_URL usa o PROJECT_REF correto no usuario postgres.PROJECT_REF.";
  }

  return "PDF enviado, mas o cadastro no banco falhou.";
}

type SafeErrorDetails = {
  code?: string;
  name?: string;
};

function getSafeErrorDetails(error: unknown): SafeErrorDetails {
  if (!(error instanceof Error)) {
    return { name: typeof error };
  }

  const errorWithCause = error as Error & {
    code?: string;
    cause?: {
      code?: string;
      name?: string;
    };
  };

  return {
    code: errorWithCause.cause?.code ?? errorWithCause.code,
    name: errorWithCause.cause?.name ?? error.name,
  };
}

function isValidSupabaseProjectUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /^[a-z0-9]+\.supabase\.co$/.test(url.hostname)
    );
  } catch {
    return false;
  }
}

function uploadErrorResponse(
  stage: UploadStage,
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      stage,
      message,
      error: message,
    },
    { status },
  );
}

function logUploadStage(
  requestId: string,
  stage: UploadStage,
  message: string,
  details?: Record<string, unknown>,
) {
  console.info("[documents/upload]", {
    requestId,
    stage,
    message,
    ...details,
  });
}

function logUploadError(
  requestId: string,
  stage: UploadStage,
  error: unknown,
) {
  console.error("[documents/upload]", {
    requestId,
    stage,
    message: error instanceof Error ? error.message : "Unknown error",
    errorName: error instanceof Error ? error.name : typeof error,
  });
}

async function removePrivateObject({
  supabaseUrl,
  serviceRoleKey,
  bucket,
  path,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
  path: string;
}) {
  await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/remove`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ prefixes: [path] }),
    },
  ).catch(() => undefined);
}
