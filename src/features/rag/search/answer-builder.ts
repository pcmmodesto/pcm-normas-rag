import type { QueryAudience, TechnicalIntent } from "./intent-classifier";
import { INTENT_LABELS } from "./intent-classifier";
import type { NormativeTableLookupResult, NormativeTableRowResult } from "./normative-table-lookup";

export type AnswerType = "DIRECT" | "PARTIAL" | "INSUFFICIENT" | "NEEDS_CONTEXT";

export type BuiltAnswer = {
  answerType: AnswerType;
  confidence: number;
  answer: string;
  normativeSummary: string;
};

export type PassingChunk = {
  documentTitle: string;
  versionLabel: string;
  pageNumber: number;
  chunkText: string;
  score: number;
  metadata?: unknown;
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Detect city and Brazilian state from question text
function detectLocation(question: string): { city?: string; state?: string } {
  const n = normalize(question);

  const stateMap: Record<string, string> = {
    para: "PA", "pará": "PA",
    maranhao: "MA", "maranhão": "MA",
    piaui: "PI", "piauí": "PI",
    ceara: "CE", "ceará": "CE",
    "rio grande do norte": "RN",
    paraiba: "PB", "paraíba": "PB",
    pernambuco: "PE",
    alagoas: "AL",
    sergipe: "SE",
    bahia: "BA",
    "minas gerais": "MG",
    "espirito santo": "ES", "espírito santo": "ES",
    "rio de janeiro": "RJ",
    "sao paulo": "SP", "são paulo": "SP",
    parana: "PR", "paraná": "PR",
    "santa catarina": "SC",
    "rio grande do sul": "RS",
    "mato grosso do sul": "MS",
    "mato grosso": "MT",
    goias: "GO", "goiás": "GO",
    tocantins: "TO",
    rondonia: "RO", "rondônia": "RO",
    acre: "AC",
    amazonas: "AM",
    roraima: "RR",
    amapa: "AP", "amapá": "AP",
  };

  let detectedState: string | undefined;
  for (const [name, code] of Object.entries(stateMap)) {
    if (n.includes(normalize(name)) || n.includes(code.toLowerCase())) {
      detectedState = code;
      break;
    }
  }

  // Common cities (extendable)
  const cityPatterns: Array<[RegExp, string, string]> = [
    [/altamira/, "Altamira", "PA"],
    [/belem|belém/, "Belém", "PA"],
    [/santarem|santarém/, "Santarém", "PA"],
    [/marabá|maraba/, "Marabá", "PA"],
    [/teresina/, "Teresina", "PI"],
    [/fortaleza/, "Fortaleza", "CE"],
    [/manaus/, "Manaus", "AM"],
    [/goiania|goiânia/, "Goiânia", "GO"],
  ];

  for (const [pattern, city, state] of cityPatterns) {
    if (pattern.test(n)) {
      return { city, state: detectedState ?? state };
    }
  }

  return { state: detectedState };
}

function detectConcessionaria(state?: string): string | undefined {
  if (!state) return undefined;
  const map: Record<string, string> = {
    PA: "Equatorial Pará",
    MA: "Equatorial Maranhão",
    PI: "Equatorial Piauí",
    AL: "Equatorial Alagoas",
    GO: "Equatorial Goiás",
    CE: "Enel Ceará",
    PE: "Neoenergia Pernambuco",
    PB: "Energisa Paraíba",
    BA: "Neoenergia Coelba",
    RJ: "Light / Enel Rio",
    MG: "CEMIG",
    SP: "CPFL / Enel SP / Elektro",
    RS: "RGE / CEEE-D",
    SC: "Celesc",
    PR: "Copel",
  };
  return map[state];
}

const STEP_BY_STEP_PT = [
  "Separe os documentos pessoais (CPF, RG ou documento equivalente).",
  "Informe o endereco completo da unidade consumidora.",
  "Defina a carga prevista e o tipo de atendimento (monofasico, bifasico ou trifasico).",
  "Verifique se o padrao de entrada esta instalado conforme a norma da concessionaria.",
  "Solicite atendimento pelo canal oficial da distribuidora (app, site ou agencia).",
  "Aguarde analise tecnica, vistoria e ligacao.",
];

const STANDARD_DOCS_PT = [
  "CPF/CNPJ do titular.",
  "RG ou documento de identidade equivalente.",
  "Comprovante de propriedade, posse ou vinculo com o imovel (escritura, contrato, IPTU etc.).",
  "Endereco completo com CEP.",
  "Carga instalada ou previsao de carga.",
  "Dados do padrao de entrada (disjuntor geral, bitola do ramal).",
  "ART ou RRT do responsavel tecnico, quando aplicavel.",
];

function buildLaypersonAnswer(
  question: string,
  chunks: PassingChunk[],
  isSufficient: boolean,
): BuiltAnswer {
  const location = detectLocation(question);
  const concessionaria = detectConcessionaria(location.state);

  const locationLabel =
    location.city && location.state
      ? ` em ${location.city}/${location.state}`
      : location.state
        ? ` no ${location.state}`
        : "";

  const steps = STEP_BY_STEP_PT.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const docs = STANDARD_DOCS_PT.map((d) => `- ${d}`).join("\n");

  const concessionariaNote = concessionaria
    ? `Considerando que ${location.city ?? "o municipio"} fica no ${location.state}, a distribuidora normalmente relacionada a regiao e a ${concessionaria}. Confirme sempre no canal oficial da concessionaria.`
    : "Identifique a distribuidora responsavel pela sua localidade e use o canal oficial de atendimento.";

  if (!isSufficient) {
    const answer = [
      `Encontrei base normativa geral sobre fornecimento de energia em baixa tensao, mas nao encontrei na base atual um procedimento especifico e direto para solicitacao de ligacao nova${locationLabel}.`,
      "",
      "Com seguranca, posso orientar o fluxo geral:",
      "",
      "Passo a passo:",
      steps,
      "",
      concessionariaNote,
      "",
      "Documentos normalmente solicitados:",
      docs,
      "",
      "Limitacao: A base normativa carregada nao contem o procedimento completo de solicitacao para esta localidade. Acesse o canal oficial da concessionaria para informacoes precisas sobre prazos, taxas e requisitos locais.",
    ].join("\n");

    return {
      answerType: "PARTIAL",
      confidence: 0.4,
      answer,
      normativeSummary: "",
    };
  }

  // Build normative summary from the found chunks
  const normativeLines: string[] = [];
  for (const chunk of chunks.slice(0, 2)) {
    const excerpt = chunk.chunkText
      .replace(/NORMA T[EÉ]CNICA[\s\S]*?DOCUMENTO N[AÃ]O CONTROLADO\s*/g, "")
      .trim()
      .slice(0, 300);
    if (excerpt.length > 40) {
      normativeLines.push(
        `[${chunk.documentTitle} | Pag. ${chunk.pageNumber}]:\n"${excerpt}"`,
      );
    }
  }

  const answer = [
    `Como solicitar ligacao nova${locationLabel}`,
    "",
    concessionariaNote,
    "",
    "Passo a passo:",
    steps,
    "",
    "Documentos normalmente solicitados:",
    docs,
    "",
    "Observacao: Para informacoes especificas sobre prazos, taxas e requisitos locais, acesse o canal oficial da distribuidora.",
  ].join("\n");

  const normativeSummary = normativeLines.length > 0
    ? normativeLines.join("\n\n")
    : "";

  return {
    answerType: "DIRECT",
    confidence: 0.75,
    answer,
    normativeSummary,
  };
}

function buildTechnicalAnswer(
  intent: TechnicalIntent,
  chunks: PassingChunk[],
  isSufficient: boolean,
  missingContext: string[],
  structuredLookup?: NormativeTableLookupResult,
): BuiltAnswer {
  const tableAnswer = buildNormativeTableAnswer(structuredLookup);
  if (tableAnswer) return tableAnswer;

  const drawingAnswer = buildDrawingStructuredAnswer(intent, chunks);
  if (drawingAnswer) return drawingAnswer;

  if (requiresTableSelection(intent) && missingContext.length > 0) {
    const foundTables = summarizeFoundTables(chunks);
    return {
      answerType: "NEEDS_CONTEXT",
      confidence: chunks.length > 0 ? 0.55 : 0.3,
      answer: [
        `A pergunta e de dimensionamento tecnico (${INTENT_LABELS[intent]}), entao nao vou tratar como solicitacao de ligacao nova.`,
        "",
        chunks.length > 0
          ? `A base encontrou fonte tecnica/tabela candidata${foundTables ? `: ${foundTables}.` : "."}`
          : "A base nao encontrou uma tabela de dimensionamento suficientemente clara para fechar a resposta.",
        "",
        "Para escolher a linha correta da tabela e definir cabo/disjuntor com seguranca, informe:",
        ...missingContext.map((item) => `- ${item}`),
        "",
        "Com esses dados eu consulto a tabela de dimensionamento aplicavel e retorno a linha normativa usada, com pagina/tabela e valores de cabo, disjuntor, eletroduto e aterramento quando estiverem disponiveis.",
      ].join("\n"),
      normativeSummary: buildNormativeSummary(chunks),
    };
  }

  if (missingContext.length >= 2 && !isSufficient) {
    const missing = missingContext.map((m) => `- ${m}`).join("\n");
    return {
      answerType: "NEEDS_CONTEXT",
      confidence: 0.3,
      answer: [
        `Para responder com precisao sobre ${INTENT_LABELS[intent]}, informe:`,
        "",
        missing,
        "",
        "Com essas informacoes, a consulta podera retornar a tabela ou item especifico da norma aplicavel.",
      ].join("\n"),
      normativeSummary: "",
    };
  }

  if (!isSufficient) {
    if (
      intent === "SERVICE_ENTRANCE_CABLE" ||
      intent === "PROTECTION" ||
      intent === "SERVICE_ENTRANCE_STANDARD"
    ) {
      return {
        answerType: "INSUFFICIENT",
        confidence: 0.15,
        answer:
          "Nao encontrei na base normativa atual uma tabela ou item especifico suficiente para definir com seguranca o cabo/disjuntor. A base encontrou apenas conceitos auxiliares, como carga instalada/demanda, mas nao a tabela de dimensionamento aplicavel.",
        normativeSummary: "",
      };
    }

    return {
      answerType: "INSUFFICIENT",
      confidence: 0.1,
      answer: [
        `Nao encontrei na base normativa atual uma tabela ou item especifico suficiente para responder com seguranca sobre ${INTENT_LABELS[intent]}.`,
        "",
        missingContext.length > 0
          ? `Para uma consulta mais precisa, informe tambem: ${missingContext.join(", ")}.`
          : "Verifique se as normas tecnicas aplicaveis ja foram enviadas e processadas na base.",
      ].join("\n"),
      normativeSummary: "",
    };
  }

  // Build structured technical answer from chunks
  const normativeLines: string[] = [];
  for (const chunk of chunks) {
    const excerpt = chunk.chunkText
      .replace(/NORMA T[EÉ]CNICA[\s\S]*?DOCUMENTO N[AÃ]O CONTROLADO\s*/g, "")
      .trim()
      .slice(0, 500);
    if (excerpt.length > 40) {
      normativeLines.push(
        `[${chunk.documentTitle} | ${chunk.versionLabel} | Pag. ${chunk.pageNumber}]\n${excerpt}`,
      );
    }
  }

  const answer = [
    `Resposta tecnica — ${INTENT_LABELS[intent]}:`,
    "",
    "Com base nos documentos normativos indexados:",
    "",
    ...normativeLines,
    "",
    missingContext.length > 0
      ? `Observacao: Para precisao adicional, informe tambem: ${missingContext.join(", ")}.`
      : "Esta resposta e baseada exclusivamente nos documentos indexados na base normativa. Para analise tecnica completa, consulte os documentos originais.",
  ].join("\n");

  return {
    answerType: missingContext.length > 0 ? "PARTIAL" : "DIRECT",
    confidence: missingContext.length > 0 ? 0.6 : 0.85,
    answer,
    normativeSummary: normativeLines.join("\n\n"),
  };
}

function buildNormativeTableAnswer(
  structuredLookup?: NormativeTableLookupResult,
): BuiltAnswer | null {
  if (!structuredLookup?.found || !structuredLookup.table || !structuredLookup.selectedRow) {
    return null;
  }

  const table = structuredLookup.table;
  const row = structuredLookup.selectedRow;
  const loadRange = formatLoadRange(row);
  const copperLines = formatCopperLines(row);
  const aluminumLines = formatAluminumLines(row);
  const phaseNeutral = formatPhaseNeutral(row);
  const source = `${table.documentTitle} | ${table.versionLabel} | Tabela ${table.tableNumber ?? "-"} | Pag. ${table.pageNumber}`;

  const answer = [
    "Resposta direta - dimensionamento tecnico:",
    "",
    `Tabela usada: Tabela ${table.tableNumber ?? "-"} - ${table.title}.`,
    `Fonte normativa utilizada: ${source}.`,
    `Linha selecionada: ${row.supplyType ?? "-"}, faixa de carga ${loadRange}.`,
    "",
    `Disjuntor: ${row.breakerAmp ?? "-"} A${row.breakerType ? ` (${row.breakerType})` : ""}.`,
    ...copperLines,
    ...aluminumLines,
    `Eletroduto de aco galvanizado: diametro nominal ${row.galvanizedSteelConduitInch ?? "-"} pol.`,
    `Condutor minimo do cliente fase/neutro: ${phaseNeutral} mm2.`,
    `Condutor de aterramento: ${formatNumber(row.groundingConductorMm2)} mm2.`,
    `Eletroduto de aterramento: diametro nominal ${row.groundingConduitInch ?? "-"} pol.`,
    row.notes ? `Observacao da linha: ${row.notes}.` : "",
    structuredLookup.kvaKwNotice ? `Ressalva tecnica: ${structuredLookup.kvaKwNotice}` : "",
  ].filter(Boolean).join("\n");

  return {
    answerType: "DIRECT",
    confidence: 0.92,
    answer,
    normativeSummary: `[${source}]\n${row.rawText ?? structuredLookup.reason}`,
  };
}

function formatLoadRange(row: NormativeTableRowResult) {
  if (row.loadMinKw === null || row.loadMinKw === undefined) {
    return `ate ${formatNumber(row.loadMaxKw)} kW`;
  }
  return `${formatNumber(row.loadMinKw)} a ${formatNumber(row.loadMaxKw)} kW`;
}

function formatCopperLines(row: NormativeTableRowResult) {
  const lines: string[] = [];
  if (row.copperConcentricMm2) {
    lines.push(`Cabo de cobre concentrico: ${formatNumber(row.copperConcentricMm2)} mm2.`);
  }
  if (row.copperMultiplexedMm2) {
    lines.push(`Cabo de cobre multiplexado: ${formatNumber(row.copperMultiplexedMm2)} mm2.`);
  }
  return lines;
}

function formatAluminumLines(row: NormativeTableRowResult) {
  const lines: string[] = [];
  if (row.aluminumDuplexMm2) {
    lines.push(`Cabo de aluminio multiplexado duplex: ${formatNumber(row.aluminumDuplexMm2)} mm2.`);
  }
  if (row.aluminumTriplexMm2) {
    lines.push(`Cabo de aluminio multiplexado triplex: ${formatNumber(row.aluminumTriplexMm2)} mm2.`);
  }
  if (row.aluminumQuadruplexMm2) {
    lines.push(`Cabo de aluminio multiplexado quadruplex: ${formatNumber(row.aluminumQuadruplexMm2)} mm2.`);
  }
  return lines;
}

function formatPhaseNeutral(row: NormativeTableRowResult) {
  if (row.supplyType === "TRIFASICO" && row.groundingConductorMm2) {
    return `${formatNumber(row.customerPhaseNeutralConductorMm2)}(${formatNumber(row.groundingConductorMm2)})`;
  }
  return `${formatNumber(row.customerPhaseNeutralConductorMm2)}`;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function buildDrawingStructuredAnswer(
  intent: TechnicalIntent,
  chunks: PassingChunk[],
): BuiltAnswer | null {
  if (!["DIMENSION_REQUIREMENT", "MATERIAL_RESPONSIBILITY", "DRAWING_REFERENCE"].includes(intent)) {
    return null;
  }

  const metadataList = chunks
    .map((chunk) => ({ chunk, metadata: getMetadataObject(chunk.metadata) }))
    .filter(({ metadata }) => Object.keys(metadata).length > 0);

  if (intent === "DIMENSION_REQUIREMENT") {
    for (const { chunk, metadata } of metadataList) {
      const measurements = getArrayMetadata<Record<string, unknown>>(metadata, "measurements");
      const measurement = measurements.find((m) => Number(m.value) > 0);
      if (!measurement) continue;
      const value = Number(measurement.value);
      const tolerance = Number(measurement.tolerance ?? 0);
      const minValue = Number(measurement.minValue ?? value - tolerance);
      const maxValue = Number(measurement.maxValue ?? value + tolerance);
      const noteNumber = String(measurement.noteNumber ?? "-");
      const drawingNumber = String(measurement.relatedDrawingNumber ?? metadata.drawingNumber ?? "-");
      return {
        answerType: "DIRECT",
        confidence: 0.9,
        answer:
          `De acordo com a Nota ${noteNumber} do Desenho ${drawingNumber}, a altura da caixa de medicao deve ser de ${formatPtNumber(value)} mm, com tolerancia de +/- ${formatPtNumber(tolerance)} mm, ou seja, aproximadamente entre ${formatMeters(minValue)} m e ${formatMeters(maxValue)} m.`,
        normativeSummary: `[${chunk.documentTitle} | ${chunk.versionLabel} | Pag. ${chunk.pageNumber}] ${String(measurement.rawText ?? "")}`,
      };
    }
  }

  if (intent === "MATERIAL_RESPONSIBILITY") {
    for (const { chunk, metadata } of metadataList) {
      const rows = getArrayMetadata<Record<string, unknown>>(metadata, "tableRows");
      const concessionaireItems = rows.filter((row) => row.responsibility === "CONCESSIONARIA");
      if (concessionaireItems.length === 0) continue;
      const tableNumber = String(metadata.relatedTableNumber ?? metadata.tableNumber ?? "-");
      const drawingNumber = String(metadata.drawingNumber ?? metadata.relatedDrawingNumber ?? "-");
      const items = concessionaireItems
        .map((row) => `- Item ${String(row.item)}: ${String(row.description)} (${String(row.quantity)})`)
        .join("\n");
      return {
        answerType: "DIRECT",
        confidence: 0.85,
        answer: [
          `Conforme a Nota 73, os itens marcados com (*) na Tabela ${tableNumber} - Legenda do Desenho ${drawingNumber} - sao de responsabilidade da concessionaria.`,
          "",
          items,
          "",
          `Fonte: ${chunk.documentTitle}, pagina ${chunk.pageNumber}.`,
        ].join("\n"),
        normativeSummary: `[${chunk.documentTitle} | ${chunk.versionLabel} | Pag. ${chunk.pageNumber}] Tabela ${tableNumber}`,
      };
    }
  }

  return null;
}

function getMetadataObject(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function getArrayMetadata<T>(metadata: Record<string, unknown>, key: string): T[] {
  const value = metadata[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatPtNumber(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatMeters(valueInMm: number) {
  return (valueInMm / 1000).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function requiresTableSelection(intent: TechnicalIntent) {
  return [
    "SERVICE_ENTRANCE_CABLE",
    "PROTECTION",
    "SERVICE_ENTRANCE_STANDARD",
    "LOAD_DEMAND",
  ].includes(intent);
}

function summarizeFoundTables(chunks: PassingChunk[]) {
  const labels = chunks
    .map((chunk) => {
      const metadata = getMetadataObject(chunk.metadata);
      const tableNumber = metadata.tableNumber ?? metadata.relatedTableNumber;
      const tableTitle = metadata.tableTitle;
      if (tableNumber || tableTitle) {
        return `Tabela ${String(tableNumber ?? "")} ${String(tableTitle ?? "")}`.trim();
      }
      const tableMatch = /Tabela\s+\d+[^\n]*/i.exec(chunk.chunkText);
      return tableMatch?.[0] ?? null;
    })
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(labels)).slice(0, 3).join("; ");
}

function buildNormativeSummary(chunks: PassingChunk[]) {
  return chunks
    .slice(0, 3)
    .map((chunk) => {
      const excerpt = chunk.chunkText
        .replace(/NORMA T[EÉ]CNICA[\s\S]*?DOCUMENTO N[ÃA]O CONTROLADO\s*/g, "")
        .trim()
        .slice(0, 400);
      return `[${chunk.documentTitle} | ${chunk.versionLabel} | Pag. ${chunk.pageNumber}]\n${excerpt}`;
    })
    .join("\n\n");
}

export function buildStructuredAnswer(params: {
  audience: QueryAudience;
  intent: TechnicalIntent;
  question: string;
  chunks: PassingChunk[];
  isSufficient: boolean;
  missingContext: string[];
  structuredLookup?: NormativeTableLookupResult;
}): BuiltAnswer {
  const { audience, intent, question, chunks, isSufficient, missingContext, structuredLookup } = params;

  if (audience === "LEIGO_ATENDIMENTO" || audience === "NORMA_REFERENCIA") {
    return buildLaypersonAnswer(question, chunks, isSufficient);
  }

  return buildTechnicalAnswer(intent, chunks, isSufficient, missingContext, structuredLookup);
}
