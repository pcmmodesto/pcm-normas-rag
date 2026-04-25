import type {
  AccessLevel,
  QuestionAudience,
  QuestionClassification,
  QuestionComplexity,
  QueryType,
} from "./domain-types";
import { detectMissingContext } from "./missing-context";

type KeywordRule = {
  term: string;
  topic: string;
  queryType?: QueryType;
};

const freeRules: KeywordRule[] = [
  { term: "ligacao nova", topic: "ligacao nova", queryType: "STEP_BY_STEP" },
  { term: "ligação nova", topic: "ligacao nova", queryType: "STEP_BY_STEP" },
  { term: "documentos", topic: "documentos", queryType: "DOCUMENT_LIST" },
  { term: "baixa tensao", topic: "baixa tensao", queryType: "BASIC_INFO" },
  { term: "baixa tensão", topic: "baixa tensao", queryType: "BASIC_INFO" },
  { term: "padrao de entrada simples", topic: "padrao de entrada", queryType: "STEP_BY_STEP" },
  { term: "padrão de entrada simples", topic: "padrao de entrada", queryType: "STEP_BY_STEP" },
  { term: "conta de energia", topic: "atendimento", queryType: "BASIC_INFO" },
  { term: "consumidor", topic: "atendimento", queryType: "BASIC_INFO" },
  { term: "residencia", topic: "cliente residencial", queryType: "BASIC_INFO" },
  { term: "residência", topic: "cliente residencial", queryType: "BASIC_INFO" },
  { term: "comercio pequeno", topic: "cliente comercial", queryType: "BASIC_INFO" },
  { term: "comércio pequeno", topic: "cliente comercial", queryType: "BASIC_INFO" },
  { term: "passo a passo", topic: "passo a passo", queryType: "STEP_BY_STEP" },
  { term: "solicitar energia", topic: "atendimento", queryType: "STEP_BY_STEP" },
  { term: "troca de titularidade", topic: "titularidade", queryType: "STEP_BY_STEP" },
  { term: "religacao", topic: "religacao", queryType: "STEP_BY_STEP" },
  { term: "religação", topic: "religacao", queryType: "STEP_BY_STEP" },
  { term: "segunda via", topic: "segunda via", queryType: "BASIC_INFO" },
  { term: "protocolo", topic: "protocolo", queryType: "BASIC_INFO" },
];

const paidRules: KeywordRule[] = [
  { term: "subestacao", topic: "subestacao", queryType: "SUBSTATION" },
  { term: "subestação", topic: "subestacao", queryType: "SUBSTATION" },
  { term: "kva", topic: "potencia", queryType: "DIMENSIONING" },
  { term: "media tensao", topic: "media tensao", queryType: "TECHNICAL_CRITERIA" },
  { term: "média tensão", topic: "media tensao", queryType: "TECHNICAL_CRITERIA" },
  { term: "13,8 kv", topic: "13,8 kV", queryType: "DIMENSIONING" },
  { term: "34,5 kv", topic: "34,5 kV", queryType: "DIMENSIONING" },
  { term: "rede aerea", topic: "rede aerea", queryType: "NETWORK_STRUCTURE" },
  { term: "rede aérea", topic: "rede aerea", queryType: "NETWORK_STRUCTURE" },
  { term: "rede subterranea", topic: "rede subterranea", queryType: "NETWORK_STRUCTURE" },
  { term: "rede subterrânea", topic: "rede subterranea", queryType: "NETWORK_STRUCTURE" },
  { term: "cabo", topic: "cabo", queryType: "DIMENSIONING" },
  { term: "bitola", topic: "bitola", queryType: "DIMENSIONING" },
  { term: "awg", topic: "AWG", queryType: "DIMENSIONING" },
  { term: " ca", topic: "CA", queryType: "MATERIAL_SPECIFICATION" },
  { term: "caa", topic: "CAA", queryType: "MATERIAL_SPECIFICATION" },
  { term: "estrutura", topic: "estrutura", queryType: "NETWORK_STRUCTURE" },
  { term: "poste", topic: "poste", queryType: "NETWORK_STRUCTURE" },
  { term: "cruzeta", topic: "cruzeta", queryType: "MATERIAL_SPECIFICATION" },
  { term: "isolador", topic: "isolador", queryType: "MATERIAL_SPECIFICATION" },
  { term: "angulo", topic: "angulo", queryType: "NETWORK_STRUCTURE" },
  { term: "ângulo", topic: "angulo", queryType: "NETWORK_STRUCTURE" },
  { term: "tracao", topic: "tracao", queryType: "TECHNICAL_CRITERIA" },
  { term: "tração", topic: "tracao", queryType: "TECHNICAL_CRITERIA" },
  { term: "vao", topic: "vao", queryType: "TECHNICAL_CRITERIA" },
  { term: "vão", topic: "vao", queryType: "TECHNICAL_CRITERIA" },
  { term: "transformador", topic: "transformador", queryType: "SUBSTATION" },
  { term: "protecao", topic: "protecao", queryType: "TECHNICAL_CRITERIA" },
  { term: "proteção", topic: "protecao", queryType: "TECHNICAL_CRITERIA" },
  { term: "disjuntor", topic: "disjuntor", queryType: "MATERIAL_SPECIFICATION" },
  { term: "chave fusivel", topic: "chave fusivel", queryType: "MATERIAL_SPECIFICATION" },
  { term: "chave fusível", topic: "chave fusivel", queryType: "MATERIAL_SPECIFICATION" },
  { term: "elo fusivel", topic: "elo fusivel", queryType: "MATERIAL_SPECIFICATION" },
  { term: "elo fusível", topic: "elo fusivel", queryType: "MATERIAL_SPECIFICATION" },
  { term: "para-raios", topic: "para-raios", queryType: "MATERIAL_SPECIFICATION" },
  { term: "queda de tensao", topic: "queda de tensao", queryType: "DIMENSIONING" },
  { term: "queda de tensão", topic: "queda de tensao", queryType: "DIMENSIONING" },
  { term: "curto-circuito", topic: "curto-circuito", queryType: "DIMENSIONING" },
  { term: "abaco", topic: "abaco", queryType: "ABACO_LOOKUP" },
  { term: "ábaco", topic: "abaco", queryType: "ABACO_LOOKUP" },
  { term: "tabela", topic: "tabela", queryType: "TABLE_LOOKUP" },
  { term: "epd", topic: "EPD", queryType: "TECHNICAL_CRITERIA" },
  { term: "epe", topic: "EPE", queryType: "TECHNICAL_CRITERIA" },
  { term: "especificacao tecnica", topic: "especificacao tecnica", queryType: "MATERIAL_SPECIFICATION" },
  { term: "especificação técnica", topic: "especificacao tecnica", queryType: "MATERIAL_SPECIFICATION" },
  { term: "material padronizado", topic: "material padronizado", queryType: "MATERIAL_SPECIFICATION" },
];

const stateTerms = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export function classifyUserQuestion(question: string): QuestionClassification {
  const normalized = normalize(question);
  const freeMatches = matchRules(normalized, freeRules);
  const paidMatches = matchRules(normalized, paidRules);
  const detectedVoltageLevel = detectVoltageLevel(normalized);
  const detectedState = detectState(question);
  const detectedUtility = detectUtility(normalized);
  const requiresPaidAccess = paidMatches.length > 0;
  const audience: QuestionAudience = requiresPaidAccess
    ? "TECHNICAL"
    : freeMatches.length > 0
      ? "CLIENT"
      : "UNKNOWN";
  const complexity: QuestionComplexity = requiresPaidAccess
    ? paidMatches.length >= 2 || detectedVoltageLevel
      ? "ADVANCED"
      : "INTERMEDIATE"
    : "SIMPLE";
  const queryType = inferQueryType(paidMatches, freeMatches);
  const suggestedAccessLevel: AccessLevel = requiresPaidAccess
    ? "PAID_SINGLE"
    : "FREE";
  const detectedTopics = unique([
    ...freeMatches.map((match) => match.topic),
    ...paidMatches.map((match) => match.topic),
  ]);
  const classification = {
    audience,
    complexity,
    queryType,
    suggestedAccessLevel,
    detectedTopics,
    detectedVoltageLevel,
    detectedUtility,
    detectedState,
    requiresPaidAccess,
    missingRequiredContext: [],
  };

  return {
    ...classification,
    missingRequiredContext: detectMissingContext(classification),
  };
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchRules(question: string, rules: KeywordRule[]) {
  return rules.filter((rule) => question.includes(normalize(rule.term)));
}

function inferQueryType(
  paidMatches: KeywordRule[],
  freeMatches: KeywordRule[],
): QueryType {
  return (
    paidMatches.find((match) => match.queryType)?.queryType ??
    freeMatches.find((match) => match.queryType)?.queryType ??
    "UNKNOWN"
  );
}

function detectVoltageLevel(question: string) {
  if (question.includes("34,5 kv") || question.includes("34.5 kv")) {
    return "34,5 kV";
  }

  if (question.includes("13,8 kv") || question.includes("13.8 kv")) {
    return "13,8 kV";
  }

  if (question.includes("media tensao")) {
    return "MEDIA_TENSAO";
  }

  if (question.includes("baixa tensao")) {
    return "BAIXA_TENSAO";
  }

  return undefined;
}

function detectState(question: string) {
  const upperQuestion = question.toUpperCase();
  return stateTerms.find((state) => new RegExp(`\\b${state}\\b`).test(upperQuestion));
}

function detectUtility(question: string) {
  if (question.includes("equatorial")) {
    return "Equatorial";
  }

  if (question.includes("neoenergia")) {
    return "Neoenergia";
  }

  if (question.includes("energisa")) {
    return "Energisa";
  }

  return undefined;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
