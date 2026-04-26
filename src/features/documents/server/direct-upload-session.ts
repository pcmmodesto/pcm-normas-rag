import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import {
  BRAZILIAN_STATES,
  DEFAULT_DOCUMENTS_BUCKET,
  DOCUMENTS_BUCKET_ENV,
  MAX_DOCUMENT_UPLOAD_BYTES,
} from "@/features/documents/lib/upload-constants";

const TECHNICAL_DOCUMENT_TYPES = [
  "TECHNICAL_STANDARD",
  "CONNECTION_STANDARD",
  "PROCEDURE",
  "MANUAL",
  "RESOLUTION",
  "OTHER",
] as const;

export type TechnicalDocumentTypeValue =
  (typeof TECHNICAL_DOCUMENT_TYPES)[number];

export type DirectUploadMetadata = {
  title: string;
  concessionaire: string;
  state: string;
  documentType: TechnicalDocumentTypeValue;
  versionLabel: string;
  publishedAt?: string;
  description?: string;
  tags: string[];
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
};

export type DirectUploadSessionPayload = {
  id: string;
  exp: number;
  bucket: string;
  storagePath: string;
  metadata: DirectUploadMetadata;
};

export type DirectUploadValidationResult =
  | { ok: true; metadata: DirectUploadMetadata }
  | { ok: false; message: string; status: number };

export function validateDirectUploadMetadata(
  input: unknown,
): DirectUploadValidationResult {
  const value = isRecord(input) ? input : {};
  const title = readString(value.title);
  const concessionaire = readString(value.concessionaire);
  const state = readString(value.state);
  const documentType = readString(value.documentType);
  const versionLabel = readString(value.versionLabel);
  const description = readOptionalString(value.description);
  const publishedAt = readOptionalString(value.publishedAt);
  const tags = parseTags(readOptionalString(value.tags));
  const fileName = readString(value.fileName);
  const fileSizeBytes = Number(value.fileSizeBytes);
  const mimeType = readString(value.mimeType) || "application/pdf";

  if (!title) return { ok: false, message: "Informe o titulo da norma.", status: 400 };
  if (!concessionaire) {
    return { ok: false, message: "Informe a concessionaria.", status: 400 };
  }
  if (
    !state ||
    !BRAZILIAN_STATES.includes(state as (typeof BRAZILIAN_STATES)[number])
  ) {
    return { ok: false, message: "Informe um estado valido.", status: 400 };
  }
  if (!isTechnicalDocumentType(documentType)) {
    return { ok: false, message: "Informe um tipo de documento valido.", status: 400 };
  }
  if (!versionLabel) return { ok: false, message: "Informe a versao.", status: 400 };
  if (!fileName) return { ok: false, message: "Selecione um arquivo PDF.", status: 400 };
  if (mimeType !== "application/pdf" && !fileName.toLowerCase().endsWith(".pdf")) {
    return { ok: false, message: "Envie somente arquivos PDF.", status: 400 };
  }
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return { ok: false, message: "Arquivo PDF invalido.", status: 400 };
  }
  if (fileSizeBytes > MAX_DOCUMENT_UPLOAD_BYTES) {
    return { ok: false, message: "O PDF deve ter no maximo 50 MB.", status: 413 };
  }

  return {
    ok: true,
    metadata: {
      title,
      concessionaire,
      state,
      documentType,
      versionLabel,
      publishedAt,
      description,
      tags,
      fileName,
      fileSizeBytes,
      mimeType,
    },
  };
}

export function getDocumentsBucket() {
  return process.env[DOCUMENTS_BUCKET_ENV]?.trim() || DEFAULT_DOCUMENTS_BUCKET;
}

export function buildDocumentSlug(value: string) {
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

export function buildDocumentStoragePath(title: string, fileName: string) {
  const documentSlug = buildDocumentSlug(title);
  const safeFileName = sanitizeFileName(fileName);
  const year = new Date().getUTCFullYear();
  return `global/${year}/${documentSlug}/${randomUUID()}-${safeFileName}`;
}

export function createDirectUploadSession(
  payload: DirectUploadSessionPayload,
) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export function verifyDirectUploadSession(
  session: string,
): DirectUploadSessionPayload | null {
  const [encoded, signature] = session.split(".");

  if (!encoded || !signature) return null;

  const expected = signPayload(encoded);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as DirectUploadSessionPayload;

    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function signPayload(payload: string) {
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.DATABASE_URL ??
    "pcm-normas-rag-upload-session";

  return createHmac("sha256", secret).update(payload).digest("base64url");
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

function parseTags(value: string | undefined) {
  if (!value) return [];

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function isTechnicalDocumentType(
  value: string,
): value is TechnicalDocumentTypeValue {
  return TECHNICAL_DOCUMENT_TYPES.includes(value as TechnicalDocumentTypeValue);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
  const text = readString(value);
  return text || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
