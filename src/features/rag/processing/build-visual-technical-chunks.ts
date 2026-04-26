import type { TechnicalPageType } from "./detect-technical-page-type";
import type { SmartChunk, DocContext } from "./smart-chunker";
import { extractDrawingContext } from "./extract-drawing-context";
import { extractTableLikeData } from "./extract-table-like-data";
import { buildSearchText } from "./technical-normalizer";

// Maximum text length for a single chunk
const MAX_CHUNK_CHARS = 1200;

function makeChunk(
  params: Omit<SmartChunk, "chunkIndex"> & { chunkIndex?: number },
  idx: number,
): SmartChunk {
  return { ...params, chunkIndex: idx } as SmartChunk;
}

function stripDocumentHeader(text: string): string {
  return text
    .replace(/NORMA T[ÉE]CNICA[\s\S]*?DOCUMENTO N[ÃA]O CONTROLADO\s*/g, "")
    .trim();
}

function extractNotesSection(text: string): string {
  const match = /\bNotas?:?\s*\n([\s\S]+)/i.exec(text);
  return match ? match[1].trim().slice(0, 600) : "";
}

export function buildVisualTechnicalChunks(
  rawText: string,
  pageNumber: number,
  pageType: TechnicalPageType,
  docContext: DocContext,
  startIndex: number,
): SmartChunk[] {
  const text = stripDocumentHeader(rawText);
  const chunks: SmartChunk[] = [];
  let idx = startIndex;

  if (pageType === "DRAWING_PAGE" || pageType === "MIXED_TECHNICAL_PAGE") {
    const drawingCtx = extractDrawingContext(text);

    // ── NORMATIVE_DRAWING chunk ──────────────────────────────────────────────
    const drawingText = buildDrawingChunkText(text, drawingCtx);
    const drawingSearchText = buildSearchText({
      ...docContext,
      chunkText: drawingText,
      sectionTitle: drawingCtx.drawingTitle,
      chunkType: "NORMATIVE_DRAWING",
    });

    chunks.push(
      makeChunk(
        {
          pageNumber,
          text: drawingText,
          chunkType: "NORMATIVE_DRAWING",
          sectionNumber: null,
          sectionTitle: drawingCtx.drawingTitle,
          parentSectionNumber: null,
          tableNumber: null,
          tableTitle: null,
          isSearchable: true,
          isLowValue: false,
          searchText: drawingSearchText,
          metadata: {
            drawingType: drawingCtx.drawingType,
            drawingNumber: drawingCtx.drawingNumber,
            drawingTitle: drawingCtx.drawingTitle,
            drawingSubject: drawingCtx.drawingSubject,
            visualElements: drawingCtx.visualElements,
            technicalTerms: drawingCtx.technicalTerms,
            applicableVoltageLevels: drawingCtx.applicableVoltageLevels,
            detectedLabels: drawingCtx.detectedLabels,
            technicalIntent: drawingCtx.technicalIntent,
            visualDescription: drawingCtx.visualDescription,
            pageType,
            extractionMethod: "text_heuristic",
          },
        },
        idx++,
      ),
    );

    // ── NORMATIVE_TABLE chunks (if tables found) ─────────────────────────────
    const tables = extractTableLikeData(text);
    for (const table of tables) {
      const tableText = buildTableChunkText(table, drawingCtx.drawingTitle);
      const tableSearchText = buildSearchText({
        ...docContext,
        chunkText: tableText,
        sectionTitle: drawingCtx.drawingTitle,
        tableTitle: table.tableTitle,
        chunkType: "NORMATIVE_TABLE",
      });

      chunks.push(
        makeChunk(
          {
            pageNumber,
            text: tableText,
            chunkType: "NORMATIVE_TABLE",
            sectionNumber: null,
            sectionTitle: drawingCtx.drawingTitle,
            parentSectionNumber: null,
            tableNumber: table.tableNumber,
            tableTitle: table.tableTitle,
            isSearchable: true,
            isLowValue: false,
            searchText: tableSearchText,
            metadata: {
              tableNumber: table.tableNumber,
              tableTitle: table.tableTitle,
              columns: table.columns,
              rows: table.rows,
              notes: table.notes,
              tableExtractionStatus: table.tableExtractionStatus,
              relatedDrawingTitle: drawingCtx.drawingTitle,
              relatedDrawingNumber: drawingCtx.drawingNumber,
              technicalIntent: drawingCtx.technicalIntent,
              pageType,
              extractionMethod: "text_heuristic",
            },
          },
          idx++,
        ),
      );
    }

    // ── NORMATIVE_NOTE chunk ─────────────────────────────────────────────────
    const notesText = extractNotesSection(text);
    if (notesText.length >= 60) {
      const notesSearchText = buildSearchText({
        ...docContext,
        chunkText: notesText,
        sectionTitle: drawingCtx.drawingTitle,
        chunkType: "NORMATIVE_NOTE",
      });
      chunks.push(
        makeChunk(
          {
            pageNumber,
            text: `Notas técnicas — ${drawingCtx.drawingTitle ?? "Desenho normativo"}\n\n${notesText}`,
            chunkType: "NORMATIVE_NOTE",
            sectionNumber: null,
            sectionTitle: drawingCtx.drawingTitle,
            parentSectionNumber: null,
            tableNumber: null,
            tableTitle: null,
            isSearchable: true,
            isLowValue: false,
            searchText: notesSearchText,
            metadata: {
              relatedDrawingTitle: drawingCtx.drawingTitle,
              relatedDrawingNumber: drawingCtx.drawingNumber,
              technicalIntent: drawingCtx.technicalIntent,
              extractionMethod: "text_heuristic",
            },
          },
          idx++,
        ),
      );
    }
  } else if (pageType === "TABLE_PAGE") {
    // Pure table page — no drawing context
    const tables = extractTableLikeData(text);
    for (const table of tables) {
      const tableText = buildTableChunkText(table, null);
      const tableSearchText = buildSearchText({
        ...docContext,
        chunkText: tableText,
        tableTitle: table.tableTitle,
        chunkType: "NORMATIVE_TABLE",
      });
      chunks.push(
        makeChunk(
          {
            pageNumber,
            text: tableText,
            chunkType: "NORMATIVE_TABLE",
            sectionNumber: null,
            sectionTitle: null,
            parentSectionNumber: null,
            tableNumber: table.tableNumber,
            tableTitle: table.tableTitle,
            isSearchable: true,
            isLowValue: false,
            searchText: tableSearchText,
            metadata: {
              tableNumber: table.tableNumber,
              tableTitle: table.tableTitle,
              columns: table.columns,
              rows: table.rows,
              notes: table.notes,
              tableExtractionStatus: table.tableExtractionStatus,
              pageType,
              extractionMethod: "text_heuristic",
            },
          },
          idx++,
        ),
      );
    }

    // Fallback: if no tables parsed, create a generic TABLE chunk
    if (tables.length === 0 && text.trim().length >= 80) {
      const searchText = buildSearchText({ ...docContext, chunkText: text, chunkType: "TABLE" });
      chunks.push(
        makeChunk(
          {
            pageNumber,
            text: text.slice(0, MAX_CHUNK_CHARS),
            chunkType: "TABLE",
            sectionNumber: null,
            sectionTitle: null,
            parentSectionNumber: null,
            tableNumber: null,
            tableTitle: null,
            isSearchable: true,
            isLowValue: false,
            searchText,
            metadata: { tableExtractionStatus: "needs_review", pageType },
          },
          idx++,
        ),
      );
    }
  }

  return chunks;
}

function buildDrawingChunkText(
  text: string,
  ctx: ReturnType<typeof extractDrawingContext>,
): string {
  const lines: string[] = [];

  lines.push(ctx.drawingTitle ?? "Desenho normativo técnico");
  lines.push("");

  if (ctx.applicableVoltageLevels.length > 0) {
    lines.push(`Tensões aplicáveis: ${ctx.applicableVoltageLevels.join(", ")}`);
    lines.push("");
  }

  if (ctx.visualElements.length > 0) {
    lines.push("Elementos visuais representados:");
    ctx.visualElements.forEach((el, i) => lines.push(`${String.fromCharCode(97 + i)}) ${el}`));
    lines.push("");
  }

  if (ctx.detectedLabels.length > 0) {
    lines.push(`Referências visuais identificadas: ${ctx.detectedLabels.join(", ")}`);
    lines.push("");
  }

  if (ctx.technicalTerms.length > 0) {
    lines.push(`Termos técnicos: ${ctx.technicalTerms.join(", ")}`);
    lines.push("");
  }

  lines.push("Tipo: Desenho normativo");
  if (ctx.drawingSubject) lines.push(`Assunto: ${ctx.drawingSubject}`);

  const fullText = lines.join("\n");
  return fullText.length > MAX_CHUNK_CHARS
    ? fullText.slice(0, MAX_CHUNK_CHARS)
    : fullText;
}

function buildTableChunkText(
  table: ReturnType<typeof extractTableLikeData>[number],
  relatedDrawingTitle: string | null,
): string {
  const lines: string[] = [];

  const header = table.tableTitle
    ? `Tabela ${table.tableNumber ?? ""} — ${table.tableTitle}`
    : `Tabela ${table.tableNumber ?? ""}`;
  lines.push(header.trim());

  if (relatedDrawingTitle) {
    lines.push(`(relacionada a: ${relatedDrawingTitle})`);
  }
  lines.push("");

  if (table.tableExtractionStatus === "needs_review") {
    lines.push("[Tabela detectada — extração pode estar incompleta]");
    lines.push("");
    lines.push(table.rawText.slice(0, 600));
  } else {
    if (table.columns.length > 0) {
      lines.push(`Colunas: ${table.columns.join(" | ")}`);
      lines.push("");
    }
    for (const row of table.rows.slice(0, 20)) {
      lines.push(Object.values(row).join(" | "));
    }
    if (table.notes.length > 0) {
      lines.push("");
      lines.push("Notas:");
      table.notes.slice(0, 5).forEach((n) => lines.push(`• ${n}`));
    }
  }

  const fullText = lines.join("\n");
  return fullText.length > MAX_CHUNK_CHARS
    ? fullText.slice(0, MAX_CHUNK_CHARS)
    : fullText;
}
