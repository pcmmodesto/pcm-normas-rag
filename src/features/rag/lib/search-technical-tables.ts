import type { SourceCitation } from "@/features/rag/search/source-citation";

export type SearchTechnicalTablesParams = {
  question: string;
  concessionaire?: string;
  stateCode?: string;
  voltageLevel?: string;
  category?: string;
};

export async function searchTechnicalTables(
  params: SearchTechnicalTablesParams,
): Promise<SourceCitation[]> {
  void params;
  throw new Error("Busca estruturada em tabelas tecnicas ainda nao conectada.");
}
