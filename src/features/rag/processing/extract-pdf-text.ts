export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

export async function extractPdfText(): Promise<ExtractedPdfPage[]> {
  throw new Error("Extracao real de PDF ainda nao conectada.");
}
