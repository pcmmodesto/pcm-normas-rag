import type { ExtractedPdfPage } from "./extract-pdf-text";

export type DocumentChunkDraft = {
  pageNumber: number;
  chunkIndex: number;
  text: string;
  sectionTitle?: string;
  itemReference?: string;
  tableReference?: string;
};

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

function splitPageIntoChunks(
  text: string,
  pageNumber: number,
  startIndex: number,
): DocumentChunkDraft[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  if (cleaned.length === 0) return [];

  if (cleaned.length <= MAX_CHUNK_CHARS) {
    return [{ pageNumber, chunkIndex: startIndex, text: cleaned }];
  }

  const paragraphs = cleaned.split(/\n{2,}/);
  const chunks: DocumentChunkDraft[] = [];
  let buffer = "";
  let idx = startIndex;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (buffer.length + trimmed.length + 2 > MAX_CHUNK_CHARS && buffer.length >= MIN_CHUNK_CHARS) {
      chunks.push({ pageNumber, chunkIndex: idx++, text: buffer.trim() });
      buffer = trimmed;
    } else {
      buffer = buffer ? `${buffer}\n\n${trimmed}` : trimmed;
    }
  }

  if (buffer.trim().length >= MIN_CHUNK_CHARS) {
    chunks.push({ pageNumber, chunkIndex: idx++, text: buffer.trim() });
  } else if (buffer.trim().length > 0 && chunks.length > 0) {
    const last = chunks[chunks.length - 1];
    last.text = `${last.text}\n\n${buffer.trim()}`;
  } else if (buffer.trim().length > 0) {
    chunks.push({ pageNumber, chunkIndex: idx++, text: buffer.trim() });
  }

  return chunks;
}
