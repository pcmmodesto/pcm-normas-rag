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
  const body = (await request.json()) as RequestBody;

  if (!body.question || !body.answer || !body.kind) {
    return NextResponse.json(
      { error: "question, answer and kind are required" },
      { status: 400 },
    );
  }

  if (body.kind !== "technical" && body.kind !== "client") {
    return NextResponse.json({ error: "invalid PDF kind" }, { status: 400 });
  }

  const payload = buildRagPdfPayload({
    question: body.question,
    answer: body.answer,
    kind: body.kind,
    sources: body.sources ?? [],
    companyName: body.companyName,
    documentTitle: body.documentTitle,
    metadata: body.metadata,
  });

  const result = await generateRagPdf(payload);

  return NextResponse.json(result);
}

