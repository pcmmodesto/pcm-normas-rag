import type { ExtractedPdfPage } from "./extract-pdf-text";

export type DocumentChunkDraft = {
  pageNumber: number;
  chunkIndex: number;
  text: string;
  sectionTitle?: string;
  itemReference?: string;
  tableReference?: string;
  isTableLike?: boolean;
  hasElectricalValues?: boolean;
  hasCableSizingTerms?: boolean;
  hasServiceEntranceTerms?: boolean;
};

function detectIsTableLike(text: string): boolean {
  const lines = text.split("\n");
  const multicolumn = lines.filter((l) => /\s{3,}/.test(l) || l.includes("\t")).length;
  return (
    /tabela\s*\d+/i.test(text) ||
    /\d+\s*mm[²2]/i.test(text) ||
    multicolumn >= 3
  );
}

function detectHasElectricalValues(text: string): boolean {
  return /\d+\s*(kva|kw|mm[²2]|kv|mva|awg)/i.test(text);
}

function detectHasCableSizingTerms(text: string): boolean {
  return /(bitola|seção|secao|condutor|mm[²2]|awg|cabos?\s+de\s+\d)/i.test(text);
}

function detectHasServiceEntranceTerms(text: string): boolean {
  return /(ramal\s+de\s+entrada|padrão\s+de\s+entrada|padrao\s+de\s+entrada|caixa\s+de\s+medição|medidor|entrada\s+de\s+energia)/i.test(
    text,
  );
}

const MAX_CHUNK_CHARS = 900;
const MIN_CHUNK_CHARS = 80;

export async function chunkDocument(
  pages: ExtractedPdfPage[],
): Promise<DocumentChunkDraft[]> {
  const chunks: DocumentChunkDraft[] = [];
  let globalIndex = 0;

  for (const page of pages) {
    const pageChunks = splitPageIntoChunks(page.text, page.pageNumber, globalIndex);
    chunks.push(...pageChunks);
    globalIndex += pageChunks.length;
  }

  return chunks;
}

function buildChunk(text: string, pageNumber: number, chunkIndex: number): DocumentChunkDraft {
  return {
    pageNumber,
    chunkIndex,
    text,
    isTableLike: detectIsTableLike(text),
    hasElectricalValues: detectHasElectricalValues(text),
    hasCableSizingTerms: detectHasCableSizingTerms(text),
    hasServiceEntranceTerms: detectHasServiceEntranceTerms(text),
  };
}

function splitPageIntoChunks(
  text: string,
  pageNumber: number,
  startIndex: number,
): DocumentChunkDraft[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  if (cleaned.length === 0) return [];

  if (cleaned.length <= MAX_CHUNK_CHARS) {
    return [buildChunk(cleaned, pageNumber, startIndex)];
  }

  const paragraphs = cleaned.split(/\n{2,}/);
  const chunks: DocumentChunkDraft[] = [];
  let buffer = "";
  let idx = startIndex;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (buffer.length + trimmed.length + 2 > MAX_CHUNK_CHARS && buffer.length >= MIN_CHUNK_CHARS) {
      chunks.push(buildChunk(buffer.trim(), pageNumber, idx++));
      buffer = trimmed;
    } else {
      buffer = buffer ? `${buffer}\n\n${trimmed}` : trimmed;
    }
  }

  if (buffer.trim().length >= MIN_CHUNK_CHARS) {
    chunks.push(buildChunk(buffer.trim(), pageNumber, idx++));
  } else if (buffer.trim().length > 0 && chunks.length > 0) {
    const last = chunks[chunks.length - 1];
    last.text = `${last.text}\n\n${buffer.trim()}`;
  } else if (buffer.trim().length > 0) {
    chunks.push(buildChunk(buffer.trim(), pageNumber, idx++));
  }

  return chunks;
}
