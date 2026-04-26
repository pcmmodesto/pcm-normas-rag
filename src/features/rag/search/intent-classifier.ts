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

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function classifyTechnicalIntent(question: string): TechnicalIntent {
  const n = normalize(question);

  if (
    /ramal.*(entrada|ligacao|acesso)|bitola.*(ramal|cabo|fio)|cabo.*(ramal|entrada)|condutor.*(ramal|entrada)/.test(
      n,
    )
  ) {
    return "SERVICE_ENTRANCE_CABLE";
  }

  if (
    /padrao.*(entrada|medidor|eletrico|energia)|caixa.*(medidor|entrada|medicao)|quadro.*(entrada|medidor)/.test(
      n,
    )
  ) {
    return "SERVICE_ENTRANCE_STANDARD";
  }

  if (
    /documento.*(ligacao|nova|necessario)|lista.*(documento|requisito)|requisito.*(ligacao|nova)|solicitar.*(ligacao|nova)/.test(
      n,
    )
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
    /tensao.*(atendimento|fornecimento|distribuicao)|media tensao|alta tensao|\d+[,.]?\d*\s*kv/.test(
      n,
    )
  ) {
    return "VOLTAGE_SUPPLY";
  }

  if (/instalacao|eletric[ao]|norma|requisito|baixa tensao/.test(n)) {
    return "GENERAL_LOW_VOLTAGE";
  }

  return "UNKNOWN";
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
  ]);

  return normalize(question)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopwords.has(w))
    .slice(0, 10);
}
