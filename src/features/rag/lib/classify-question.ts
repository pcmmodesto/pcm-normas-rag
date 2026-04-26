import {
  AUDIENCE_LABELS,
  classifyQueryAudience,
  classifyTechnicalIntent,
  detectMissingContext,
  INTENT_LABELS,
  type QueryAudience,
  type TechnicalIntent,
} from "@/features/rag/search/intent-classifier";

export type ProductAudienceType = "LEIGO" | "TECNICO" | "ENGENHEIRO" | "ADMIN";

export type ProductQueryType =
  | "BASIC_BT_FREE"
  | "TECHNICAL_PAID"
  | "MISSING_CONTEXT"
  | "OUT_OF_SCOPE"
  | "UNSAFE_OR_UNSUPPORTED"
  | "ADMIN_QUERY";

export type TechnicalCategory =
  | "baixa_tensao"
  | "media_tensao"
  | "subestacao"
  | "geracao_distribuida"
  | "padrao_entrada"
  | "medicao"
  | "ramal_ligacao"
  | "aterramento"
  | "protecao"
  | "spda"
  | "materiais_e_equipamentos"
  | "criterios_projeto"
  | "normas_conexao"
  | "atendimento_comercial"
  | "documentos_necessarios"
  | "cobranca_faturamento"
  | "fiscalizacao_vistoria"
  | "transformadores"
  | "demanda_carga_instalada"
  | "concessionaria_estado"
  | "desconhecida";

export type ProductQuestionClassification = {
  audienceType: ProductAudienceType;
  queryType: ProductQueryType;
  category: TechnicalCategory;
  accessRequired: "FREE" | "PAID" | "ADMIN_ONLY";
  internalAudience: QueryAudience;
  internalIntent: TechnicalIntent;
  internalAudienceLabel: string;
  internalIntentLabel: string;
  missingContext: string[];
  detectedSynonyms: string[];
};

const synonymGroups = [
  ["padrao de entrada", "entrada de servico", "medicao", "caixa de medicao"],
  ["ramal de entrada", "ramal de ligacao", "condutor de entrada"],
  ["subestacao", "cabine primaria", "entrada em media tensao"],
  ["geracao distribuida", "microgeracao", "minigeracao", "gd"],
  ["baixa tensao", "bt"],
  ["media tensao", "mt"],
  ["demanda", "carga demandada"],
  ["carga instalada", "potencia instalada"],
];

export function classifyQuestion(question: string): ProductQuestionClassification {
  const internalAudience = classifyQueryAudience(question);
  const internalIntent = classifyTechnicalIntent(question);
  const missingContext = detectMissingContext(question, internalAudience);
  const audienceType = mapAudience(internalAudience, question);
  const category = mapCategory(internalIntent, question);
  const isPaid =
    audienceType === "TECNICO" ||
    audienceType === "ENGENHEIRO" ||
    [
      "media_tensao",
      "subestacao",
      "protecao",
      "transformadores",
      "demanda_carga_instalada",
      "materiais_e_equipamentos",
    ].includes(category);

  const queryType: ProductQueryType =
    missingContext.length > 0 && isPaid
      ? "MISSING_CONTEXT"
      : isPaid
        ? "TECHNICAL_PAID"
        : "BASIC_BT_FREE";

  return {
    audienceType,
    queryType,
    category,
    accessRequired: isPaid ? "PAID" : "FREE",
    internalAudience,
    internalIntent,
    internalAudienceLabel: AUDIENCE_LABELS[internalAudience],
    internalIntentLabel: INTENT_LABELS[internalIntent],
    missingContext,
    detectedSynonyms: detectSynonyms(question),
  };
}

function mapAudience(audience: QueryAudience, question: string): ProductAudienceType {
  const normalized = normalize(question);

  if (normalized.includes("admin") || normalized.includes("processar documento")) {
    return "ADMIN";
  }

  if (audience === "TECNICO_DIMENSIONAMENTO") {
    return normalized.includes("engenheiro") || normalized.includes("projeto")
      ? "ENGENHEIRO"
      : "TECNICO";
  }

  return "LEIGO";
}

function mapCategory(intent: TechnicalIntent, question: string): TechnicalCategory {
  const normalized = normalize(question);

  if (/media tensao|\bmt\b|13[,.]8\s*kv|34[,.]5\s*kv/.test(normalized)) return "media_tensao";
  if (/subestacao|cabine primaria/.test(normalized)) return "subestacao";
  if (/geracao distribuida|microgeracao|minigeracao|\bgd\b/.test(normalized)) return "geracao_distribuida";
  if (/protecao|disjuntor|fusivel|para.?raio/.test(normalized)) return "protecao";
  if (/transformador/.test(normalized)) return "transformadores";
  if (/vistoria|fiscalizacao/.test(normalized)) return "fiscalizacao_vistoria";
  if (/fatura|cobranca|tarifa/.test(normalized)) return "cobranca_faturamento";

  switch (intent) {
    case "SERVICE_ENTRANCE_CABLE":
      return "ramal_ligacao";
    case "SERVICE_ENTRANCE_STANDARD":
      return "padrao_entrada";
    case "SERVICE_CONNECTION_DOCUMENTS":
      return "documentos_necessarios";
    case "LOAD_DEMAND":
      return "demanda_carga_instalada";
    case "METERING":
      return "medicao";
    case "GROUNDING":
      return normalized.includes("spda") ? "spda" : "aterramento";
    case "VOLTAGE_SUPPLY":
      return "concessionaria_estado";
    case "GENERAL_LOW_VOLTAGE":
      return "baixa_tensao";
    default:
      return "desconhecida";
  }
}

function detectSynonyms(question: string) {
  const normalized = normalize(question);
  return synonymGroups
    .flatMap((group) => group.filter((term) => normalized.includes(normalize(term))))
    .filter((term, index, list) => list.indexOf(term) === index);
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
