export type RagPdfKind = "technical" | "client";

export type RagPdfSource = {
  id?: string;
  documentTitle: string;
  pageNumber: number;
  excerpt: string;
  normativeItem?: string;
  chunkIndex?: number;
  relevanceScore?: number;
  metadata?: Record<string, unknown>;
};

export type RagPdfSection = {
  title: string;
  body?: string;
  items?: string[];
  rows?: Array<{
    label: string;
    value: string;
    note?: string;
  }>;
};

export type RagPdfPayload = {
  question: string;
  answer: string;
  kind: RagPdfKind;
  title: string;
  sources: RagPdfSource[];
  sections: RagPdfSection[];
  generatedAt: string;
  disclaimer: string;
  companyName?: string;
  documentTitle?: string;
  metadata?: Record<string, unknown>;
};

export type RagPdfGenerationResult = {
  ok: boolean;
  status: "preview-only" | "generated" | "failed";
  payload: RagPdfPayload;
  fileName?: string;
  downloadUrl?: string;
  message?: string;
};

