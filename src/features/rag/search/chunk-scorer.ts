import {
  INTENT_REQUIRED_TERMS,
  LEIGO_OFF_TOPIC_TERMS,
  LEIGO_PRIORITY_TERMS,
} from "./intent-classifier";
import type { TechnicalIntent } from "./intent-classifier";

const STRICT_TECHNICAL_INTENTS = new Set<TechnicalIntent>([
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
]);

const INTENT_EXTRA_TERMS: Partial<Record<TechnicalIntent, Array<{ term: string; score: number }>>> = {
  SERVICE_ENTRANCE_CABLE: [
    { term: "cabo", score: 30 },
    { term: "condutor", score: 30 },
    { term: "ramal de entrada", score: 40 },
    { term: "ramal de conexao", score: 45 },
    { term: "dimensionamento do ramal", score: 45 },
    { term: "secao", score: 25 },
    { term: "bitola", score: 30 },
    { term: "mm2", score: 25 },
    { term: "mm²", score: 25 },
    { term: "multiplexado", score: 25 },
    { term: "concentrico", score: 25 },
    { term: "isolado", score: 20 },
    { term: "entrada", score: 20 },
    { term: "unidade consumidora", score: 20 },
    { term: "padrao de entrada", score: 30 },
    { term: "tabela", score: 35 },
    { term: "categoria", score: 30 },
  ],
  SERVICE_ENTRANCE_STANDARD: [
    { term: "padrao de entrada", score: 30 },
    { term: "carga instalada", score: 20 },
    { term: "demanda", score: 15 },
    { term: "kva", score: 20 },
    { term: "categoria", score: 20 },
    { term: "tipo de atendimento", score: 20 },
    { term: "tabela", score: 20 },
    { term: "ligacao trifasica", score: 20 },
    { term: "ligacao bifasica", score: 15 },
    { term: "ligacao monofasica", score: 15 },
  ],
  LOAD_DEMAND: [
    { term: "carga instalada", score: 35 },
    { term: "demanda", score: 30 },
    { term: "categoria", score: 25 },
    { term: "limite de fornecimento", score: 35 },
    { term: "baixa tensao", score: 25 },
    { term: "media tensao", score: 25 },
    { term: "subestacao", score: 30 },
    { term: "transformacao", score: 25 },
    { term: "medicao", score: 20 },
    { term: "protecao", score: 20 },
  ],
  PROTECTION: [
    { term: "disjuntor", score: 40 },
    { term: "disjuntor termomagnetico", score: 45 },
    { term: "protecao", score: 30 },
    { term: "corrente nominal", score: 25 },
    { term: "ampere", score: 20 },
    { term: "tabela", score: 35 },
    { term: "categoria", score: 25 },
    { term: "padrao de entrada", score: 25 },
  ],
  VOLTAGE_LEVEL: [
    { term: "limite de fornecimento", score: 40 },
    { term: "baixa tensao", score: 30 },
    { term: "media tensao", score: 30 },
    { term: "carga instalada", score: 25 },
    { term: "demanda", score: 20 },
    { term: "subestacao", score: 25 },
  ],
  SUBSTATION: [
    { term: "subestacao", score: 40 },
    { term: "transformador", score: 30 },
    { term: "transformacao", score: 30 },
    { term: "media tensao", score: 25 },
    { term: "medicao", score: 20 },
    { term: "protecao", score: 20 },
  ],
  DRAWING_REFERENCE: [
    { term: "desenho", score: 30 },
    { term: "legenda do desenho", score: 40 },
    { term: "tabela", score: 25 },
    { term: "nota", score: 25 },
    { term: "medidor monofasico", score: 25 },
    { term: "padrao de entrada", score: 25 },
  ],
  MATERIAL_RESPONSIBILITY: [
    { term: "responsabilidade da concessionaria", score: 45 },
    { term: "concessionaria", score: 30 },
    { term: "asterisco", score: 25 },
    { term: "(*)", score: 25 },
    { term: "material", score: 20 },
    { term: "materiais", score: 20 },
    { term: "legenda do desenho", score: 35 },
    { term: "cabo multiplexado", score: 30 },
  ],
  DIMENSION_REQUIREMENT: [
    { term: "altura", score: 35 },
    { term: "caixa de medicao", score: 40 },
    { term: "medidor", score: 25 },
    { term: "1.300", score: 35 },
    { term: "1300", score: 35 },
    { term: "100 mm", score: 25 },
    { term: "nota", score: 20 },
  ],
};

const LOW_VALUE_LINE_PATTERNS = [
  /^sumario\b/i,
  /^indice( geral)?\b/i,
  /^lista de (figuras|tabelas|abreviaturas|siglas|simbolos)/i,
  /^apresentacao\b/i,
  /^(capa|folha de rosto|pagina de rosto)\b/i,
  /campo de aplicacao/i,
  /historico de revisoes?|controle de revisao/i,
  /referencias normativas/i,
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isLowValueNormativeChunk(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 10)) {
    if (line.length > 120) continue;
    const normLine = normalize(line);
    if (LOW_VALUE_LINE_PATTERNS.some((p) => p.test(normLine))) return true;
  }
  return false;
}

function hasTechnicalIndicator(text: string): boolean {
  return (
    /\d+\s*mm[²2]/i.test(text) ||
    /\d+\s*kva/i.test(text) ||
    /\d+\s*kw/i.test(text) ||
    /\d+\s*a\b/i.test(text) ||
    /tabela\s*\d+/i.test(text) ||
    /categoria\s+[a-z0-9]/i.test(text) ||
    /disjuntor/i.test(text) ||
    /condutor/i.test(text) ||
    /ramal\s+de\s+(entrada|liga|conex)/i.test(text) ||
    /padrao\s+de\s+entrada/i.test(normalize(text)) ||
    /\d+[\s,.]?\d*\s*kv\b/i.test(text) ||
    /\d+\s*awg/i.test(text)
  );
}

function countRequiredTermsMatched(normalizedText: string, intent: TechnicalIntent): number {
  const terms = INTENT_REQUIRED_TERMS[intent] ?? [];
  return terms.filter((t) => normalizedText.includes(normalize(t))).length;
}

function isTableLike(text: string): boolean {
  const lines = text.split("\n");
  const multicolumn = lines.filter((l) => /\s{3,}/.test(l) || l.includes("\t")).length;
  return /tabela\s*\d+/i.test(text) || /\d+\s*mm[²2]/i.test(text) || multicolumn >= 3;
}

function hasElectricalUnits(text: string): boolean {
  return /\d+\s*(kva|kw|mm[²2]|\ba\b|\bv\b|mva|mw|kv)\b/i.test(text);
}

function hasNumberNearTechnicalTerm(text: string): boolean {
  return /\d+[\s,.]?\d*\s*(mm[²2]|kva|kw|kv|\ba\b|awg)/i.test(text);
}

function extractSignificantPhrases(normalizedQuestion: string): string[] {
  const words = normalizedQuestion.split(/\s+/).filter((w) => w.length >= 3);
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }
  return phrases;
}

export type ChunkScoreDetail = {
  score: number;
  textualScore: number;
  technicalScore: number;
  penaltyScore: number;
  reasons: string[];
  rejected: boolean;
  rejectionReason?: string;
};

export function scoreChunkDetailed(
  chunkText: string,
  intent: TechnicalIntent,
  questionKeywords: string[],
  originalQuestion: string,
  secondaryIntents: TechnicalIntent[] = [],
): ChunkScoreDetail {
  const reasons: string[] = [];
  const normalized = normalize(chunkText);
  const normalizedQuestion = normalize(originalQuestion);
  const isConceptualQuestion = /o que e|o que sao|defina|conceito|significa/.test(normalizedQuestion);
  let textualScore = 0;
  let technicalScore = 0;
  let penaltyScore = 0;

  if (isLowValueNormativeChunk(chunkText) && !isConceptualQuestion) {
    const firstLine = normalize(chunkText.split("\n")[0] ?? "");
    const isCover = /sumario|indice|capa|folha de rosto/.test(firstLine);
    const value = isCover ? -100 : -60;
    return {
      score: value,
      textualScore,
      technicalScore,
      penaltyScore: value,
      reasons: [isCover ? "-100: pagina de sumario/capa" : "-60: secao administrativa"],
      rejected: true,
      rejectionReason: isCover
        ? "Pagina de sumario ou capa - conteudo sem valor tecnico"
        : "Secao administrativa - baixo valor tecnico",
    };
  }

  const asksProvisional = /provisorio|temporaria|temporario|evento|feira|obra temporaria/.test(normalizedQuestion);
  const asksInspection = /inspecao|vistoria/.test(normalizedQuestion);

  if (!asksProvisional && /fornecimento provisorio|conexao temporaria|ligacao temporaria/.test(normalized)) {
    return {
      score: -120,
      textualScore,
      technicalScore,
      penaltyScore: -120,
      reasons: ["-120: fornecimento provisorio/conexao temporaria fora da pergunta"],
      rejected: true,
      rejectionReason:
        "Fornecimento provisorio ou conexao temporaria so entra quando a pergunta menciona esse tema",
    };
  }

  if (!asksInspection && /inspecao|vistoria/.test(normalized)) {
    penaltyScore -= 60;
    reasons.push("-60: inspecao/vistoria fora da pergunta");
  }

  let hasExactPhrase = false;
  const phrases = extractSignificantPhrases(normalizedQuestion);
  for (const phrase of phrases) {
    if (normalized.includes(phrase)) {
      textualScore += 50;
      reasons.push(`+50: frase exata "${phrase}"`);
      hasExactPhrase = true;
      break;
    }
  }

  if (STRICT_TECHNICAL_INTENTS.has(intent) && !hasExactPhrase) {
    const reqCount = countRequiredTermsMatched(normalized, intent);
    const hasIndicator = hasTechnicalIndicator(chunkText);
    if (reqCount < 2) {
      penaltyScore -= 15;
      reasons.push(`-15: baixa aderencia a intencao (${reqCount}/2 termos)`);
    }
    if (!hasIndicator) {
      penaltyScore -= 10;
      reasons.push("-10: sem indicador tecnico forte");
    }
    if (reqCount >= 2 && hasIndicator) {
      technicalScore += 20;
      reasons.push(`+20: aderencia tecnica (${reqCount} termos + indicador)`);
    }
  }

  const requiredTerms = INTENT_REQUIRED_TERMS[intent] ?? [];
  for (const term of requiredTerms) {
    if (normalized.includes(normalize(term))) {
      technicalScore += 20;
      reasons.push(`+20: termo obrigatorio "${term}"`);
    }
  }

  const extraTerms = INTENT_EXTRA_TERMS[intent] ?? [];
  for (const { term, score: bonus } of extraTerms) {
    if (normalized.includes(normalize(term))) {
      technicalScore += bonus;
      reasons.push(`+${bonus}: termo especifico "${term}"`);
    }
  }

  for (const secondaryIntent of secondaryIntents) {
    const secondaryTerms = [
      ...(INTENT_REQUIRED_TERMS[secondaryIntent] ?? []),
      ...((INTENT_EXTRA_TERMS[secondaryIntent] ?? []).map((t) => t.term)),
    ];
    for (const term of secondaryTerms) {
      if (normalized.includes(normalize(term))) {
        technicalScore += 10;
        reasons.push(`+10: termo auxiliar ${secondaryIntent} "${term}"`);
      }
    }
  }

  if (isTableLike(chunkText)) {
    technicalScore += 30;
    reasons.push("+30: conteudo de tabela");
  }
  if (hasElectricalUnits(chunkText)) {
    technicalScore += 20;
    reasons.push("+20: unidades eletricas");
  }
  if (hasNumberNearTechnicalTerm(chunkText)) {
    technicalScore += 15;
    reasons.push("+15: numero perto de termo tecnico");
  }

  for (const kw of questionKeywords) {
    if (normalized.includes(normalize(kw))) {
      textualScore += 5;
      reasons.push(`+5: keyword "${kw}"`);
    }
  }

  const score = textualScore + technicalScore + penaltyScore;
  return { score, textualScore, technicalScore, penaltyScore, reasons, rejected: false };
}

export function scoreChunk(
  chunkText: string,
  intent: TechnicalIntent,
  questionKeywords: string[],
  originalQuestion: string,
): number {
  return scoreChunkDetailed(chunkText, intent, questionKeywords, originalQuestion).score;
}

export function scoreChunkForLeigo(
  chunkText: string,
  questionKeywords: string[],
  originalQuestion: string,
): ChunkScoreDetail {
  const reasons: string[] = [];

  if (isLowValueNormativeChunk(chunkText)) {
    return {
      score: -60,
      textualScore: 0,
      technicalScore: 0,
      penaltyScore: -60,
      reasons: ["-60: secao administrativa"],
      rejected: true,
      rejectionReason: "Secao administrativa - campo de aplicacao / definicoes / responsabilidades",
    };
  }

  const normalized = normalize(chunkText);
  const normalizedQuestion = normalize(originalQuestion);
  let textualScore = 0;
  let penaltyScore = 0;

  for (const term of LEIGO_OFF_TOPIC_TERMS) {
    if (normalized.includes(normalize(term))) {
      penaltyScore -= 40;
      reasons.push(`-40: conteudo fora de topico "${term}"`);
    }
  }

  let hasExactPhrase = false;
  const phrases = extractSignificantPhrases(normalizedQuestion);
  for (const phrase of phrases) {
    if (normalized.includes(phrase)) {
      textualScore += 40;
      reasons.push(`+40: frase exata "${phrase}"`);
      hasExactPhrase = true;
      break;
    }
  }

  const serviceTermsFound = LEIGO_PRIORITY_TERMS.filter((t) => normalized.includes(normalize(t)));
  if (serviceTermsFound.length === 0 && !hasExactPhrase) {
    return {
      score: -20,
      textualScore,
      technicalScore: 0,
      penaltyScore: -20,
      reasons: [...reasons, "Sem termo de atendimento/servico"],
      rejected: true,
      rejectionReason: "Conteudo nao relacionado a solicitacao de ligacao ou atendimento",
    };
  }

  for (const term of serviceTermsFound) {
    textualScore += 25;
    reasons.push(`+25: termo de servico "${term}"`);
    if (textualScore >= 100) break;
  }

  for (const kw of questionKeywords) {
    if (normalized.includes(normalize(kw))) {
      textualScore += 5;
      reasons.push(`+5: keyword "${kw}"`);
    }
  }

  const score = textualScore + penaltyScore;
  const rejected = score < 0;
  return {
    score,
    textualScore,
    technicalScore: 0,
    penaltyScore,
    reasons,
    rejected,
    rejectionReason: rejected ? "Score negativo apos penalidades" : undefined,
  };
}
