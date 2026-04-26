import { extractText, getDocumentProxy } from "unpdf";

export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

export async function extractPdfText(
  buffer: Uint8Array,
): Promise<ExtractedPdfPage[]> {
  const pdf = await getDocumentProxy(buffer);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });

  const pages: ExtractedPdfPage[] = [];

  for (let i = 0; i < totalPages; i++) {
    const pageText = Array.isArray(text) ? (text[i] ?? "") : "";
    if (pageText.trim().length > 0) {
      pages.push({ pageNumber: i + 1, text: pageText });
    }
  }

  return pages;
}
