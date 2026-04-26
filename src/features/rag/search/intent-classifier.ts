export type TechnicalIntent =
  | "SERVICE_ENTRANCE_CABLE"
  | "SERVICE_ENTRANCE_STANDARD"
  | "SERVICE_CONNECTION_DOCUMENTS"
  | "LOAD_DEMAND"
  | "METERING"
  | "GROUNDING"
  | "VOLTAGE_SUPPLY"
  | "GENERAL_LOW_VOLTAGE"
  | "UNKNOWN";

export type QueryAudience =
  | "LEIGO_ATENDIMENTO"
  | "TECNICO_DIMENSIONAMENTO"
  | "NORMA_REFERENCIA"
  | "INSUFICIENTE_CONTEXTO";

export const INTENT_REQUIRED_TERMS: Record<TechnicalIntent, string[]> = {
  SERVICE_ENTRANCE_CABLE: ["ramal", "cabo", "condutor", "bitola", "ligacao"],
  SERVICE_ENTRANCE_STANDARD: ["padrao", "entrada", "medidor", "caixa"],
  SERVICE_CONNECTION_DOCUMENTS: ["documento", "lista", "necessario", "solicitacao", "ligacao"],
  LOAD_DEMAND: ["demanda", "carga", "potencia", "kva", "kw"],
  METERING: ["medicao", "medidor", "relogio", "tarifa"],
  GROUNDING: ["aterramento", "terra", "spda"],
  VOLTAGE_SUPPLY: ["tensao", "atendimento", "fornecimento", "kv"],
  GENERAL_LOW_VOLTAGE: ["instalacao", "eletrica", "norma", "baixa"],
  UNKNOWN: [],
};

export const MIN_SCORE_BY_INTENT: Record<TechnicalIntent, number> = {
  SERVICE_ENTRANCE_CABLE: 50,
  SERVICE_ENTRANCE_STANDARD: 40,
  SERVICE_CONNECTION_DOCUMENTS: 30,
  LOAD_DEMAND: 40,
  METERING: 35,
  GROUNDING: 40,
  VOLTAGE_SUPPLY: 35,
  GENERAL_LOW_VOLTAGE: 25,
  UNKNOWN: 20,
};

export const INTENT_LABELS: Record<TechnicalIntent, string> = {
  SERVICE_ENTRANCE_CABLE: "Ramal / cabo de entrada",
  SERVICE_ENTRANCE_STANDARD: "Padrao de entrada",
  SERVICE_CONNECTION_DOCUMENTS: "Documentos para ligacao",
  LOAD_DEMAND: "Demanda e carga",
  METERING: "Medicao e medidor",
  GROUNDING: "Aterramento",
  VOLTAGE_SUPPLY: "Tensao de atendimento",
  GENERAL_LOW_VOLTAGE: "Instalacoes de baixa tensao",
  UNKNOWN: "Consulta geral",
};

export const AUDIENCE_LABELS: Record<QueryAudience, string> = {
  LEIGO_ATENDIMENTO: "Atendimento ao cliente",
  TECNICO_DIMENSIONAMENTO: "Dimensionamento tecnico",
  NORMA_REFERENCIA: "Referencia normativa",
  INSUFICIENTE_CONTEXTO: "Contexto insuficiente",
};

// Terms prioritized when scoring chunks for layperson queries
export const LEIGO_PRIORITY_TERMS = [
  "ligacao nova",
  "nova ligacao",
  "solicitacao",
  "solicitar",
  "atendimento",
  "fornecimento",
  "padrao de entrada",
  "unidade consumidora",
  "documentos",
  "documentacao",
  "consumidor",
  "concessionaria",
  "pedido",
  "conexao",
  "carga instalada",
  "entrada de servico",
];

// Terms penalized in layperson queries (off-topic technical content)
export const LEIGO_OFF_TOPIC_TERMS = [
  "rele termico",
  "protecao de motor",
  "motores trifasicos",
  "nbr 5101",
  "iluminacao viaria",
  "falta de fase",
  "curto-circuito",
  "subestacao de distribuicao",
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function classifyQueryAudience(question: string): QueryAudience {
  const n = normalize(question);

  // Looking for a specific norm page or item → NORMA_REFERENCIA
  if (/qual norma|em qual (pagina|item|secao|artigo)|qual (item|artigo|secao) da norma/.test(n)) {
    return "NORMA_REFERENCIA";
  }

  // Clear layperson patterns: "how to request", city reference, second copy, etc.
  if (
    /como (posso|fazer|solicitar|pedir|fa[cç]o)|solicitar (liga[cç]ao|energia)|pedir (liga[cç]ao|energia)/.test(n) ||
    /liga[cç]ao nova|nova liga[cç]ao|segunda via|religan[cç]ao|religacao|titularidade/.test(n) ||
    /quais documentos|documentos necessarios|o que preciso/.test(n) ||
    /(cidade|municipio)\s+de\s+\w|em\s+(altamira|belem|fortaleza|manaus|recife|goiania|cuiaba|palmas|macapa|porto velho)/.test(n) ||
    /qual concession|a equatorial (liga|atende|cobre)/.test(n)
  ) {
    return "LEIGO_ATENDIMENTO";
  }

  // Technical questions with measurable specs → TECNICO_DIMENSIONAMENTO
  if (
    /bitola|condutor|cabo|disjuntor|demanda|queda de tens[aã]o|corrente nominal|kva|kw|ramal de entrada|padr[aã]o de entrada/.test(n)
  ) {
    return "TECNICO_DIMENSIONAMENTO";
  }

  // Default: lean layperson if no technical indicators
  const hasTechMarker = /mm[²2]|kva|kw|kv|\d+\s*a\b|bitola|condutor|disjuntor/.test(n);
  return hasTechMarker ? "TECNICO_DIMENSIONAMENTO" : "LEIGO_ATENDIMENTO";
}

export function classifyTechnicalIntent(question: string): TechnicalIntent {
  const n = normalize(question);

  if (
    /ramal.*(entrada|ligacao|acesso)|bitola.*(ramal|cabo|fio)|cabo.*(ramal|entrada)|condutor.*(ramal|entrada)/.test(n)
  ) {
    return "SERVICE_ENTRANCE_CABLE";
  }

  if (
    /padrao.*(entrada|medidor|eletrico|energia)|caixa.*(medidor|entrada|medicao)|quadro.*(entrada|medidor)/.test(n)
  ) {
    return "SERVICE_ENTRANCE_STANDARD";
  }

  if (
    /documento.*(ligacao|nova|necessario)|lista.*(documento|requisito)|requisito.*(ligacao|nova)|solicitar.*(ligacao|nova)/.test(n)
  ) {
    return "SERVICE_CONNECTION_DOCUMENTS";
  }

  if (/demanda|carga instalada|potencia instalada|kva|kw/.test(n)) {
    return "LOAD_DEMAND";
  }

  if (/medic[ao]|medidor|relogio|tarifa|fatura/.test(n)) {
    return "METERING";
  }

  if (/aterramento|terra|spda|para.?raio/.test(n)) {
    return "GROUNDING";
  }

  if (
    /tensao.*(atendimento|fornecimento|distribuicao)|media tensao|alta tensao|\d+[,.]?\d*\s*kv/.test(n)
  ) {
    return "VOLTAGE_SUPPLY";
  }

  if (/instalacao|eletric[ao]|norma|requisito|baixa tensao/.test(n)) {
    return "GENERAL_LOW_VOLTAGE";
  }

  return "UNKNOWN";
}

export function detectMissingContext(question: string, audience: QueryAudience): string[] {
  if (audience !== "TECNICO_DIMENSIONAMENTO") return [];

  const n = normalize(question);
  const missing: string[] = [];

  if (!/kva|kw|carga|potencia|\d+\s*(a\b|v\b|kv)/.test(n)) {
    missing.push("carga ou potencia (ex.: 15 kVA, 20 kW)");
  }
  if (!/monofasico|bifasico|trifasico|mono[- ]fasico|bi[- ]fasico|tri[- ]fasico/.test(n)) {
    missing.push("tipo de ligacao (monofasico, bifasico ou trifasico)");
  }
  if (!/tens[aã]o|kv|127|220|380|440/.test(n)) {
    missing.push("tensao de atendimento (ex.: 127/220 V, 220/380 V)");
  }

  return missing;
}

export function extractKeywords(question: string): string[] {
  const stopwords = new Set([
    "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "da", "do",
    "das", "dos", "em", "na", "no", "nas", "nos", "para", "por", "com",
    "que", "qual", "quais", "como", "quando", "onde", "e", "ou", "se",
    "me", "te", "nos", "isso", "isto", "esse", "essa", "este", "esta",
    "aquele", "aquela", "meu", "minha", "seu", "sua", "dele", "dela",
    "sao", "foi", "era", "ser", "ter", "mais", "menos", "muito",
    "nao", "sim", "tambem", "ja", "ate", "pela", "pelo", "sobre",
    "entre", "contra", "pelas", "pelos", "apos", "caso", "tipo",
    "posso", "fazer", "faco", "pode", "podem",
  ]);

  return normalize(question)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopwords.has(w))
    .slice(0, 10);
}
