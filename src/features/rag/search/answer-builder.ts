import type { QueryAudience, TechnicalIntent } from "./intent-classifier";
import { INTENT_LABELS } from "./intent-classifier";

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
): BuiltAnswer {
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

export function buildStructuredAnswer(params: {
  audience: QueryAudience;
  intent: TechnicalIntent;
  question: string;
  chunks: PassingChunk[];
  isSufficient: boolean;
  missingContext: string[];
}): BuiltAnswer {
  const { audience, intent, question, chunks, isSufficient, missingContext } = params;

  if (audience === "LEIGO_ATENDIMENTO" || audience === "NORMA_REFERENCIA") {
    return buildLaypersonAnswer(question, chunks, isSufficient);
  }

  return buildTechnicalAnswer(intent, chunks, isSufficient, missingContext);
}
