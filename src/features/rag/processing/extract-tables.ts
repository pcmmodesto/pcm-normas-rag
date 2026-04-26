import type { ExtractedPdfPage } from "./extract-pdf-text";
import { extractTableLikeData, type ExtractedTable } from "./extract-table-like-data";

export type ExtractedTechnicalTable = ExtractedTable & {
  pageNumber: number;
};

export async function extractTables(
  pages: ExtractedPdfPage[],
): Promise<ExtractedTechnicalTable[]> {
  return pages.flatMap((page) =>
    extractTableLikeData(page.text).map((table) => ({
      ...table,
      pageNumber: page.pageNumber,
    })),
  );
}
