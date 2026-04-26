import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  classifyTechnicalIntent,
  extractKeywords,
  INTENT_LABELS,
  INTENT_REQUIRED_TERMS,
  MIN_SCORE_BY_INTENT,
} from "@/features/rag/search/intent-classifier";
import { scoreChunkDetailed } from "@/features/rag/search/chunk-scorer";

export const runtime = "nodejs";

type ChunkRow = {
  chunk_id: string;
  chunk_text: string;
  page_number: number;
  chunk_index: number;
  document_title: string;
  version_label: string;
  concessionaire: string | null;
  state_codes: string[] | null;
  document_type: string;
};

type ScoredChunk = ChunkRow & {
  score: number;
  reasons: string[];
  rejected: boolean;
  rejectionReason?: string;
};

export async function POST(request: Request) {
  let question: string;
  let debug: boolean;

  try {
    const body = (await request.json()) as { question?: unknown; debug?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
    debug = body.debug === true;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON invalido." }, { status: 400 });
  }

  if (!question || question.length < 3) {
    return NextResponse.json({ ok: false, message: "Pergunta muito curta." }, { status: 400 });
  }

  const intent = classifyTechnicalIntent(question);
  const keywords = extractKeywords(question);
  const requiredTerms = INTENT_REQUIRED_TERMS[intent];

  // Combine keywords with required terms for broader candidate retrieval
  const searchTerms = Array.from(new Set([...keywords, ...requiredTerms])).slice(0, 14);

  if (searchTerms.length === 0) {
    return NextResponse.json({
      ok: true,
      insufficient: true,
      intent,
      intentLabel: INTENT_LABELS[intent],
      termsSearched: [],
      answer: buildInsufficientAnswer([]),
      sources: [],
    });
  }

  const candidates = await fetchCandidates(searchTerms);

  const scored: ScoredChunk[] = candidates.map((chunk) => {
    const detail = scoreChunkDetailed(chunk.chunk_text, intent, keywords, question);
    return { ...chunk, ...detail };
  });

  const minScore = MIN_SCORE_BY_INTENT[intent];
  const passing = scored
    .filter((c) => !c.rejected && c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (passing.length === 0) {
    return NextResponse.json({
      ok: true,
      insufficient: true,
      intent,
      intentLabel: INTENT_LABELS[intent],
      termsSearched: searchTerms,
      answer: buildInsufficientAnswer(searchTerms),
      sources: [],
      ...(debug ? { debugInfo: buildDebugInfo(intent, keywords, requiredTerms, searchTerms, scored) } : {}),
    });
  }

  return NextResponse.json({
    ok: true,
    insufficient: false,
    intent,
    intentLabel: INTENT_LABELS[intent],
    termsSearched: searchTerms,
    answer: buildAnswer(question, intent, passing),
    sources: passing.map((c) => ({
      documentTitle: c.document_title,
      versionLabel: c.version_label,
      pageNumber: c.page_number,
      chunkIndex: c.chunk_index,
      excerpt: c.chunk_text.slice(0, 500),
      concessionaire: c.concessionaire,
      stateCodes: c.state_codes ?? [],
      documentType: c.document_type,
      score: c.score,
    })),
    ...(debug ? { debugInfo: buildDebugInfo(intent, keywords, requiredTerms, searchTerms, scored) } : {}),
  });
}

async function fetchCandidates(searchTerms: string[]): Promise<ChunkRow[]> {
  const conditions = Prisma.join(
    searchTerms.map((k) => Prisma.sql`lower(dc.text) like ${`%${k}%`}`),
    " or ",
  );

  try {
    return await prisma.$queryRaw<ChunkRow[]>(Prisma.sql`
      select
        dc.id          as chunk_id,
        dc.text        as chunk_text,
        dc.page_number,
        dc.chunk_index,
        td.title       as document_title,
        dv.version_label,
        td.concessionaire,
        td.state_codes,
        td.document_type
      from document_chunks dc
      join document_versions dv on dv.id = dc.document_version_id
      join technical_documents td on td.id = dv.document_id
      where dv.processing_status = 'READY'
        and (${conditions})
      order by dc.page_number asc
      limit 30
    `);
  } catch {
    return [];
  }
}

function buildAnswer(question: string, intent: ReturnType<typeof classifyTechnicalIntent>, chunks: ScoredChunk[]): string {
  void question;
  const sources = [...new Set(chunks.map((c) => c.document_title))];
  const lines: string[] = [
    `Resposta tecnica — ${INTENT_LABELS[intent]}:`,
    "",
    "Com base nos documentos normativos indexados, os seguintes trechos sao tecnicamente relevantes para sua consulta:",
    "",
  ];

  for (const chunk of chunks) {
    lines.push(
      `[${chunk.document_title} | ${chunk.version_label} | Pag. ${chunk.page_number}]`,
    );
    lines.push(chunk.chunk_text.slice(0, 500));
    lines.push("");
  }

  lines.push(`Fontes normativas: ${sources.join("; ")}.`);
  lines.push("");
  lines.push(
    "Esta resposta e baseada exclusivamente nos documentos indexados na base normativa. Para analise tecnica completa, consulte os documentos originais.",
  );

  return lines.join("\n");
}

function buildInsufficientAnswer(terms: string[]): string {
  const lines: string[] = [
    "Base normativa insuficiente.",
    "",
    "Nao foram encontrados trechos tecnicamente relevantes para esta consulta na base de documentos indexados.",
  ];

  if (terms.length > 0) {
    lines.push("");
    lines.push(`Termos pesquisados: ${terms.join(", ")}.`);
  }

  lines.push("");
  lines.push(
    "Sugestoes: reformule a pergunta com termos mais especificos (ex.: bitola, ramal de entrada, padrao de entrada, mm², kVA). Verifique se os documentos normativos relevantes ja foram processados na base.",
  );

  return lines.join("\n");
}

function buildDebugInfo(
  intent: ReturnType<typeof classifyTechnicalIntent>,
  keywords: string[],
  requiredTerms: string[],
  searchTerms: string[],
  scored: ScoredChunk[],
) {
  return {
    intent,
    intentLabel: INTENT_LABELS[intent],
    keywords,
    requiredTerms,
    searchTerms,
    minScore: MIN_SCORE_BY_INTENT[intent],
    candidateCount: scored.length,
    candidates: scored.map((c) => ({
      chunkId: c.chunk_id,
      documentTitle: c.document_title,
      pageNumber: c.page_number,
      score: c.score,
      reasons: c.reasons,
      rejected: c.rejected,
      rejectionReason: c.rejectionReason,
      textPreview: c.chunk_text.slice(0, 200),
    })),
  };
}
