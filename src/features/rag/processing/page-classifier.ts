export type PageClassification = {
  isCover: boolean;
  isSummary: boolean;
  isAdministrative: boolean;
  hasTable: boolean;
  hasTechnicalContent: boolean;
  technicalDensityScore: number;
  isLowValue: boolean;
};

const COVER_PATTERNS = [
  /norma t[eé]cnica/i,
  /documento n[aã]o controlado/i,
  /homologado em:/i,
  /revis[aã]o:\s*\d/i,
];

const SUMMARY_PATTERNS = [
  /sum[aá]rio\b/i,
  /[íi]ndice( geral)?\b/i,
  /lista de (figuras|tabelas|abreviaturas|siglas)/i,
];

const ADMIN_SECTION_PATTERNS = [
  /campo de aplica[cç][aã]o/i,
  /responsabilidades\b/i,
  /hist[oó]rico de revis[oõ]es?/i,
  /controle de revis[aã]o/i,
  /refer[eê]ncias normativas/i,
  /defini[cç][oõ]es e (siglas|abreviaturas)/i,
  /termos e defini[cç][oõ]es/i,
  /apresenta[cç][aã]o\b/i,
];

const TECHNICAL_INDICATORS = [
  /\d+\s*mm[²2]/i,
  /\d+\s*kva/i,
  /\d+\s*kw\b/i,
  /tabela\s*\d+/i,
  /categoria\s+[a-z0-9]/i,
  /disjuntor/i,
  /condutor/i,
  /ramal\s+de\s+(entrada|liga)/i,
  /padr[aã]o\s+de\s+entrada/i,
  /\d+\s*a\b/,
];

export function classifyPageContent(text: string, pageNumber: number): PageClassification {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Cover: first 3 pages + has 2+ cover patterns
  const isCover =
    pageNumber <= 3 &&
    COVER_PATTERNS.filter((p) => p.test(text)).length >= 2;

  // Summary/TOC: has pattern OR many dot-leader lines
  const tocLikeLines = lines.filter(
    (l) => /\.{3,}\s*\d+\s*$/.test(l) || /\s{6,}\d+\s*$/.test(l),
  ).length;
  const isSummary =
    SUMMARY_PATTERNS.some((p) => p.test(text)) ||
    (tocLikeLines >= 5 && tocLikeLines / Math.max(lines.length, 1) > 0.3);

  // Technical density
  const techMatches = TECHNICAL_INDICATORS.filter((p) => p.test(text)).length;
  const hasTechnicalContent = techMatches >= 2;
  const technicalDensityScore = techMatches;

  // Administrative: has admin pattern AND no significant technical content
  const isAdministrative =
    !isSummary &&
    !isCover &&
    ADMIN_SECTION_PATTERNS.filter((p) => p.test(text)).length >= 1 &&
    techMatches === 0;

  // Table detection
  const shortLines = lines.filter((l) => l.length < 100);
  const multiSpaceLines = shortLines.filter(
    (l) => /\s{4,}/.test(l) || l.includes("\t"),
  ).length;
  const hasTable =
    /tabela\s*\d+/i.test(text) ||
    (multiSpaceLines >= 4 && multiSpaceLines / Math.max(shortLines.length, 1) > 0.35);

  const isLowValue = isCover || isSummary || isAdministrative;

  return {
    isCover,
    isSummary,
    isAdministrative,
    hasTable,
    hasTechnicalContent,
    technicalDensityScore,
    isLowValue,
  };
}
