import {
  INTENT_REQUIRED_TERMS,
  LEIGO_OFF_TOPIC_TERMS,
  LEIGO_PRIORITY_TERMS,
} from "./intent-classifier";
import type { TechnicalIntent } from "./intent-classifier";

// Intents that require a strict technical gate before scoring
const STRICT_TECHNICAL_INTENTS = new Set<TechnicalIntent>([
  "SERVICE_ENTRANCE_CABLE",
  "SERVICE_ENTRANCE_STANDARD",
  "LOAD_DEMAND",
  "METERING",
  "GROUNDING",
  "VOLTAGE_SUPPLY",
]);

// Extra weighted terms per intent (applied ON TOP of the base INTENT_REQUIRED_TERMS scoring)
const INTENT_EXTRA_TERMS: Partial<Record<TechnicalIntent, Array<{ term: string; score: number }>>> = {
  SERVICE_ENTRANCE_CABLE: [
    { term: "bitola", score: 20 },
    { term: "condutor", score: 20 },
    { term: "cabo", score: 15 },
    { term: "secao", score: 15 },
    { term: "mm2", score: 15 },
    { term: "ramal de entrada", score: 30 },
    { term: "ramal de ligacao", score: 25 },
    { term: "trifasico", score: 15 },
    { term: "tabela", score: 20 },
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
};

// Patterns that identify low-value normative sections when found as short standalone lines
const LOW_VALUE_LINE_PATTERNS = [
  /^sum[aá]rio\b/i,
  /^[ií]ndice( geral)?\b/i,
  /^lista de (figuras|tabelas|abreviaturas|siglas|s[ií]mbolos)/i,
  /^apresenta[cç][aã]o\b/i,
  /^(capa|folha de rosto|p[aá]gina de rosto)\b/i,
  /^defini[cç][oõ]es\b/i,
  /campo de aplica[cç][aã]o/i,
  /responsabilidades/i,
  /hist[oó]rico de revis[oõ]es?|controle de revis[aã]o/i,
  /refer[eê]ncias normativas/i,
  /defini[cç][oõ]es (e siglas|e abreviaturas)|termos e defini[cç][oõ]es/i,
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function isLowValueNormativeChunk(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;

  // Check first 10 non-empty lines; skip long paragraph lines (>120 chars) as they are body text
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
    /\d+\s*a\b/.test(text) ||
    /tabela\s*\d+/i.test(text) ||
    /categoria\s+[a-z0-9]/i.test(text) ||
    /disjuntor/i.test(text) ||
    /condutor/i.test(text) ||
    /ramal\s+de\s+(entrada|liga)/i.test(text) ||
    /padr[aã]o\s+de\s+entrada/i.test(text) ||
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
  return (
    /tabela\s*\d+/i.test(text) ||
    /\d+\s*mm[²2]/i.test(text) ||
    multicolumn >= 3
  );
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
  reasons: string[];
  rejected: boolean;
  rejectionReason?: string;
};

export function scoreChunkDetailed(
  chunkText: string,
  intent: TechnicalIntent,
  questionKeywords: string[],
  originalQuestion: string,
): ChunkScoreDetail {
  const reasons: string[] = [];

  // Hard rejection: low-value normative section heading
  if (isLowValueNormativeChunk(chunkText)) {
    const firstLine = chunkText.split("\n")[0].trim().toLowerCase();
    const isCover = /sum.rio|.ndice|capa|folha de rosto/.test(firstLine);
    if (isCover) {
      return {
        score: -100,
        reasons: ["-100: pagina de sumario/capa"],
        rejected: true,
        rejectionReason: "Pagina de sumario ou capa — conteudo sem valor tecnico",
      };
    }
    return {
      score: -60,
      reasons: ["-60: secao administrativa"],
      rejected: true,
      rejectionReason:
        "Secao de campo de aplicacao / responsabilidades / definicoes — baixo valor tecnico",
    };
  }

  const normalized = normalize(chunkText);
  const normalizedQuestion = normalize(originalQuestion);
  let score = 0;

  // Check for exact phrase match first (can bypass the technical gate)
  let hasExactPhrase = false;
  const phrases = extractSignificantPhrases(normalizedQuestion);
  for (const phrase of phrases) {
    if (normalized.includes(phrase)) {
      score += 50;
      reasons.push(`+50: frase exata "${phrase}"`);
      hasExactPhrase = true;
      break;
    }
  }

  // Strict gate for technical intents: must have 2+ required terms AND 1 technical indicator
  if (STRICT_TECHNICAL_INTENTS.has(intent) && !hasExactPhrase) {
    const reqCount = countRequiredTermsMatched(normalized, intent);
    const hasIndicator = hasTechnicalIndicator(chunkText);

    if (reqCount < 2 || !hasIndicator) {
      const gateReason =
        reqCount < 2
          ? `${reqCount}/2 termos obrigatorios da intencao`
          : "sem indicador tecnico (mm², kVA, condutor, tabela, ramal, etc.)";
      return {
        score: 0,
        reasons: [`Bloqueado por gate tecnico: ${gateReason}`],
        rejected: true,
        rejectionReason: `Gate tecnico: ${gateReason}`,
      };
    }

    reasons.push(`Gate OK: ${reqCount} termos obrigatorios, indicador tecnico encontrado`);
  }

  // +20: each required intent term
  const requiredTerms = INTENT_REQUIRED_TERMS[intent] ?? [];
  for (const term of requiredTerms) {
    if (normalized.includes(normalize(term))) {
      score += 20;
      reasons.push(`+20: termo obrigatorio "${term}"`);
    }
  }

  // Intent-specific extra bonuses
  const extraTerms = INTENT_EXTRA_TERMS[intent] ?? [];
  for (const { term, score: bonus } of extraTerms) {
    if (normalized.includes(normalize(term))) {
      score += bonus;
      reasons.push(`+${bonus}: termo especifico "${term}"`);
    }
  }

  // +30: table-like content
  if (isTableLike(chunkText)) {
    score += 30;
    reasons.push("+30: conteudo de tabela");
  }

  // +20: electrical units with numbers
  if (hasElectricalUnits(chunkText)) {
    score += 20;
    reasons.push("+20: unidades eletricas");
  }

  // +15: number near technical term
  if (hasNumberNearTechnicalTerm(chunkText)) {
    score += 15;
    reasons.push("+15: numero perto de termo tecnico");
  }

  // +5 per keyword
  for (const kw of questionKeywords) {
    if (normalized.includes(normalize(kw))) {
      score += 5;
      reasons.push(`+5: keyword "${kw}"`);
    }
  }

  return { score, reasons, rejected: false };
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
      reasons: ["-60: secao administrativa"],
      rejected: true,
      rejectionReason: "Secao administrativa — campo de aplicacao / definicoes / responsabilidades",
    };
  }

  const normalized = normalize(chunkText);
  const normalizedQuestion = normalize(originalQuestion);
  let score = 0;

  // Hard penalty: off-topic technical content
  for (const term of LEIGO_OFF_TOPIC_TERMS) {
    if (normalized.includes(normalize(term))) {
      score -= 40;
      reasons.push(`-40: conteudo fora de topico "${term}"`);
    }
  }

  // Check exact phrase
  let hasExactPhrase = false;
  const phrases = extractSignificantPhrases(normalizedQuestion);
  for (const phrase of phrases) {
    if (normalized.includes(phrase)) {
      score += 40;
      reasons.push(`+40: frase exata "${phrase}"`);
      hasExactPhrase = true;
      break;
    }
  }

  // Gate: must have at least 1 service/connection term (unless exact phrase found)
  const serviceTermsFound = LEIGO_PRIORITY_TERMS.filter((t) =>
    normalized.includes(normalize(t)),
  );

  if (serviceTermsFound.length === 0 && !hasExactPhrase) {
    return {
      score: -20,
      reasons: [...reasons, "Sem termo de atendimento/servico"],
      rejected: true,
      rejectionReason: "Conteudo nao relacionado a solicitacao de ligacao ou atendimento",
    };
  }

  // +25 per service term found
  for (const term of serviceTermsFound) {
    score += 25;
    reasons.push(`+25: termo de servico "${term}"`);
    if (score >= 100) break; // cap
  }

  // +5 per keyword
  for (const kw of questionKeywords) {
    if (normalized.includes(normalize(kw))) {
      score += 5;
      reasons.push(`+5: keyword "${kw}"`);
    }
  }

  const rejected = score < 0;
  return {
    score,
    reasons,
    rejected,
    rejectionReason: rejected ? "Score negativo apos penalidades" : undefined,
  };
}
