import { INTENT_REQUIRED_TERMS } from "./intent-classifier";
import type { TechnicalIntent } from "./intent-classifier";

const LOW_VALUE_PATTERNS = [
  /^(sum[aá]rio|[ií]ndice( geral)?|conte[uú]do)\b/i,
  /^(lista de (figuras|tabelas|abreviaturas|siglas|s[ií]mbolos))/i,
  /campo de aplica[cç][aã]o/i,
  /responsabilidades/i,
  /hist[oó]rico de revis[oõ]es?|controle de revis[aã]o/i,
  /^apresenta[cç][aã]o\b/i,
  /\bobjetivo(s)? (deste|desta|do documento)\b/i,
  /refer[eê]ncias normativas/i,
  /defini[cç][oõ]es (e siglas|e abreviaturas)|termos e defini[cç][oõ]es/i,
  /^(capa|folha de rosto|p[aá]gina de rosto)\b/i,
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
  const firstPart = trimmed.slice(0, 200);
  return LOW_VALUE_PATTERNS.some((p) => p.test(firstPart));
}

function isTableLike(text: string): boolean {
  const lines = text.split("\n");
  const multicolumnLines = lines.filter((l) => /\s{3,}/.test(l) || l.includes("\t")).length;
  const hasMm2 = /\d+\s*mm[²2]/i.test(text);
  const hasTabela = /tabela\s*\d+/i.test(text);
  const hasKvaColumn =
    /kva|kw|disjuntor|condutor/i.test(text) && multicolumnLines >= 2;
  return hasMm2 || hasTabela || hasKvaColumn || multicolumnLines >= 3;
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

  if (isLowValueNormativeChunk(chunkText)) {
    const firstLine = chunkText.split("\n")[0].trim().toLowerCase();
    const isCover = /sum.rio|.ndice|capa|folha de rosto/.test(firstLine);
    if (isCover) {
      return {
        score: -100,
        reasons: ["-100: pagina de sumario/capa"],
        rejected: true,
        rejectionReason: "Pagina de sumario ou capa — nao e conteudo tecnico",
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

  let score = 0;
  const normalized = normalize(chunkText);
  const normalizedQuestion = normalize(originalQuestion);

  const phrases = extractSignificantPhrases(normalizedQuestion);
  for (const phrase of phrases) {
    if (normalized.includes(phrase)) {
      score += 50;
      reasons.push(`+50: frase exata "${phrase}"`);
      break;
    }
  }

  const requiredTerms = INTENT_REQUIRED_TERMS[intent] ?? [];
  for (const term of requiredTerms) {
    if (normalized.includes(normalize(term))) {
      score += 20;
      reasons.push(`+20: termo obrigatorio "${term}"`);
    }
  }

  if (isTableLike(chunkText)) {
    score += 30;
    reasons.push("+30: conteudo de tabela");
  }

  if (hasElectricalUnits(chunkText)) {
    score += 20;
    reasons.push("+20: unidades eletricas");
  }

  if (hasNumberNearTechnicalTerm(chunkText)) {
    score += 15;
    reasons.push("+15: numero perto de termo tecnico");
  }

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
