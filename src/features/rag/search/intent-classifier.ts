export type TechnicalIntent =
  | "SERVICE_ENTRANCE_CABLE"
  | "SERVICE_ENTRANCE_STANDARD"
  | "SERVICE_CONNECTION_DOCUMENTS"
  | "SERVICE_REQUEST"
  | "DOCUMENTATION"
  | "LOAD_DEMAND"
  | "PROTECTION"
  | "SUBSTATION"
  | "DRAWING_REFERENCE"
  | "MATERIAL_RESPONSIBILITY"
  | "DIMENSION_REQUIREMENT"
  | "METERING"
  | "GROUNDING"
  | "VOLTAGE_SUPPLY"
  | "VOLTAGE_LEVEL"
  | "GENERAL_LOW_VOLTAGE"
  | "UNKNOWN";

export type QueryAudience =
  | "LEIGO_ATENDIMENTO"
  | "TECNICO_DIMENSIONAMENTO"
  | "NORMA_REFERENCIA"
  | "INSUFICIENTE_CONTEXTO";

export const INTENT_REQUIRED_TERMS: Record<TechnicalIntent, string[]> = {
  SERVICE_ENTRANCE_CABLE: [
    "ramal",
    "entrada",
    "cabo",
    "condutor",
    "bitola",
    "tabela",
    "ramal de conexao",
    "dimensionamento do ramal",
  ],
  SERVICE_ENTRANCE_STANDARD: ["padrao", "entrada", "medidor", "caixa", "categoria", "tabela"],
  SERVICE_CONNECTION_DOCUMENTS: ["documento", "lista", "necessario", "solicitacao", "ligacao"],
  SERVICE_REQUEST: ["ligacao nova", "nova ligacao", "solicitacao", "solicitar", "fornecimento"],
  DOCUMENTATION: ["documento", "documentacao", "necessario", "lista", "cpf", "cnpj"],
  LOAD_DEMAND: ["demanda", "carga", "potencia", "kva", "kw", "carga instalada"],
  PROTECTION: ["disjuntor", "protecao", "fusivel", "corrente", "ampere", "termomagnetico", "tabela"],
  SUBSTATION: ["subestacao", "transformacao", "transformador", "media tensao", "cabine"],
  DRAWING_REFERENCE: ["desenho", "legenda", "tabela", "nota", "padrao de entrada"],
  MATERIAL_RESPONSIBILITY: ["material", "materiais", "fornece", "responsabilidade", "concessionaria"],
  DIMENSION_REQUIREMENT: ["altura", "cota", "medidor", "caixa de medicao", "mm"],
  METERING: ["medicao", "medidor", "relogio", "tarifa"],
  GROUNDING: ["aterramento", "terra", "spda"],
  VOLTAGE_SUPPLY: ["tensao", "atendimento", "fornecimento", "kv"],
  VOLTAGE_LEVEL: ["baixa tensao", "media tensao", "limite de fornecimento", "fornecimento", "bt"],
  GENERAL_LOW_VOLTAGE: ["instalacao", "eletrica", "norma", "baixa"],
  UNKNOWN: [],
};

export const MIN_SCORE_BY_INTENT: Record<TechnicalIntent, number> = {
  SERVICE_ENTRANCE_CABLE: 50,
  SERVICE_ENTRANCE_STANDARD: 40,
  SERVICE_CONNECTION_DOCUMENTS: 30,
  SERVICE_REQUEST: 30,
  DOCUMENTATION: 30,
  LOAD_DEMAND: 40,
  PROTECTION: 45,
  SUBSTATION: 45,
  DRAWING_REFERENCE: 35,
  MATERIAL_RESPONSIBILITY: 35,
  DIMENSION_REQUIREMENT: 35,
  METERING: 35,
  GROUNDING: 40,
  VOLTAGE_SUPPLY: 35,
  VOLTAGE_LEVEL: 35,
  GENERAL_LOW_VOLTAGE: 25,
  UNKNOWN: 20,
};

export const INTENT_LABELS: Record<TechnicalIntent, string> = {
  SERVICE_ENTRANCE_CABLE: "Ramal / cabo de entrada",
  SERVICE_ENTRANCE_STANDARD: "Padrao de entrada",
  SERVICE_CONNECTION_DOCUMENTS: "Documentos para ligacao",
  SERVICE_REQUEST: "Solicitacao de fornecimento",
  DOCUMENTATION: "Documentacao",
  LOAD_DEMAND: "Demanda e carga",
  PROTECTION: "Protecao e disjuntor",
  SUBSTATION: "Subestacao",
  DRAWING_REFERENCE: "Desenho, legenda e notas",
  MATERIAL_RESPONSIBILITY: "Materiais e responsabilidade de fornecimento",
  DIMENSION_REQUIREMENT: "Cotas e requisitos dimensionais",
  METERING: "Medicao e medidor",
  GROUNDING: "Aterramento",
  VOLTAGE_SUPPLY: "Tensao de atendimento",
  VOLTAGE_LEVEL: "Nivel e limite de fornecimento",
  GENERAL_LOW_VOLTAGE: "Instalacoes de baixa tensao",
  UNKNOWN: "Consulta geral",
};

export const AUDIENCE_LABELS: Record<QueryAudience, string> = {
  LEIGO_ATENDIMENTO: "Atendimento ao cliente",
  TECNICO_DIMENSIONAMENTO: "Dimensionamento tecnico",
  NORMA_REFERENCIA: "Referencia normativa",
  INSUFICIENTE_CONTEXTO: "Contexto insuficiente",
};

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
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function classifyQueryAudience(question: string): QueryAudience {
  const n = normalize(question);

  if (/qual norma|em qual (pagina|item|secao|artigo)|qual (item|artigo|secao) da norma/.test(n)) {
    return "NORMA_REFERENCIA";
  }

  const hasExplicitServiceRequest =
    /como (posso|fazer|solicitar|pedir|faco)|solicitar (ligacao|energia|fornecimento)|pedir (ligacao|energia)|como pedir|ligacao nova|nova ligacao|segunda via|religacao|titularidade|quais documentos|documentos necessarios|o que preciso|qual concession|a equatorial (liga|atende|cobre)/.test(n);
  const hasHardDimensioningMarker =
    /\bcabo\b|bitola|condutor|ramal|disjuntor|protecao|\bkva\b|\bkw\b|carga instalada|demanda|padrao de entrada|subestacao|desenho\s+\d+|legenda|altura|medidor|caixa de medicao|materiais|responsabilidade|concessionaria|127\s*\/\s*220|220\s*\/\s*(?:380|308)|trifasico|monofasico|bifasico/.test(n);
  const hasTechnicalDimensioningMarker =
    /\bcabo\b|bitola|condutor|ramal|entrada|disjuntor|protecao|\bkva\b|\bkw\b|carga instalada|demanda|padrao de entrada|subestacao|medicao|desenho\s+\d+|legenda|altura|medidor|caixa de medicao|materiais|responsabilidade|concessionaria|127\s*\/\s*220|220\s*\/\s*(?:380|308)|trifasico|monofasico|bifasico|baixa tensao|media tensao/.test(n);

  if (hasExplicitServiceRequest && !hasHardDimensioningMarker) {
    return "LEIGO_ATENDIMENTO";
  }

  if (hasTechnicalDimensioningMarker) {
    return "TECNICO_DIMENSIONAMENTO";
  }

  if (
    /como (posso|fazer|solicitar|pedir|faco)|solicitar (ligacao|energia|fornecimento)|pedir (ligacao|energia)|como pedir/.test(n) ||
    /ligacao nova|nova ligacao|segunda via|religacao|titularidade/.test(n) ||
    /quais documentos|documentos necessarios|o que preciso/.test(n) ||
    /qual concession|a equatorial (liga|atende|cobre)/.test(n)
  ) {
    return "LEIGO_ATENDIMENTO";
  }

  const hasTechMarker = /mm[²2]|kva|kw|kv|\d+\s*a\b|bitola|condutor|disjuntor/.test(n);
  return hasTechMarker ? "TECNICO_DIMENSIONAMENTO" : "LEIGO_ATENDIMENTO";
}

export function classifyTechnicalIntent(question: string): TechnicalIntent {
  return classifyTechnicalIntents(question).primary;
}

export function classifyTechnicalIntents(question: string): {
  primary: TechnicalIntent;
  secondary: TechnicalIntent[];
} {
  const n = normalize(question);
  const intents: TechnicalIntent[] = [];
  const add = (intent: TechnicalIntent) => {
    if (!intents.includes(intent)) intents.push(intent);
  };

  if (/cabo de entrada|bitola|ramal.*(entrada|ligacao|acesso)|cabo.*(ramal|entrada)|condutor.*(ramal|entrada)/.test(n)) {
    add("SERVICE_ENTRANCE_CABLE");
  }

  if (/disjuntor|protecao|fusivel|corrente nominal/.test(n)) {
    add("PROTECTION");
    add("SERVICE_ENTRANCE_STANDARD");
  }

  if (/padrao de entrada|padrao.*(entrada|medidor|eletrico|energia)|caixa.*(medidor|entrada|medicao)|quadro.*(entrada|medidor)|\bentrada\b/.test(n)) {
    add("SERVICE_ENTRANCE_STANDARD");
  }

  if (/documento.*(ligacao|nova|necessario)|lista.*(documento|requisito)|requisito.*(ligacao|nova)|quais documentos|documentos necessarios/.test(n)) {
    add("DOCUMENTATION");
    add("SERVICE_REQUEST");
  }

  if (/como pedir|como solicitar|solicitar.*(ligacao|fornecimento)|pedir.*(ligacao|fornecimento)|ligacao nova|nova ligacao/.test(n)) {
    add("SERVICE_REQUEST");
  }

  if (/demanda|carga instalada|potencia instalada|kva|kw/.test(n)) {
    add("LOAD_DEMAND");
  }

  if (/subestacao|cabine primaria|transformador|transformacao/.test(n)) {
    add("SUBSTATION");
  }

  if (/altura|cota|caixa de medicao|altura.*medidor|altura.*caixa/.test(n)) {
    add("DIMENSION_REQUIREMENT");
    add("METERING");
    add("DRAWING_REFERENCE");
  }

  if (/materiais|material|fornece|responsabilidade|concessionaria|asterisco/.test(n)) {
    add("MATERIAL_RESPONSIBILITY");
    add("DRAWING_REFERENCE");
  }

  if (/desenho\s+\d+|legenda do desenho|legenda|nota\s+\d+/.test(n)) {
    add("DRAWING_REFERENCE");
  }

  if (/medicao|medidor|relogio|tarifa|fatura/.test(n)) {
    add("METERING");
  }

  if (/aterramento|terra|spda|para.?raio/.test(n)) {
    add("GROUNDING");
  }

  if (/limite de fornecimento|baixa tensao|media tensao|\bbt\b|\bmt\b/.test(n)) {
    add("VOLTAGE_LEVEL");
    add("SERVICE_ENTRANCE_STANDARD");
  }

  if (/tensao.*(atendimento|fornecimento|distribuicao)|alta tensao|\d+[,.]?\d*\s*kv(?!a)/.test(n)) {
    add("VOLTAGE_SUPPLY");
  }

  if (/instalacao|eletrica|norma|requisito|baixa tensao/.test(n)) {
    add("GENERAL_LOW_VOLTAGE");
  }

  if (intents.length === 0) intents.push("UNKNOWN");

  return {
    primary: intents[0],
    secondary: intents.slice(1),
  };
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
  if (!/tensao|kv|127|220|380|440/.test(n)) {
    missing.push("tensao de atendimento (ex.: 127/220 V, 220/380 V)");
  }

  return missing;
}

export function detectDimensioningMissingContext(question: string, intents: TechnicalIntent[]): string[] {
  if (
    !intents.some((intent) =>
      ["SERVICE_ENTRANCE_CABLE", "PROTECTION", "SERVICE_ENTRANCE_STANDARD", "LOAD_DEMAND"].includes(intent),
    )
  ) {
    return [];
  }

  const n = normalize(question);
  const missing: string[] = [];

  if (!/127\s*\/\s*220|220\s*\/\s*(?:380|308)|tensao|baixa tensao|media tensao|\bbt\b|\bmt\b/.test(n)) {
    missing.push("tensao/tabela aplicavel (ex.: 127/220 V, 220/380 V, baixa tensao ou media tensao)");
  }

  if (!/monofasico|bifasico|trifasico|mono[- ]fasico|bi[- ]fasico|tri[- ]fasico/.test(n)) {
    missing.push("tipo de ligacao/atendimento (monofasico, bifasico ou trifasico)");
  }

  if (!/cobre|aluminio|multiplexado|concentrico/.test(n)) {
    missing.push("tipo de condutor quando a tabela separar cobre, aluminio multiplexado ou concentrico");
  }

  return missing;
}

export function isTechnicalDimensioningIntent(intent: TechnicalIntent, secondaryIntents: TechnicalIntent[] = []) {
  return [intent, ...secondaryIntents].some((value) =>
    [
      "SERVICE_ENTRANCE_CABLE",
      "SERVICE_ENTRANCE_STANDARD",
      "LOAD_DEMAND",
      "PROTECTION",
      "SUBSTATION",
      "DRAWING_REFERENCE",
      "MATERIAL_RESPONSIBILITY",
      "DIMENSION_REQUIREMENT",
      "METERING",
      "GROUNDING",
      "VOLTAGE_SUPPLY",
      "VOLTAGE_LEVEL",
      "GENERAL_LOW_VOLTAGE",
    ].includes(value),
  );
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
    "posso", "fazer", "faco", "pode", "podem", "sera",
  ]);

  return normalize(question)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => (w.length >= 3 || /^\d+$/.test(w)) && !stopwords.has(w))
    .slice(0, 10);
}

export type ExpandedSearchTerm = {
  term: string;
  reason: string;
  source: "original" | "intent" | "service";
};

export type TechnicalEntities = {
  city?: string;
  state?: string;
  probableConcessionaire?: string;
  voltage?: string;
  installedLoadKva?: number;
  demand?: string;
  hasKva: boolean;
  hasCable: boolean;
  hasBreaker: boolean;
  hasServiceDrop: boolean;
  hasServiceEntranceStandard: boolean;
  hasMetering: boolean;
  connectionType?: "monofasico" | "bifasico" | "trifasico";
  hasTable: boolean;
  drawingNumber?: string;
  hasClearance: boolean;
  hasHeight: boolean;
  hasMaterials: boolean;
  terms: string[];
};

export function extractTechnicalEntities(question: string): TechnicalEntities {
  const n = normalize(question);
  const city = /altamira/.test(n)
    ? "Altamira"
    : /sao\s+lui[sz]/.test(n)
      ? "Sao Luis"
      : undefined;
  const state =
    /\bpa\b|para/.test(n) || city === "Altamira"
      ? "PA"
      : /\bma\b|maranhao/.test(n) || city === "Sao Luis"
        ? "MA"
        : undefined;
  const probableConcessionaire =
    state === "PA"
      ? "Equatorial Para"
      : state === "MA"
        ? "Equatorial Maranhao"
        : undefined;
  const kvaMatch = /(\d+(?:[,.]\d+)?)\s*kva/.exec(n);
  const voltageMatch = /(127\s*\/\s*220|220\s*\/\s*(?:380|308)|13[,.]8\s*kv|34[,.]5\s*kv|baixa tensao|media tensao)/.exec(n);
  const drawingMatch = /desenho\s+(\d+)/.exec(n);
  const connectionType = /trifasico/.test(n)
    ? "trifasico"
    : /bifasico/.test(n)
      ? "bifasico"
      : /monofasico/.test(n)
        ? "monofasico"
        : undefined;

  const entities: TechnicalEntities = {
    city,
    state,
    probableConcessionaire,
    voltage: normalizeExtractedVoltage(voltageMatch?.[1]),
    installedLoadKva: kvaMatch ? Number(kvaMatch[1].replace(",", ".")) : undefined,
    demand: /demanda/.test(n) ? "demanda" : undefined,
    hasKva: /\bkva\b/.test(n),
    hasCable: /\bcabo\b|bitola|condutor/.test(n),
    hasBreaker: /disjuntor|protecao|fusivel/.test(n),
    hasServiceDrop: /ramal|entrada|ligacao/.test(n),
    hasServiceEntranceStandard: /padrao de entrada|entrada de servico/.test(n),
    hasMetering: /medicao|medidor|caixa de medicao/.test(n),
    connectionType,
    hasTable: /tabela/.test(n),
    drawingNumber: drawingMatch?.[1],
    hasClearance: /afastamento/.test(n),
    hasHeight: /altura|cota/.test(n),
    hasMaterials: /materiais|material|fornece|responsabilidade/.test(n),
    terms: [],
  };

  entities.terms = [
    entities.city,
    entities.state,
    entities.probableConcessionaire,
    entities.voltage,
    entities.installedLoadKva ? `${entities.installedLoadKva} kva` : undefined,
    entities.connectionType,
    entities.hasCable ? "cabo" : undefined,
    entities.hasBreaker ? "disjuntor" : undefined,
    entities.hasServiceDrop ? "ramal entrada ligacao" : undefined,
    entities.hasServiceEntranceStandard ? "padrao de entrada" : undefined,
    entities.hasMetering ? "medicao medidor" : undefined,
    entities.hasTable ? "tabela" : undefined,
    entities.drawingNumber ? `desenho ${entities.drawingNumber}` : undefined,
    entities.hasClearance ? "afastamento" : undefined,
    entities.hasHeight ? "altura" : undefined,
    entities.hasMaterials ? "materiais responsabilidade" : undefined,
  ].filter((term): term is string => Boolean(term));

  return entities;
}

function normalizeExtractedVoltage(voltage: string | undefined) {
  if (!voltage) return undefined;
  const compact = voltage.replace(/\s/g, "");
  if (compact === "220/308") return "220/380";
  return compact;
}

export function shouldUseServiceExpansion(question: string): boolean {
  const n = normalize(question);
  return /como pedir|como solicitar|documentos?|ligacao nova|nova ligacao|solicitar fornecimento|solicitar ligacao|pedido de ligacao|atendimento da concessionaria/.test(n);
}

export function buildExpandedSearchTerms(params: {
  question: string;
  keywords: string[];
  primaryIntent: TechnicalIntent;
  secondaryIntents: TechnicalIntent[];
  audience: QueryAudience;
}): ExpandedSearchTerm[] {
  const terms: ExpandedSearchTerm[] = [];
  const seen = new Set<string>();
  const add = (term: string, reason: string, source: ExpandedSearchTerm["source"]) => {
    const normalized = normalize(term).trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    terms.push({ term: normalized, reason, source });
  };

  for (const keyword of params.keywords) {
    add(keyword, "termo original extraido da pergunta", "original");
  }

  if (params.audience === "LEIGO_ATENDIMENTO" && shouldUseServiceExpansion(params.question)) {
    for (const term of LEIGO_PRIORITY_TERMS.slice(0, 8)) {
      add(term, "expansao permitida por pergunta de solicitacao/atendimento", "service");
    }
  } else {
    for (const intent of [params.primaryIntent, ...params.secondaryIntents]) {
      for (const term of INTENT_REQUIRED_TERMS[intent] ?? []) {
        add(term, `expansao por intencao ${intent}`, "intent");
      }
    }

    if (
      [params.primaryIntent, ...params.secondaryIntents].some((intent) =>
        ["SERVICE_ENTRANCE_CABLE", "PROTECTION", "LOAD_DEMAND", "SERVICE_ENTRANCE_STANDARD"].includes(intent),
      )
    ) {
      [
        "dimensionamento do ramal de conexao",
        "ramal de conexao",
        "carga instalada",
        "disjuntor termomagnetico",
        "cabo de cobre",
        "cabo de aluminio multiplexado",
        "eletroduto",
        "aterramento",
        "127/220",
        "220/380",
      ].forEach((term) =>
        add(term, "expansao tecnica para localizar tabela de dimensionamento", "intent"),
      );
    }
  }

  return terms.slice(0, 28);
}
