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
  [/subesta[cç][aã]o|cabine prim[aá]ria/i, "subestacao"],
  [/ramal\s+de\s+(entrada|liga[cç][aã]o)/i, "ramal_entrada"],
  [/padr[aã]o\s+de\s+entrada/i, "padrao_entrada"],
  [/disjuntor|prote[cç][aã]o|fus[ií]vel|chave\s+fus[ií]vel/i, "protecao"],
  [/condutor|cabo|bitola|mm[²2]|awg/i, "cabos_condutores"],
  [/medidor|medi[cç][aã]o|caixa\s+de\s+medi[cç][aã]o/i, "medicao"],
  [/aterramento|haste|terra|spda|para-?raios/i, "aterramento_spda"],
  [/demanda|carga\s+instalada|kva|kw/i, "demanda_carga"],
  [/afastamento|edifica[cç][aã]o|janela|sacada|muro|dist[aâ]ncia/i, "afastamento"],
  [/gera[cç][aã]o\s+distribu[ií]da|microgera[cç][aã]o|minigera[cç][aã]o|\bgd\b/i, "geracao_distribuida"],
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
    Boolean(chunk.tableNumber) ||
    /tabela\s+\d+/i.test(chunk.text);
  const isFigure =
    chunk.chunkType === "NORMATIVE_DRAWING" ||
    pageType === "DRAWING_PAGE" ||
    pageType === "MIXED_TECHNICAL_PAGE" ||
    /desenho\s+\d+|figura\s+\d+|diagrama|esquema/i.test(chunk.text);
  const isSummary = chunk.chunkType === "SUMMARY" || pageType === "SUMMARY_PAGE";
  const isCover = pageType === "COVER_PAGE";
  const isDefinition =
    chunk.chunkType === "DEFINITION" ||
    /\b(defini[cç][aã]o|termos\s+e\s+defini[cç][oõ]es)\b/i.test(chunk.text);
  const isProcedure =
    chunk.chunkType === "PROCEDURE" ||
    /\b(procedimento|solicita[cç][aã]o|etapas?|passo\s+a\s+passo)\b/i.test(chunk.text);
  const isSizingCriteria =
    /dimensionamento|demanda|carga\s+instalada|kva|kw|mm[²2]|disjuntor|bitola|corrente/i.test(
      chunk.text,
    );
  const isRequirement =
    chunk.chunkType === "REQUIREMENT" ||
    /\b(deve|dever[aã]o|obrigat[oó]rio|limite|m[ií]nimo|crit[eé]rio|exig[eê]ncia)\b/i.test(
      chunk.text,
    );
  const voltageLevel = detectVoltageLevel(lower);
  const technicalIntent = getStringMetadata(chunk, "technicalIntent") ?? inferTechnicalIntent(lower);
  const topic = inferTopic(technicalTerms, technicalIntent, isFigure, isTable);
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
  if (/medicao|medidor/.test(normalizedText)) return "METERING";
  if (/aterramento|spda|para-raios/.test(normalizedText)) return "GROUNDING";
  return null;
}

function inferTopic(
  technicalTerms: string[],
  technicalIntent: string | null,
  isFigure: boolean,
  isTable: boolean,
) {
  if (technicalTerms.includes("afastamento")) return "afastamento_condutores_edificacoes";
  if (technicalTerms.includes("subestacao")) return "subestacao";
  if (technicalTerms.includes("cabos_condutores")) return "cabos_condutores";
  if (technicalTerms.includes("protecao")) return "protecao";
  if (technicalTerms.includes("demanda_carga")) return "demanda_carga_instalada";
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
