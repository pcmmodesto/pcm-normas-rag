export type TechnicalPageType =
  | "COVER_PAGE"
  | "SUMMARY_PAGE"
  | "ADMIN_PAGE"
  | "TEXT_PAGE"
  | "TABLE_PAGE"
  | "DRAWING_PAGE"
  | "MIXED_TECHNICAL_PAGE";

// Drawing page detection — title lines like "DESENHO 4 —" or "FIGURA 4 —"
const DRAWING_TITLE_RE =
  /^(DESENHO|FIGURA|DETALHE|ESQUEMA|MONTAGEM|DIAGRAMA)\s+\d+(?:[A-Z]|\.\d+)?\s*[–—\-]/im;

// Technical keywords that appear on drawing pages
const DRAWING_SUBJECT_TERMS = [
  /afastamento.*condut|condut.*afastamento/i,
  /afastamento.*edific|edific.*afastamento/i,
  /detalhe\s+construtiv/i,
  /esquema\s+de\s+liga/i,
  /montagem\s+do\s+padr/i,
  /padr[aã]o\s+de\s+entrada.*detalhe/i,
];

// Figure caption heuristics — lines like "a) Afastamento..." or "a Afastamento..."
const FIGURE_CAPTION_RE = /^[a-hA-H][)\s]\s*[A-Z]/m;

const COVER_PATTERNS = [
  /norma\s+t[eé]cnica/i,
  /documento\s+n[aã]o\s+controlado/i,
  /homologado\s+em:/i,
  /revis[aã]o:\s*\d/i,
];

const SUMMARY_PATTERNS = [
  /sum[aá]rio\b/i,
  /[íi]ndice(\s+geral)?\b/i,
  /lista\s+de\s+(figuras|tabelas|abreviaturas|siglas)/i,
];

const ADMIN_PATTERNS = [
  /campo\s+de\s+aplica[cç][aã]o/i,
  /responsabilidades\b/i,
  /hist[oó]rico\s+de\s+revis[oõ]es?/i,
  /refer[eê]ncias\s+normativas/i,
  /termos\s+e\s+defini[cç][oõ]es/i,
  /controle\s+de\s+revis[aã]o/i,
];

const TECHNICAL_INDICATORS = [
  /\d+\s*mm[²2]/i,
  /\d+\s*kva/i,
  /\d+\s*kw\b/i,
  /tabela\s*\d+/i,
  /disjuntor/i,
  /condutor/i,
  /afastamento/i,
  /ramal\s+de\s+(entrada|liga)/i,
];

export function detectTechnicalPageType(
  text: string,
  pageNumber: number,
): TechnicalPageType {
  // 1. Cover
  if (pageNumber <= 3 && COVER_PATTERNS.filter((p) => p.test(text)).length >= 2) {
    return "COVER_PAGE";
  }

  // 2. Summary/TOC
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const tocLines = lines.filter(
    (l) => /\.{3,}\s*\d+\s*$/.test(l) || /\s{6,}\d+\s*$/.test(l),
  ).length;
  if (
    SUMMARY_PATTERNS.some((p) => p.test(text)) ||
    (tocLines >= 5 && tocLines / Math.max(lines.length, 1) > 0.3)
  ) {
    return "SUMMARY_PAGE";
  }

  // 3. Drawing detection
  const hasDrawingTitle = DRAWING_TITLE_RE.test(text);
  const hasDrawingSubject = DRAWING_SUBJECT_TERMS.some((p) => p.test(text));
  const hasFigureCaptions = FIGURE_CAPTION_RE.test(text);

  // 4. Table detection
  const shortLines = lines.filter((l) => l.length < 120);
  const multiSpaceLines = shortLines.filter(
    (l) => /\s{4,}/.test(l) || l.includes("\t"),
  ).length;
  const hasTableTitle = /tabela\s*\d+/i.test(text);
  const hasTableLike =
    hasTableTitle || (multiSpaceLines >= 4 && multiSpaceLines / Math.max(shortLines.length, 1) > 0.3);

  // 5. Technical density
  const techMatches = TECHNICAL_INDICATORS.filter((p) => p.test(text)).length;

  // Decision
  if (hasDrawingTitle || (hasDrawingSubject && hasFigureCaptions)) {
    return hasTableLike ? "MIXED_TECHNICAL_PAGE" : "DRAWING_PAGE";
  }

  if (hasDrawingSubject && hasTableLike) {
    return "MIXED_TECHNICAL_PAGE";
  }

  if (ADMIN_PATTERNS.some((p) => p.test(text)) && techMatches === 0) {
    return "ADMIN_PAGE";
  }

  if (hasTableLike && techMatches >= 1) {
    return "TABLE_PAGE";
  }

  return "TEXT_PAGE";
}

export function isLowValuePageType(pageType: TechnicalPageType): boolean {
  return (
    pageType === "COVER_PAGE" ||
    pageType === "SUMMARY_PAGE" ||
    pageType === "ADMIN_PAGE"
  );
}
