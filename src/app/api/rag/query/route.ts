import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import {
  AUDIENCE_LABELS,
  buildExpandedSearchTerms,
  classifyQueryAudience,
  classifyTechnicalIntents,
  detectDimensioningMissingContext,
  detectMissingContext,
  extractKeywords,
  extractTechnicalEntities,
  INTENT_LABELS,
  isTechnicalDimensioningIntent,
  MIN_SCORE_BY_INTENT,
  type QueryAudience,
  type TechnicalIntent,
} from "@/features/rag/search/intent-classifier";
import { scoreChunkDetailed, scoreChunkForLeigo } from "@/features/rag/search/chunk-scorer";
import { buildStructuredAnswer, type TechnicalResponseMode } from "@/features/rag/search/answer-builder";
import { lookupNormativeSizingTable } from "@/features/rag/search/normative-table-lookup";
import { classifyQuestion } from "@/features/rag/lib/classify-question";
import { extractLoadEntities } from "@/features/rag/technical/load-entity-extractor";
import { calculateInstalledLoad } from "@/features/rag/technical/load-calculator";
import { lookupServiceEntranceTable } from "@/features/rag/technical/normative-table-lookup";
import { countEmbeddedChunks, searchChunksByVector, type VectorSearchDebug } from "@/features/rag/retrieval/vector-search";

export const runtime = "nodejs";

const MIN_SCORE_LEIGO = 20;

// Chunk types that get a score bonus in technical queries
const TABLE_CHUNK_TYPES = new Set(["TABLE", "TABLE_ROW", "NORMATIVE_TABLE"]);
const STRONG_PAGE_TYPES = new Set([
  "TABLE",
  "TABLE_PAGE",
  "REQUIREMENT",
  "TECHNICAL_CONTENT",
  "DIMENSIONING_CRITERIA",
  "MIXED_TECHNICAL_PAGE",
  "TECHNICAL_DRAWING",
  "DRAWING_NOTE",
  "DRAWING_LEGEND_TABLE",
  "MATERIAL_TABLE",
  "RESPONSIBILITY_RULE",
  "DIMENSION_REQUIREMENT",
  "CONSOLIDATED_DRAWING_TOPIC",
]);
const STRONG_CHUNK_TYPES = new Set([
  "TABLE_TEXT",
  "TABLE",
  "TABLE_ROW",
  "NORMATIVE_TABLE",
  "REQUIREMENT",
  "DIMENSIONING_CRITERIA",
]);
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
  metadata: Prisma.JsonValue;
  embedding_model?: string | null;
  vector_score?: number | null;
  vector_distance?: number | null;
  textual_retrieval_score?: number | null;
};

type ScoredChunk = ChunkRow & {
  score: number;
  textualScore: number;
  technicalScore: number;
  penaltyScore: number;
  vectorScore: number;
  textualRetrievalScore: number;
  hybridScore: number;
  reasons: string[];
  rejected: boolean;
  rejectionReason?: string;
  sourceRole?: "MAIN" | "AUXILIARY" | "REJECTED";
  retrievalSource?: "VECTOR" | "TEXT" | "HYBRID";
};

function detectTechnicalResponseMode(loadEntities: ReturnType<typeof extractLoadEntities>): TechnicalResponseMode {
  if (loadEntities.hasServiceRequest && !loadEntities.hasEquipmentList && !loadEntities.informedLoad) {
    return "STANDARD_RAG";
  }

  if (loadEntities.informedLoad && loadEntities.hasDimensioningRequest) {
    return "ENGINEERING_DIMENSIONING";
  }

  if (loadEntities.hasEquipmentList) {
    return loadEntities.missingContext.length === 0 && loadEntities.hasDimensioningRequest
      ? "ENGINEERING_DIMENSIONING"
      : "LOAD_ESTIMATION";
  }

  return "STANDARD_RAG";
}

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

  const classifiedAudience = classifyQueryAudience(question);
  const { primary: intent, secondary: secondaryIntents } = classifyTechnicalIntents(question);
  const audience: QueryAudience = isTechnicalDimensioningIntent(intent, secondaryIntents)
    ? "TECNICO_DIMENSIONAMENTO"
    : classifiedAudience;
  const productClassification = classifyQuestion(question);
  const loadEntities = extractLoadEntities(question);
  const loadCalculation = calculateInstalledLoad(loadEntities);
  const responseMode = detectTechnicalResponseMode(loadEntities);
  const technicalEntities = extractTechnicalEntities(question);
  const missingContext = Array.from(
    new Set([
      ...detectMissingContext(question, audience),
      ...detectDimensioningMissingContext(question, [intent, ...secondaryIntents]),
    ]),
  );
  const keywords = extractKeywords(question);
  const structuredLookup =
    responseMode === "STANDARD_RAG"
      ? await lookupNormativeSizingTable(technicalEntities)
      : {
          mode: "TABLE_LOOKUP" as const,
          attempted: false,
          found: false,
          reason: "Consulta estruturada antiga ignorada por modo de carga/dimensionamento.",
          candidateRows: [],
        };
  const serviceEntranceLookup =
    responseMode === "ENGINEERING_DIMENSIONING"
      ? await lookupServiceEntranceTable({
          loadKw: loadCalculation.effectiveLoadKw,
          loadKva: loadCalculation.effectiveLoadKva,
          voltage: loadEntities.voltage,
          connectionType: loadEntities.connectionType,
          state: loadEntities.state,
          utility: loadEntities.state === "PA" ? "Equatorial" : null,
        })
      : undefined;

  const isLeigo =
    (audience === "LEIGO_ATENDIMENTO" || audience === "NORMA_REFERENCIA") &&
    !isTechnicalDimensioningIntent(intent, secondaryIntents);

  const expandedTerms = buildExpandedSearchTerms({
    question,
    keywords,
    primaryIntent: intent,
    secondaryIntents,
    audience,
  });
  const searchTerms = Array.from(
    new Set([...expandedTerms.map((t) => t.term), ...technicalEntities.terms.map((t) => t.toLowerCase())]),
  ).slice(0, 36);

  const shouldUseVector =
    !(responseMode === "ENGINEERING_DIMENSIONING" && serviceEntranceLookup?.status === "FOUND") &&
    !(responseMode === "STANDARD_RAG" && structuredLookup.found);
  const embeddedChunkCountWhenSkipped = shouldUseVector ? 0 : await countEmbeddedChunks().catch(() => 0);
  const vectorSearch = shouldUseVector
    ? await searchChunksByVector({
        question,
        filters: {
          uf: technicalEntities.state ?? loadEntities.state,
          concessionaria: technicalEntities.probableConcessionaire,
          technicalIntent: null,
        },
        limit: 50,
      })
    : {
        results: [],
        debug: {
          used: false,
          fallbackTextual: true,
          embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
          embeddedChunkCount: embeddedChunkCountWhenSkipped,
        } satisfies VectorSearchDebug,
      };
  const textualCandidates = await fetchCandidates(searchTerms);
  const candidates = mergeHybridCandidates(textualCandidates, vectorSearch.results);

  const scored: ScoredChunk[] = candidates.map((chunk) => {
    const detail = isLeigo
      ? scoreChunkForLeigo(chunk.chunk_text, keywords, question)
      : scoreChunkDetailed(chunk.chunk_text, intent, keywords, question, secondaryIntents);

    const vectorScore = Math.max(0, Math.round((chunk.vector_score ?? 0) * 100));
    const textualRetrievalScore = chunk.textual_retrieval_score ?? (chunk.vector_score ? 0 : 100);
    if (!detail.rejected && vectorScore > 0) {
      const vectorBonus = Math.min(80, Math.max(10, Math.round(vectorScore * 0.65)));
      detail.score += vectorBonus;
      detail.technicalScore += vectorBonus;
      detail.reasons.push(`+${vectorBonus}: similaridade vetorial ${vectorScore}`);
    }

    // Bonus for structured table chunks in technical queries
    if (!isLeigo && !detail.rejected && TABLE_CHUNK_TYPES.has(chunk.chunk_type)) {
      detail.score += 25;
      detail.technicalScore += 25;
      detail.reasons.push("+25: chunk de tabela estruturada");
    }

    applyStructuredChunkScore(detail, chunk, isLeigo, intent, secondaryIntents, question);

    return {
      ...chunk,
      ...detail,
      vectorScore,
      textualRetrievalScore,
      hybridScore: detail.score,
      retrievalSource: chunk.vector_score && chunk.textual_retrieval_score
        ? "HYBRID"
        : chunk.vector_score
          ? "VECTOR"
          : "TEXT",
    };
  });

  const minScore = isLeigo ? MIN_SCORE_LEIGO : MIN_SCORE_BY_INTENT[intent];
  const passingAll = scored
    .filter((c) => !c.rejected && c.score >= minScore)
    .sort((a, b) => b.score - a.score);
  const mainPassing = passingAll.filter((c) => !isAuxiliaryChunk(c));
  const hasStrongTechnicalSource = isLeigo
    ? true
    : mainPassing.some((c) => isStrongTechnicalSource(c));
  const requiresStrongSource = requiresStrongTechnicalSource(intent, secondaryIntents);
  const passing = (requiresStrongSource ? mainPassing : passingAll).slice(0, 3);

  const isSufficient =
    responseMode === "LOAD_ESTIMATION" ||
    serviceEntranceLookup?.status === "FOUND" ||
    structuredLookup.found ||
    (passing.length > 0 && (!requiresStrongSource || hasStrongTechnicalSource));
  const effectiveMissingContext =
    responseMode !== "STANDARD_RAG"
      ? loadEntities.missingContext
      : structuredLookup.found
        ? []
        : missingContext;

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
      metadata: c.metadata,
    })),
    isSufficient,
    missingContext: effectiveMissingContext,
    structuredLookup,
    responseMode,
    loadEntities,
    loadCalculation,
    serviceEntranceLookup,
  });

  const structuredSource = structuredLookup.found && structuredLookup.table && structuredLookup.selectedRow
    ? [{
        documentTitle: structuredLookup.table.documentTitle,
        versionLabel: structuredLookup.table.versionLabel,
        pageNumber: structuredLookup.table.pageNumber,
        chunkIndex: structuredLookup.selectedRow.rowIndex,
        chunkType: "NORMATIVE_TABLE_ROW",
        pageType: "TABLE",
        technicalIntent: "SERVICE_ENTRANCE_SIZING",
        topic: `Tabela ${structuredLookup.table.tableNumber} - ${structuredLookup.table.title}`,
        sourceQuality: "STRUCTURED_TABLE",
        flags: {
          isTable: true,
          isFigure: false,
          isSummary: false,
          isCover: false,
          isDefinition: false,
          isRequirement: true,
          isProcedure: false,
          isSizingCriteria: true,
        },
        sectionNumber: null,
        sectionTitle: null,
        tableNumber: structuredLookup.table.tableNumber,
        tableTitle: structuredLookup.table.title,
        excerpt: structuredLookup.selectedRow.rawText ?? structuredLookup.reason,
        concessionaire: structuredLookup.table.concessionaire,
        stateCodes: structuredLookup.table.state ? structuredLookup.table.state.split(",") : [],
        documentType: "NORMATIVE_TABLE",
        metadata: {
          mode: structuredLookup.mode,
          selectedRow: structuredLookup.selectedRow,
          kvaKwNotice: structuredLookup.kvaKwNotice,
          imageStoragePath: structuredLookup.table.imageStoragePath ?? null,
          validationStatus: structuredLookup.table.validationStatus ?? null,
        },
        score: 999,
      }]
    : [];
  const serviceEntranceSource = serviceEntranceLookup?.status === "FOUND" && serviceEntranceLookup.table && serviceEntranceLookup.row
    ? [{
        documentTitle: serviceEntranceLookup.table.documentTitle,
        versionLabel: serviceEntranceLookup.table.versionLabel,
        pageNumber: serviceEntranceLookup.table.pageNumber,
        chunkIndex: serviceEntranceLookup.row.rowIndex,
        chunkType: "NORMATIVE_TABLE_ROW",
        pageType: "TABLE",
        technicalIntent: "ENGINEERING_DIMENSIONING",
        topic: `Tabela ${serviceEntranceLookup.table.tableNumber} - ${serviceEntranceLookup.table.title}`,
        sourceQuality: "STRUCTURED_TABLE",
        flags: {
          isTable: true,
          isFigure: false,
          isSummary: false,
          isCover: false,
          isDefinition: false,
          isRequirement: true,
          isProcedure: false,
          isSizingCriteria: true,
        },
        sectionNumber: null,
        sectionTitle: null,
        tableNumber: serviceEntranceLookup.table.tableNumber,
        tableTitle: serviceEntranceLookup.table.title,
        excerpt: serviceEntranceLookup.row.rawText ?? serviceEntranceLookup.reason,
        concessionaire: serviceEntranceLookup.table.concessionaire,
        stateCodes: serviceEntranceLookup.table.state ? serviceEntranceLookup.table.state.split(",") : [],
        documentType: "NORMATIVE_TABLE",
        metadata: {
          mode: "ENGINEERING_DIMENSIONING",
          selectedRow: serviceEntranceLookup.row,
          imageStoragePath: serviceEntranceLookup.table.imageStoragePath,
          validationStatus: serviceEntranceLookup.table.validationStatus,
        },
        score: 1000,
      }]
    : [];

  const chunkSources = passing.map((c) => ({
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
    metadata: c.metadata,
    score: c.score,
  }));

  const sourceRefs =
    responseMode === "LOAD_ESTIMATION"
      ? []
      : serviceEntranceSource.length > 0
        ? serviceEntranceSource
        : responseMode === "ENGINEERING_DIMENSIONING"
          ? []
          : [...structuredSource, ...chunkSources];

  const sources = await attachEvidenceUrls(sourceRefs);

  return NextResponse.json({
    ok: true,
    intent,
    intentLabel: INTENT_LABELS[intent],
    responseMode,
    audience,
    audienceLabel: AUDIENCE_LABELS[audience],
    classification: productClassification,
    answerType,
    confidence,
    isSufficient,
    answer,
    normativeSummary,
    missingContext: effectiveMissingContext,
    termsSearched: searchTerms,
    technicalEntities,
    sources,
    ...(debug
      ? {
          debugInfo: {
            intent,
            intentLabel: INTENT_LABELS[intent],
            secondaryIntents,
            secondaryIntentLabels: secondaryIntents.map((i) => INTENT_LABELS[i]),
            audience,
            audienceLabel: AUDIENCE_LABELS[audience],
            classifiedAudience,
            classifiedAudienceLabel: AUDIENCE_LABELS[classifiedAudience],
            classificationMode: isLeigo ? "ATENDIMENTO" : "DIMENSIONAMENTO",
            responseMode,
            loadEntities,
            loadCalculation,
            serviceEntranceLookup,
            keywords,
            technicalEntities,
            structuredLookup,
            vectorSearch: {
              ...vectorSearch.debug,
              fallbackTextual: vectorSearch.debug.fallbackTextual || vectorSearch.results.length === 0,
              skippedByStructuredSource: !shouldUseVector,
            },
            expandedTerms,
            searchTerms,
            minScore,
            isTechnicalSourceSufficient: isSufficient,
            hasStrongTechnicalSource,
            hasDimensioningTableOrCriteria: passingAll.some((c) => isStrongTechnicalSource(c)),
            candidateCount: scored.length,
            candidates: scored.map((c) => ({
              chunkId: c.chunk_id,
              documentTitle: c.document_title,
              pageNumber: c.page_number,
              chunkType: c.chunk_type,
              pageType: c.page_type,
              technicalIntent: c.technical_intent,
              topic: c.topic,
              metadata: c.metadata,
              drawingNumber: getMetadataString(c.metadata, "drawingNumber"),
              relatedTableNumber: getMetadataString(c.metadata, "relatedTableNumber") ?? getMetadataString(c.metadata, "tableNumber"),
              tableRows: getMetadataArray(c.metadata, "tableRows"),
              asteriskItems: getMetadataArray(c.metadata, "asteriskItems"),
              responsibility: getMetadataResponsibilitySummary(c.metadata),
              measurements: getMetadataArray(c.metadata, "measurements"),
              technicalNotes: getMetadataArray(c.metadata, "technicalNotes"),
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
              textualScore: c.textualScore,
              technicalScore: c.technicalScore,
              penaltyScore: c.penaltyScore,
              vectorScore: c.vectorScore,
              textualRetrievalScore: c.textualRetrievalScore,
              hybridScore: c.hybridScore,
              embeddingModel: c.embedding_model,
              vectorDistance: c.vector_distance,
              retrievalSource: c.retrievalSource,
              finalScore: c.score,
              reasons: c.reasons,
              rejected: c.rejected || (requiresStrongSource && !isStrongTechnicalSource(c) && c.score >= minScore),
              rejectionReason:
                c.rejectionReason ??
                (requiresStrongSource && !isStrongTechnicalSource(c) && c.score >= minScore
                  ? "Fonte auxiliar: nao e tabela/requisito/criterio de dimensionamento suficiente para resposta principal"
                  : undefined),
              sourceRole: c.rejected
                ? "REJECTED"
                : c.score < minScore
                  ? "REJECTED"
                  : isAuxiliaryChunk(c) || !isStrongTechnicalSource(c)
                    ? "AUXILIARY"
                    : "MAIN",
              textPreview: c.chunk_text.slice(0, 200),
            })),
          },
        }
      : {}),
  });
}

type RagSource = {
  documentTitle: string;
  versionLabel: string;
  pageNumber: number;
  chunkIndex: number;
  chunkType?: string | null;
  pageType?: string | null;
  technicalIntent?: string | null;
  topic?: string | null;
  sourceQuality?: string | null;
  flags?: Record<string, boolean>;
  sectionNumber: string | null;
  sectionTitle: string | null;
  tableNumber: string | null;
  tableTitle: string | null;
  excerpt: string;
  concessionaire: string | null;
  stateCodes: string[];
  documentType: string;
  metadata: Prisma.JsonValue | Record<string, unknown>;
  score: number;
  evidence?: Array<{
    storagePath: string;
    signedUrl: string;
    label: string;
    kind: "image" | "pdf" | "file";
  }>;
};

async function attachEvidenceUrls<T extends RagSource>(sources: T[]): Promise<T[]> {
  const paths = Array.from(
    new Set(
      sources.flatMap((source) => getSourceEvidencePaths(source.metadata)),
    ),
  ).slice(0, 6);

  if (!paths.length) return sources;

  let signedByPath: Map<string, string>;
  try {
    signedByPath = await createSignedEvidenceUrls(paths);
  } catch {
    return sources;
  }

  return sources.map((source) => {
    const sourcePaths = getSourceEvidencePaths(source.metadata);
    const evidence = sourcePaths
      .map((storagePath, index) => {
        const signedUrl = signedByPath.get(storagePath);
        if (!signedUrl) return null;
        return {
          storagePath,
          signedUrl,
          label: index === 0 ? "Imagem original" : `Evidencia ${index + 1}`,
          kind: getEvidenceKind(storagePath),
        };
      })
      .filter((item): item is { storagePath: string; signedUrl: string; label: string; kind: "image" | "pdf" | "file" } => Boolean(item));

    return evidence.length ? { ...source, evidence } : source;
  });
}

async function createSignedEvidenceUrls(storagePaths: string[]) {
  const supabase = createSupabaseServiceRoleClient();
  const signedByPath = new Map<string, string>();

  for (const storagePath of storagePaths) {
    const parsed = parseStoragePath(storagePath);
    if (!parsed) continue;

    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 60 * 20);
    if (!error && data?.signedUrl) {
      signedByPath.set(storagePath, data.signedUrl);
    }
  }

  return signedByPath;
}

function getSourceEvidencePaths(metadata: Prisma.JsonValue | Record<string, unknown>) {
  const meta = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};

  const paths = [
    meta.imageStoragePath,
    ...(Array.isArray(meta.evidencePaths) ? meta.evidencePaths : []),
  ];

  const structuredData = meta.structuredData;
  if (structuredData && typeof structuredData === "object" && !Array.isArray(structuredData)) {
    const nested = structuredData as Record<string, unknown>;
    paths.push(nested.imageStoragePath);
    if (Array.isArray(nested.evidencePaths)) paths.push(...nested.evidencePaths);
  }

  return paths
    .filter((path): path is string => typeof path === "string" && path.trim().length > 0)
    .map((path) => path.trim());
}

function parseStoragePath(storagePath: string) {
  const clean = storagePath.replace(/^\/+/, "");
  const [first, ...rest] = clean.split("/");
  if (!first || rest.length === 0) {
    return {
      bucket: process.env.SUPABASE_DOCUMENTS_BUCKET ?? "technical-documents",
      path: clean,
    };
  }

  return {
    bucket: first,
    path: rest.join("/"),
  };
}

function getEvidenceKind(storagePath: string): "image" | "pdf" | "file" {
  const lower = storagePath.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)$/i.test(lower)) return "image";
  if (/\.pdf$/i.test(lower)) return "pdf";
  return "file";
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
        dc.metadata,
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
        and dv.status <> 'ARCHIVED'::version_status
        and dc.is_low_value = FALSE
        and dc.is_searchable = TRUE
        and (${conditions})
      order by dc.page_number asc
      limit 80
    `);
  } catch {
    return [];
  }
}

function mergeHybridCandidates(textualCandidates: ChunkRow[], vectorCandidates: ChunkRow[]): ChunkRow[] {
  const byId = new Map<string, ChunkRow>();

  for (const chunk of vectorCandidates) {
    byId.set(chunk.chunk_id, {
      ...chunk,
      textual_retrieval_score: 0,
    });
  }

  for (const chunk of textualCandidates) {
    const existing = byId.get(chunk.chunk_id);
    if (existing) {
      byId.set(chunk.chunk_id, {
        ...existing,
        textual_retrieval_score: 100,
      });
    } else {
      byId.set(chunk.chunk_id, {
        ...chunk,
        vector_score: null,
        vector_distance: null,
        textual_retrieval_score: 100,
      });
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => {
      const aVector = a.vector_score ?? 0;
      const bVector = b.vector_score ?? 0;
      if (bVector !== aVector) return bVector - aVector;
      return (b.textual_retrieval_score ?? 0) - (a.textual_retrieval_score ?? 0);
    })
    .slice(0, 100);
}

function applyStructuredChunkScore(
  detail: {
    score: number;
    textualScore: number;
    technicalScore: number;
    penaltyScore: number;
    reasons: string[];
    rejected: boolean;
    rejectionReason?: string;
  },
  chunk: ChunkRow,
  isLeigo: boolean,
  intent: TechnicalIntent,
  secondaryIntents: TechnicalIntent[],
  question: string,
) {
  if (detail.rejected) return;

  if (chunk.is_cover || chunk.is_summary || chunk.chunk_type === "SUMMARY") {
    detail.score -= 80;
    detail.penaltyScore -= 80;
    detail.reasons.push("-80: capa/sumario/indice");

    if (!isLeigo) {
      detail.rejected = true;
      detail.rejectionReason = "Chunk de capa/sumario nao deve responder consulta tecnica.";
    }

    return;
  }

  if (chunk.chunk_type === "ADMINISTRATIVE" || chunk.source_quality === "LOW") {
    detail.score -= 45;
    detail.penaltyScore -= 45;
    detail.reasons.push("-45: chunk administrativo ou baixa qualidade");
  }

  const normalizedText = normalizeForGate(chunk.chunk_text);
  const normalizedQuestion = normalizeForGate(question);
  const asksProvisional = /provisorio|temporaria|temporario|evento|feira|obra temporaria/.test(
    normalizedQuestion,
  );
  const asksInspection = /inspecao|vistoria/.test(normalizedQuestion);

  if (!isLeigo && !asksProvisional && /fornecimento provisorio|conexao temporaria/.test(normalizedText)) {
    detail.score -= 90;
    detail.penaltyScore -= 90;
    detail.reasons.push("-90: fornecimento provisorio/conexao temporaria fora da pergunta");
  }

  if (!isLeigo && !asksInspection && /inspecao|vistoria/.test(normalizedText)) {
    detail.score -= 60;
    detail.penaltyScore -= 60;
    detail.reasons.push("-60: inspecao/vistoria fora da pergunta");
  }

  if (!isLeigo && chunk.is_definition) {
    detail.score -= 35;
    detail.penaltyScore -= 35;
    detail.reasons.push("-35: definicao usada apenas como apoio");
  }

  if (!isLeigo && HIGH_VALUE_CHUNK_TYPES.has(chunk.chunk_type)) {
    detail.score += 25;
    detail.technicalScore += 25;
    detail.reasons.push("+25: tipo de chunk normativo de alto valor");
  }

  if (!isLeigo && chunk.is_requirement) {
    detail.score += 20;
    detail.technicalScore += 20;
    detail.reasons.push("+20: requisito normativo detectado");
  }

  if (!isLeigo && chunk.is_sizing_criteria) {
    detail.score += 25;
    detail.technicalScore += 25;
    detail.reasons.push("+25: criterio de dimensionamento detectado");
  }

  if (!isLeigo && chunk.is_figure) {
    detail.score += 15;
    detail.technicalScore += 15;
    detail.reasons.push("+15: desenho/figura tecnica");
  }

  if (!isLeigo && chunk.technical_intent) {
    if (chunk.technical_intent === intent || secondaryIntents.includes(chunk.technical_intent as TechnicalIntent)) {
      detail.score += 25;
      detail.technicalScore += 25;
      detail.reasons.push(`+25: intencao tecnica alinhada ${chunk.technical_intent}`);
    } else {
      detail.score += 5;
      detail.technicalScore += 5;
      detail.reasons.push(`+5: intencao tecnica ${chunk.technical_intent}`);
    }
  }

  if (!isLeigo && isStrongTechnicalSource(chunk)) {
    detail.score += 35;
    detail.technicalScore += 35;
    detail.reasons.push("+35: fonte forte (tabela/requisito/criterio de dimensionamento)");
  }
}

function normalizeForGate(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function requiresStrongTechnicalSource(intent: TechnicalIntent, secondaryIntents: TechnicalIntent[]) {
  return [intent, ...secondaryIntents].some((i) =>
    [
      "SERVICE_ENTRANCE_CABLE",
      "PROTECTION",
      "SERVICE_ENTRANCE_STANDARD",
      "LOAD_DEMAND",
      "DRAWING_REFERENCE",
      "MATERIAL_RESPONSIBILITY",
      "DIMENSION_REQUIREMENT",
    ].includes(i),
  );
}

function isStrongTechnicalSource(chunk: ChunkRow) {
  const pageType = chunk.page_type ?? "";
  return (
    chunk.is_table ||
    chunk.is_requirement ||
    chunk.is_sizing_criteria ||
    TABLE_CHUNK_TYPES.has(chunk.chunk_type) ||
    STRONG_CHUNK_TYPES.has(chunk.chunk_type) ||
    STRONG_PAGE_TYPES.has(pageType)
  ) && !chunk.is_definition && !chunk.is_cover && !chunk.is_summary && chunk.chunk_type !== "ADMINISTRATIVE";
}

function isAuxiliaryChunk(chunk: ChunkRow) {
  return (
    chunk.is_definition ||
    chunk.chunk_type === "DEFINITION" ||
    /definicoes|termos e definicoes|campo de aplicacao|sumario/i.test(
      `${chunk.section_title ?? ""} ${chunk.table_title ?? ""}`,
    )
  );
}

function getMetadataObject(metadata: Prisma.JsonValue): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function getMetadataString(metadata: Prisma.JsonValue, key: string) {
  const value = getMetadataObject(metadata)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getMetadataArray(metadata: Prisma.JsonValue, key: string) {
  const value = getMetadataObject(metadata)[key];
  return Array.isArray(value) ? value : [];
}

function getMetadataResponsibilitySummary(metadata: Prisma.JsonValue) {
  const rows = getMetadataArray(metadata, "tableRows");
  const concessionaireCount = rows.filter(
    (row) =>
      row &&
      typeof row === "object" &&
      "responsibility" in row &&
      row.responsibility === "CONCESSIONARIA",
  ).length;
  if (concessionaireCount > 0) return `${concessionaireCount} item(ns) CONCESSIONARIA`;
  return null;
}
