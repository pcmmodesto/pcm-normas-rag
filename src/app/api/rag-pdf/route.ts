import { NextResponse } from "next/server";
import { buildRagPdfPayload } from "@/features/rag-pdf/lib/build-payload";
import { generateRagPdf } from "@/features/rag-pdf/lib/generate-pdf";
import type { RagPdfKind, RagPdfSource } from "@/features/rag-pdf/lib/types";

type RequestBody = {
  question?: string;
  answer?: string;
  kind?: RagPdfKind;
  sources?: RagPdfSource[];
  companyName?: string;
  documentTitle?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = parseRequestBody(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.question !== "string" ||
    typeof body.answer !== "string" ||
    !body.kind
  ) {
    return NextResponse.json(
      { error: "question, answer and kind are required" },
      { status: 400 },
    );
  }

  if (body.kind !== "technical" && body.kind !== "client") {
    return NextResponse.json({ error: "invalid PDF kind" }, { status: 400 });
  }

  const payload = buildRagPdfPayload({
    question: sanitizeText(body.question, 800),
    answer: sanitizeText(body.answer, 8000),
    kind: body.kind,
    sources: sanitizeSources(Array.isArray(body.sources) ? body.sources : []),
    companyName: sanitizeOptionalText(readOptionalString(body.companyName), 160),
    documentTitle: sanitizeOptionalText(
      readOptionalString(body.documentTitle),
      240,
    ),
  });

  const result = await generateRagPdf(payload);

  return NextResponse.json(result);
}

function parseRequestBody(value: unknown): RequestBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Body must be an object.");
  }

  return value as RequestBody;
}

function sanitizeSources(sources: RagPdfSource[]): RagPdfSource[] {
  return sources
    .filter((source) => source && typeof source === "object")
    .slice(0, 12)
    .map((source) => ({
      documentTitle: sanitizeText(source.documentTitle, 240),
      pageNumber: sanitizePageNumber(source.pageNumber),
      excerpt: sanitizeText(source.excerpt, 1200),
      normativeItem: sanitizeOptionalText(source.normativeItem, 120),
      chunkIndex:
        typeof source.chunkIndex === "number" && Number.isFinite(source.chunkIndex)
          ? Math.max(0, Math.trunc(source.chunkIndex))
          : undefined,
      relevanceScore:
        typeof source.relevanceScore === "number" &&
        Number.isFinite(source.relevanceScore)
          ? source.relevanceScore
          : undefined,
    }));
}

function sanitizePageNumber(pageNumber: number) {
  if (!Number.isFinite(pageNumber)) {
    return 1;
  }

  return Math.max(1, Math.trunc(pageNumber));
}

function sanitizeText(value: string, maxLength: number) {
  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeOptionalText(value: string | undefined, maxLength: number) {
  if (!value) {
    return undefined;
  }

  const sanitized = sanitizeText(value, maxLength);
  return sanitized || undefined;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
