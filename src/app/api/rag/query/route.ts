import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUDIENCE_LABELS,
  classifyQueryAudience,
  classifyTechnicalIntent,
  detectMissingContext,
  extractKeywords,
  INTENT_LABELS,
  INTENT_REQUIRED_TERMS,
  LEIGO_PRIORITY_TERMS,
  MIN_SCORE_BY_INTENT,
} from "@/features/rag/search/intent-classifier";
import { scoreChunkDetailed, scoreChunkForLeigo } from "@/features/rag/search/chunk-scorer";
import { buildStructuredAnswer } from "@/features/rag/search/answer-builder";
import { classifyQuestion } from "@/features/rag/lib/classify-question";

export const runtime = "nodejs";

const MIN_SCORE_LEIGO = 20;

// Chunk types that get a score bonus in technical queries
const TABLE_CHUNK_TYPES = new Set(["TABLE", "TABLE_ROW", "NORMATIVE_TABLE"]);
const HIGH_VALUE_CHUNK_TYPES = new Set([
  "REQUIREMENT",
  "PROCEDURE",
  "TABLE",
  "TABLE_ROW",
  "NORMATIVE_TABLE",
  "NORMATIVE_DRAWING",
  "NORMATIVE_NOTE",
]);

type ChunkRow = {
  chunk_id: string;
  chunk_text: string;
  page_number: number;
  chunk_index: number;
  chunk_type: string;
  section_number: string | null;
  section_title: string | null;
  table_number: string | null;
  table_title: string | null;
  page_type: string | null;
  technical_intent: string | null;
  topic: string | null;
  source_quality: string | null;
  is_table: boolean;
  is_figure: boolean;
  is_summary: boolean;
  is_cover: boolean;
  is_definition: boolean;
  is_requirement: boolean;
  is_procedure: boolean;
  is_sizing_criteria: boolean;
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

  const audience = classifyQueryAudience(question);
  const intent = classifyTechnicalIntent(question);
  const productClassification = classifyQuestion(question);
  const missingContext = detectMissingContext(question, audience);
  const keywords = extractKeywords(question);

  const isLeigo = audience === "LEIGO_ATENDIMENTO" || audience === "NORMA_REFERENCIA";

  const extraTerms = isLeigo
    ? LEIGO_PRIORITY_TERMS.slice(0, 8)
    : INTENT_REQUIRED_TERMS[intent];
  const searchTerms = Array.from(new Set([...keywords, ...extraTerms])).slice(0, 14);

  const candidates = await fetchCandidates(searchTerms);

  const scored: ScoredChunk[] = candidates.map((chunk) => {
    const detail = isLeigo
      ? scoreChunkForLeigo(chunk.chunk_text, keywords, question)
      : scoreChunkDetailed(chunk.chunk_text, intent, keywords, question);

    // Bonus for structured table chunks in technical queries
    if (!isLeigo && !detail.rejected && TABLE_CHUNK_TYPES.has(chunk.chunk_type)) {
      detail.score += 25;
      detail.reasons.push("+25: chunk de tabela estruturada");
    }

    applyStructuredChunkScore(detail, chunk, isLeigo);

    return { ...chunk, ...detail };
  });

  const minScore = isLeigo ? MIN_SCORE_LEIGO : MIN_SCORE_BY_INTENT[intent];
  const passing = scored
    .filter((c) => !c.rejected && c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const isSufficient = passing.length > 0;

  const { answerType, confidence, answer, normativeSummary } = buildStructuredAnswer({
    audience,
    intent,
    question,
    chunks: passing.map((c) => ({
      documentTitle: c.document_title,
      versionLabel: c.version_label,
      pageNumber: c.page_number,
      chunkText: c.chunk_text,
      score: c.score,
    })),
    isSufficient,
    missingContext,
  });

  const sources = passing.map((c) => ({
    documentTitle: c.document_title,
    versionLabel: c.version_label,
    pageNumber: c.page_number,
    chunkIndex: c.chunk_index,
    chunkType: c.chunk_type,
    pageType: c.page_type,
    technicalIntent: c.technical_intent,
    topic: c.topic,
    sourceQuality: c.source_quality,
    flags: {
      isTable: c.is_table,
      isFigure: c.is_figure,
      isSummary: c.is_summary,
      isCover: c.is_cover,
      isDefinition: c.is_definition,
      isRequirement: c.is_requirement,
      isProcedure: c.is_procedure,
      isSizingCriteria: c.is_sizing_criteria,
    },
    sectionNumber: c.section_number,
    sectionTitle: c.section_title,
    tableNumber: c.table_number,
    tableTitle: c.table_title,
    excerpt: c.chunk_text
      .replace(/NORMA T[EÉ]CNICA[\s\S]*?DOCUMENTO N[AÃ]O CONTROLADO\s*/g, "")
      .trim()
      .slice(0, 500),
    concessionaire: c.concessionaire,
    stateCodes: c.state_codes ?? [],
    documentType: c.document_type,
    score: c.score,
  }));

  return NextResponse.json({
    ok: true,
    intent,
    intentLabel: INTENT_LABELS[intent],
    audience,
    audienceLabel: AUDIENCE_LABELS[audience],
    classification: productClassification,
    answerType,
    confidence,
    isSufficient,
    answer,
    normativeSummary,
    missingContext,
    termsSearched: searchTerms,
    sources,
    ...(debug
      ? {
          debugInfo: {
            intent,
            intentLabel: INTENT_LABELS[intent],
            audience,
            audienceLabel: AUDIENCE_LABELS[audience],
            keywords,
            searchTerms,
            minScore,
            candidateCount: scored.length,
            candidates: scored.map((c) => ({
              chunkId: c.chunk_id,
              documentTitle: c.document_title,
              pageNumber: c.page_number,
              chunkType: c.chunk_type,
              pageType: c.page_type,
              technicalIntent: c.technical_intent,
              topic: c.topic,
              sourceQuality: c.source_quality,
              sectionNumber: c.section_number,
              sectionTitle: c.section_title,
              tableNumber: c.table_number,
              flags: {
                isTable: c.is_table,
                isFigure: c.is_figure,
                isSummary: c.is_summary,
                isCover: c.is_cover,
                isDefinition: c.is_definition,
                isRequirement: c.is_requirement,
                isProcedure: c.is_procedure,
                isSizingCriteria: c.is_sizing_criteria,
              },
              score: c.score,
              reasons: c.reasons,
              rejected: c.rejected,
              rejectionReason: c.rejectionReason,
              textPreview: c.chunk_text.slice(0, 200),
            })),
          },
        }
      : {}),
  });
}

async function fetchCandidates(searchTerms: string[]): Promise<ChunkRow[]> {
  if (searchTerms.length === 0) return [];

  // Search against search_text (enriched with doc context) falling back to raw text
  const conditions = Prisma.join(
    searchTerms.map(
      (k) => Prisma.sql`lower(coalesce(dc.search_text, dc.text)) like ${`%${k}%`}`,
    ),
    " or ",
  );

  try {
    return await prisma.$queryRaw<ChunkRow[]>(Prisma.sql`
      select
        dc.id            as chunk_id,
        dc.text          as chunk_text,
        dc.page_number,
        dc.chunk_index,
        dc.chunk_type,
        dc.section_number,
        dc.section_title,
        dc.table_number,
        dc.table_title,
        dc.page_type,
        dc.technical_intent,
        dc.topic,
        dc.source_quality,
        dc.is_table,
        dc.is_figure,
        dc.is_summary,
        dc.is_cover,
        dc.is_definition,
        dc.is_requirement,
        dc.is_procedure,
        dc.is_sizing_criteria,
        td.title         as document_title,
        dv.version_label,
        td.concessionaire,
        td.state_codes,
        td.document_type
      from document_chunks dc
      join document_versions dv on dv.id = dc.document_version_id
      join technical_documents td on td.id = dv.document_id
      where dv.processing_status = 'READY'
        and dc.is_low_value = FALSE
        and dc.is_searchable = TRUE
        and (${conditions})
      order by dc.page_number asc
      limit 30
    `);
  } catch {
    return [];
  }
}

function applyStructuredChunkScore(
  detail: {
    score: number;
    reasons: string[];
    rejected: boolean;
    rejectionReason?: string;
  },
  chunk: ChunkRow,
  isLeigo: boolean,
) {
  if (detail.rejected) return;

  if (chunk.is_cover || chunk.is_summary || chunk.chunk_type === "SUMMARY") {
    detail.score -= 80;
    detail.reasons.push("-80: capa/sumario/indice");

    if (!isLeigo) {
      detail.rejected = true;
      detail.rejectionReason = "Chunk de capa/sumario nao deve responder consulta tecnica.";
    }

    return;
  }

  if (chunk.chunk_type === "ADMINISTRATIVE" || chunk.source_quality === "LOW") {
    detail.score -= 45;
    detail.reasons.push("-45: chunk administrativo ou baixa qualidade");
  }

  if (!isLeigo && HIGH_VALUE_CHUNK_TYPES.has(chunk.chunk_type)) {
    detail.score += 25;
    detail.reasons.push("+25: tipo de chunk normativo de alto valor");
  }

  if (!isLeigo && chunk.is_requirement) {
    detail.score += 20;
    detail.reasons.push("+20: requisito normativo detectado");
  }

  if (!isLeigo && chunk.is_sizing_criteria) {
    detail.score += 25;
    detail.reasons.push("+25: criterio de dimensionamento detectado");
  }

  if (!isLeigo && chunk.is_figure) {
    detail.score += 15;
    detail.reasons.push("+15: desenho/figura tecnica");
  }

  if (!isLeigo && chunk.technical_intent) {
    detail.score += 10;
    detail.reasons.push(`+10: intencao tecnica ${chunk.technical_intent}`);
  }
}
