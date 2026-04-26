import type { ExtractedPdfPage } from "./extract-pdf-text";
import { detectTechnicalPageType, isLowValuePageType } from "./detect-technical-page-type";
import { buildVisualTechnicalChunks } from "./build-visual-technical-chunks";
import { buildConsolidatedDrawingChunks } from "./drawing-normative-structure";
import { buildSearchText } from "./technical-normalizer";

export type SmartChunk = {
  pageNumber: number;
  chunkIndex: number;
  text: string;
  chunkType: string;
  sectionNumber: string | null;
  sectionTitle: string | null;
  parentSectionNumber: string | null;
  tableNumber: string | null;
  tableTitle: string | null;
  isSearchable: boolean;
  isLowValue: boolean;
  searchText: string;
  metadata?: Record<string, unknown>;
};

export type DocContext = {
  documentTitle: string;
  concessionaria: string | null;
  stateCodes: string[] | null;
  versionLabel: string;
};

const MAX_CHUNK_CHARS = 1000;
const MIN_CHUNK_CHARS = 80;

// Matches "7.3 PADRÃO DE ENTRADA" or "1 CAMPO DE APLICAÇÃO"
const NUMBERED_SECTION_RE = /^(\d+(?:\.\d+)*)\s{1,4}([A-ZÁÉÍÓÚÃÕÇ].{3,80})$/;
// Matches "ANEXO I — Titulo" or "ANEXO A"
const ANNEX_RE = /^(ANEXO\s+(?:[IVX]+|[A-Z])\b.*)/i;

function isSectionHeading(line: string): boolean {
  if (line.length > 100) return false;
  if (NUMBERED_SECTION_RE.test(line)) return true;
  if (ANNEX_RE.test(line)) return true;
  return false;
}

function parseSectionHeading(line: string): { sectionNumber: string; sectionTitle: string } | null {
  const numMatch = NUMBERED_SECTION_RE.exec(line);
  if (numMatch) {
    return { sectionNumber: numMatch[1], sectionTitle: numMatch[2].trim() };
  }
  const annexMatch = ANNEX_RE.exec(line);
  if (annexMatch) {
    const parts = annexMatch[1].split(/\s+/);
    const number = parts.slice(0, 2).join(" ");
    const title = parts.slice(2).join(" ") || number;
    return { sectionNumber: number, sectionTitle: title };
  }
  return null;
}

function getParentSection(sectionNumber: string): string | null {
  const parts = sectionNumber.split(".");
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(".");
}

type TextBlock = {
  lines: string[];
  isTable: boolean;
  tableNumber: string | null;
};

function splitIntoBlocks(text: string): TextBlock[] {
  const lines = text.split("\n");
  const blocks: TextBlock[] = [];
  let current: string[] = [];
  let inTable = false;
  let tableNumber: string | null = null;

  const flushCurrent = () => {
    if (current.length > 0) {
      blocks.push({ lines: [...current], isTable: inTable, tableNumber });
      current = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Detect table start
    const tableMatch = /^Tabela\s+(\d+(?:\.\d+)*)\b/i.exec(trimmed);
    if (tableMatch && !inTable) {
      flushCurrent();
      inTable = true;
      tableNumber = tableMatch[1];
    }

    // Detect table end: blank line after table content
    if (inTable && trimmed === "" && current.length > 3) {
      current.push(trimmed);
      flushCurrent();
      inTable = false;
      tableNumber = null;
      continue;
    }

    current.push(trimmed);
  }

  flushCurrent();
  return blocks;
}

function buildChunksFromBlock(
  block: TextBlock,
  pageNumber: number,
  startIndex: number,
  sectionNumber: string | null,
  sectionTitle: string | null,
  docContext: DocContext,
  isLowValue: boolean,
): SmartChunk[] {
  const fullText = block.lines.join("\n").trim();
  if (fullText.length < MIN_CHUNK_CHARS) return [];

  const chunkType = isLowValue
    ? "ADMINISTRATIVE"
    : block.isTable
      ? "TABLE"
      : sectionNumber
        ? "SECTION"
        : "TEXT";

  const parentSectionNumber = sectionNumber ? getParentSection(sectionNumber) : null;

  // If small enough, single chunk
  if (fullText.length <= MAX_CHUNK_CHARS) {
    const searchText = buildSearchText({
      ...docContext,
      chunkText: fullText,
      sectionTitle,
      tableTitle: block.isTable ? (block.lines[0] ?? null) : null,
      chunkType,
    });
    return [
      {
        pageNumber,
        chunkIndex: startIndex,
        text: fullText,
        chunkType,
        sectionNumber,
        sectionTitle,
        parentSectionNumber,
        tableNumber: block.tableNumber,
        tableTitle: block.isTable ? (block.lines[0]?.trim() ?? null) : null,
        isSearchable: true,
        isLowValue,
        searchText,
      },
    ];
  }

  // Split large blocks by paragraph
  const paragraphs = fullText.split(/\n{2,}/);
  const chunks: SmartChunk[] = [];
  let buffer = "";
  let idx = startIndex;

  const flush = (text: string) => {
    if (text.trim().length < MIN_CHUNK_CHARS) return;
    const searchText = buildSearchText({
      ...docContext,
      chunkText: text.trim(),
      sectionTitle,
      tableTitle: null,
      chunkType,
    });
    chunks.push({
      pageNumber,
      chunkIndex: idx++,
      text: text.trim(),
      chunkType,
      sectionNumber,
      sectionTitle,
      parentSectionNumber,
      tableNumber: block.tableNumber,
      tableTitle: null,
      isSearchable: true,
      isLowValue,
      searchText,
    });
  };

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (buffer.length + trimmed.length + 2 > MAX_CHUNK_CHARS && buffer.length >= MIN_CHUNK_CHARS) {
      flush(buffer);
      buffer = trimmed;
    } else {
      buffer = buffer ? `${buffer}\n\n${trimmed}` : trimmed;
    }
  }

  if (buffer.trim().length >= MIN_CHUNK_CHARS) {
    flush(buffer);
  } else if (buffer.trim().length > 0 && chunks.length > 0) {
    const last = chunks[chunks.length - 1];
    last.text = `${last.text}\n\n${buffer.trim()}`;
  } else if (buffer.trim().length > 0) {
    flush(buffer);
  }

  return chunks;
}

function processPageText(
  text: string,
  pageNumber: number,
  startIndex: number,
  docContext: DocContext,
  isLowValue: boolean,
): SmartChunk[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!cleaned) return [];

  const allChunks: SmartChunk[] = [];
  let idx = startIndex;

  // Split into section segments
  const lines = cleaned.split("\n");
  let currentSectionNumber: string | null = null;
  let currentSectionTitle: string | null = null;
  let currentLines: string[] = [];

  const flushSection = () => {
    if (currentLines.length === 0) return;
    const sectionText = currentLines.join("\n").trim();
    if (!sectionText) return;

    const blocks = splitIntoBlocks(sectionText);
    for (const block of blocks) {
      const newChunks = buildChunksFromBlock(
        block,
        pageNumber,
        idx,
        currentSectionNumber,
        currentSectionTitle,
        docContext,
        isLowValue,
      );
      allChunks.push(...newChunks);
      idx += newChunks.length;
    }
    currentLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (!isLowValue && isSectionHeading(trimmed)) {
      flushSection();
      const parsed = parseSectionHeading(trimmed);
      if (parsed) {
        currentSectionNumber = parsed.sectionNumber;
        currentSectionTitle = parsed.sectionTitle;
      }
      currentLines.push(trimmed);
    } else {
      currentLines.push(trimmed);
    }
  }

  flushSection();
  return allChunks;
}

export async function smartChunkDocument(
  pages: ExtractedPdfPage[],
  docContext: DocContext,
): Promise<SmartChunk[]> {
  const allChunks: SmartChunk[] = [];
  let globalIndex = 0;

  for (const page of pages) {
    const pageType = detectTechnicalPageType(page.text, page.pageNumber);
    const isLowValue = isLowValuePageType(pageType);

    let pageChunks: SmartChunk[];

    if (
      pageType === "DRAWING_PAGE" ||
      pageType === "MIXED_TECHNICAL_PAGE" ||
      pageType === "TABLE_PAGE"
    ) {
      // Visual/table pages get specialized chunking
      pageChunks = buildVisualTechnicalChunks(
        page.text,
        page.pageNumber,
        pageType,
        docContext,
        globalIndex,
      );
    } else {
      // Text, admin, cover, summary pages: section-based chunking
      pageChunks = processPageText(
        page.text,
        page.pageNumber,
        globalIndex,
        docContext,
        isLowValue,
      );
    }

    // Fallback for non-empty pages that produced no chunks
    if (pageChunks.length === 0 && page.text.trim().length >= MIN_CHUNK_CHARS) {
      const chunkType = isLowValue ? "ADMINISTRATIVE" : "TEXT";
      const searchText = buildSearchText({
        ...docContext,
        chunkText: page.text.trim().slice(0, 500),
        chunkType,
      });
      pageChunks = [
        {
          pageNumber: page.pageNumber,
          chunkIndex: globalIndex,
          text: page.text.trim().slice(0, 500),
          chunkType,
          sectionNumber: null,
          sectionTitle: null,
          parentSectionNumber: null,
          tableNumber: null,
          tableTitle: null,
          isSearchable: !isLowValue,
          isLowValue,
          searchText,
        },
      ];
    }

    allChunks.push(...pageChunks);
    globalIndex += pageChunks.length;

    for (const chunk of pageChunks) {
      const existingPageType =
        typeof chunk.metadata?.pageType === "string" ? chunk.metadata.pageType : null;
      chunk.metadata = {
        ...(chunk.metadata ?? {}),
        pageType: existingPageType ?? pageType,
        sourcePageType: pageType,
      };
    }
  }

  const consolidatedDrawingChunks = buildConsolidatedDrawingChunks(
    allChunks,
    docContext,
    globalIndex,
  );
  allChunks.push(...consolidatedDrawingChunks);

  // Re-assign sequential chunkIndex across all chunks
  for (let i = 0; i < allChunks.length; i++) {
    allChunks[i].chunkIndex = i;
  }

  return allChunks;
}
