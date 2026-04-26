import type { SmartChunk } from "./smart-chunker";
import { normalizeTechnicalText } from "./technical-normalizer";

export type StructuredChunkClassification = {
  normalizedText: string;
  pageType: string | null;
  technicalIntent: string | null;
  technicalTerms: string[];
  voltageLevel: string | null;
  topic: string | null;
  isTable: boolean;
  isFigure: boolean;
  isSummary: boolean;
  isCover: boolean;
  isDefinition: boolean;
  isRequirement: boolean;
  isProcedure: boolean;
  isSizingCriteria: boolean;
  sourceQuality: "HIGH" | "MEDIUM" | "LOW";
};

const technicalTermPatterns: Array<[RegExp, string]> = [
  [/subestacao|cabine primaria/i, "subestacao"],
  [/ramal\s+de\s+(entrada|ligacao)/i, "ramal_entrada"],
  [/padrao\s+de\s+entrada/i, "padrao_entrada"],
  [/disjuntor|protecao|fusivel|chave\s+fusivel/i, "protecao"],
  [/condutor|cabo|bitola|mm[²2]|awg/i, "cabos_condutores"],
  [/medidor|medicao|caixa\s+de\s+medicao/i, "medicao"],
  [/aterramento|haste|terra|spda|para-?raios/i, "aterramento_spda"],
  [/demanda|carga\s+instalada|kva|kw/i, "demanda_carga"],
  [/afastamento|edificacao|janela|sacada|muro|distancia/i, "afastamento"],
  [/responsabilidade|concessionaria|\*/i, "responsabilidade_fornecimento"],
  [/legenda\s+do\s+desenho|desenho\s+\d+/i, "desenho_normativo"],
];

export function classifyStructuredChunk(chunk: SmartChunk): StructuredChunkClassification {
  const normalizedText = normalizeTechnicalText(chunk.text);
  const lower = normalize(normalizedText);
  const pageType = getStringMetadata(chunk, "pageType");
  const technicalTerms = extractTechnicalTerms(lower);
  const isTable =
    chunk.chunkType === "TABLE" ||
    chunk.chunkType === "TABLE_ROW" ||
    chunk.chunkType === "NORMATIVE_TABLE" ||
    pageType === "DRAWING_LEGEND_TABLE" ||
    pageType === "MATERIAL_TABLE" ||
    Boolean(chunk.tableNumber) ||
    /tabela\s+\d+/i.test(chunk.text);
  const isFigure =
    chunk.chunkType === "NORMATIVE_DRAWING" ||
    pageType === "TECHNICAL_DRAWING" ||
    pageType === "DRAWING_PAGE" ||
    pageType === "MIXED_TECHNICAL_PAGE" ||
    /desenho\s+\d+|figura\s+\d+|diagrama|esquema/i.test(chunk.text);
  const isSummary = chunk.chunkType === "SUMMARY" || pageType === "SUMMARY_PAGE";
  const isCover = pageType === "COVER_PAGE";
  const isDefinition =
    chunk.chunkType === "DEFINITION" ||
    /\b(definicao|termos\s+e\s+definicoes)\b/i.test(lower);
  const isProcedure =
    chunk.chunkType === "PROCEDURE" ||
    /\b(procedimento|solicitacao|etapas?|passo\s+a\s+passo)\b/i.test(lower);
  const isSizingCriteria =
    pageType === "DIMENSION_REQUIREMENT" ||
    /dimensionamento|demanda|carga\s+instalada|kva|kw|mm[²2]|disjuntor|bitola|corrente|altura|cota/.test(
      lower,
    );
  const isRequirement =
    chunk.chunkType === "REQUIREMENT" ||
    pageType === "DIMENSION_REQUIREMENT" ||
    pageType === "RESPONSIBILITY_RULE" ||
    /\b(deve|deverao|obrigatorio|limite|minimo|criterio|exigencia|responsabilidade)\b/.test(
      lower,
    );
  const voltageLevel = getStringMetadata(chunk, "voltageLevel") ?? detectVoltageLevel(lower);
  const technicalIntent = getStringMetadata(chunk, "technicalIntent") ?? inferTechnicalIntent(lower);
  const topic =
    getStringMetadata(chunk, "topic") ??
    getStringMetadata(chunk, "drawingTitle") ??
    inferTopic(technicalTerms, technicalIntent, isFigure, isTable);
  const sourceQuality = inferSourceQuality({
    chunk,
    isTable,
    isFigure,
    isSummary,
    isCover,
    isDefinition,
    isRequirement,
    isProcedure,
    isSizingCriteria,
  });

  return {
    normalizedText,
    pageType,
    technicalIntent,
    technicalTerms,
    voltageLevel,
    topic,
    isTable,
    isFigure,
    isSummary,
    isCover,
    isDefinition,
    isRequirement,
    isProcedure,
    isSizingCriteria,
    sourceQuality,
  };
}

function inferSourceQuality(flags: {
  chunk: SmartChunk;
  isTable: boolean;
  isFigure: boolean;
  isSummary: boolean;
  isCover: boolean;
  isDefinition: boolean;
  isRequirement: boolean;
  isProcedure: boolean;
  isSizingCriteria: boolean;
}): "HIGH" | "MEDIUM" | "LOW" {
  if (flags.chunk.isLowValue || flags.isSummary || flags.isCover) return "LOW";
  if (flags.isTable || flags.isFigure || flags.isRequirement || flags.isSizingCriteria) {
    return "HIGH";
  }
  if (flags.isProcedure || flags.isDefinition) return "MEDIUM";
  return "MEDIUM";
}

function inferTechnicalIntent(normalizedText: string) {
  if (/subestacao|cabine primaria/.test(normalizedText)) return "SUBSTATION";
  if (/afastamento|edificacao|distancia/.test(normalizedText)) return "CLEARANCE";
  if (/ramal|cabo|condutor|bitola/.test(normalizedText)) return "SERVICE_ENTRANCE_CABLE";
  if (/disjuntor|protecao|fusivel/.test(normalizedText)) return "PROTECTION";
  if (/demanda|carga|kva|kw/.test(normalizedText)) return "LOAD_DEMAND";
  if (/medicao|medidor|caixa de medicao/.test(normalizedText)) return "METERING";
  if (/aterramento|spda|para-raios/.test(normalizedText)) return "GROUNDING";
  return null;
}

function inferTopic(
  technicalTerms: string[],
  technicalIntent: string | null,
  isFigure: boolean,
  isTable: boolean,
) {
  if (technicalTerms.includes("desenho_normativo")) return "desenho_normativo";
  if (technicalTerms.includes("responsabilidade_fornecimento")) return "responsabilidade_fornecimento";
  if (technicalTerms.includes("afastamento")) return "afastamento_condutores_edificacoes";
  if (technicalTerms.includes("subestacao")) return "subestacao";
  if (technicalTerms.includes("cabos_condutores")) return "cabos_condutores";
  if (technicalTerms.includes("protecao")) return "protecao";
  if (technicalTerms.includes("demanda_carga")) return "demanda_carga_instalada";
  if (technicalTerms.includes("medicao")) return "medicao";
  if (isFigure && isTable) return "desenho_tabela_normativa";
  return technicalIntent ? technicalIntent.toLowerCase() : null;
}

function extractTechnicalTerms(normalizedText: string) {
  return technicalTermPatterns
    .filter(([pattern]) => pattern.test(normalizedText))
    .map(([, term]) => term);
}

function detectVoltageLevel(normalizedText: string) {
  if (/34[,.]5\s*kv|36[,.]2\s*kv/.test(normalizedText)) return "34,5 kV";
  if (/13[,.]8\s*kv|15\s*kv/.test(normalizedText)) return "13,8 kV";
  if (/127\s*\/\s*220|220\s*v|380\s*v|baixa tensao|\bbt\b/.test(normalizedText)) {
    return "baixa_tensao";
  }
  if (/media tensao|\bmt\b/.test(normalizedText)) return "media_tensao";
  return null;
}

function getStringMetadata(chunk: SmartChunk, key: string) {
  const value = chunk.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
