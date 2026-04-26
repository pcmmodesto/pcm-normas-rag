export type DrawingContext = {
  drawingType: string | null;
  drawingNumber: string | null;
  drawingTitle: string | null;
  drawingSubject: string | null;
  visualElements: string[];
  technicalTerms: string[];
  applicableVoltageLevels: string[];
  detectedLabels: string[];
  technicalIntent: string | null;
  visualDescription: string;
};

// "DESENHO 4 —" | "FIGURA 4A —" | "DETALHE 3.1 —"
const DRAWING_HEADER_RE =
  /^(DESENHO|FIGURA|DETALHE|ESQUEMA|MONTAGEM|DIAGRAMA)\s+(\d+(?:[A-Z]|\.\d+)?)\s*[–—\-]?\s*(.*)/im;

const VOLTAGE_PATTERNS: Array<[RegExp, string]> = [
  [/\b13[,.]8\s*kv\b/i, "13,8 kV"],
  [/\b15\s*kv\b/i, "15 kV"],
  [/\b23[,.]1\s*kv\b/i, "23,1 kV"],
  [/\b34[,.]5\s*kv\b/i, "34,5 kV"],
  [/\b69\s*kv\b/i, "69 kV"],
  [/\b138\s*kv\b/i, "138 kV"],
  [/baixa\s*tens[aã]o/i, "baixa tensão"],
  [/m[eé]dia\s*tens[aã]o/i, "média tensão"],
];

const INTENT_MAP: Array<[RegExp, string]> = [
  [/afastamento.*condut.*edific|condut.*afastamento.*edific/i, "CLEARANCE_CONDUCTORS_BUILDINGS"],
  [/afastamento.*condut|condut.*afastamento/i, "CLEARANCE_CONDUCTORS"],
  [/padr[aã]o\s+de\s+entrada/i, "SERVICE_ENTRANCE_STANDARD"],
  [/ramal\s+de\s+(entrada|liga)/i, "SERVICE_ENTRANCE_CABLE"],
  [/aterramento|spda/i, "GROUNDING"],
  [/medi[cç][aã]o|medidor/i, "METERING"],
  [/demanda|carga\s+instalada/i, "LOAD_DEMAND"],
];

const TECHNICAL_TERMS_GLOSSARY = [
  "afastamento", "condutor", "edificação", "edificações", "muro", "sacada",
  "janela", "telhado", "chaminé", "placa de publicidade", "média tensão",
  "baixa tensão", "ramal", "padrão de entrada", "aterramento", "disjuntor",
  "bitola", "seção", "categoria", "demanda", "potência",
];

function extractVoltageLevels(text: string): string[] {
  const found: string[] = [];
  for (const [pattern, label] of VOLTAGE_PATTERNS) {
    if (pattern.test(text)) found.push(label);
  }
  return found;
}

function detectTechnicalIntent(titleAndText: string): string | null {
  for (const [pattern, intent] of INTENT_MAP) {
    if (pattern.test(titleAndText)) return intent;
  }
  return null;
}

function extractVisualElements(text: string): string[] {
  const elements: string[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // "a) Afastamento horizontal..." or "a Afastamento..."
    if (/^[a-hA-H][)\.\s]\s+[A-Z]/m.test(line) && line.length > 20 && line.length < 150) {
      const cleaned = line.replace(/^[a-hA-H][)\.\s]+\s*/i, "").trim();
      if (cleaned.length > 10) elements.push(cleaned);
    }
    // Standalone descriptive lines about afastamentos
    if (
      /afastamento\s+(horizontal|vertical|entre)/i.test(line) &&
      line.length < 150 &&
      !elements.includes(line)
    ) {
      elements.push(line);
    }
  }

  // Deduplicate preserving order
  const seen = new Set<string>();
  return elements.filter((e) => {
    const key = e.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

function extractDetectedLabels(text: string): string[] {
  const labels: string[] = [];
  const matches = text.matchAll(/\b([a-h])\s*[)\.\s]/gi);
  for (const m of matches) {
    const label = m[1].toLowerCase();
    if (!labels.includes(label)) labels.push(label);
  }
  return labels.sort();
}

function extractTechnicalTerms(text: string): string[] {
  const normalized = text.toLowerCase();
  return TECHNICAL_TERMS_GLOSSARY.filter((term) =>
    normalized.includes(term.toLowerCase()),
  );
}

export function extractDrawingContext(text: string): DrawingContext {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let drawingType: string | null = null;
  let drawingNumber: string | null = null;
  let drawingTitle: string | null = null;

  // Search first 25 lines for drawing header
  for (const line of lines.slice(0, 25)) {
    const match = DRAWING_HEADER_RE.exec(line);
    if (match) {
      drawingType = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      drawingNumber = match[2];
      const titleSuffix = match[3].trim();
      drawingTitle = titleSuffix
        ? `${drawingType} ${drawingNumber} — ${titleSuffix}`
        : `${drawingType} ${drawingNumber}`;
      break;
    }
  }

  const searchContext = (drawingTitle ?? "") + " " + text.slice(0, 800);
  const drawingSubject = drawingTitle
    ? detectTechnicalIntent(drawingTitle)
    : detectTechnicalIntent(searchContext);
  const technicalIntent = drawingSubject;

  const visualElements = extractVisualElements(text);
  const applicableVoltageLevels = extractVoltageLevels(text);
  const detectedLabels = extractDetectedLabels(text);
  const technicalTerms = extractTechnicalTerms(text);

  const visualDescription = [
    drawingTitle ? `${drawingTitle}.` : "Desenho normativo técnico.",
    visualElements.length > 0
      ? `Representa: ${visualElements.slice(0, 3).join("; ")}.`
      : "",
    applicableVoltageLevels.length > 0
      ? `Tensões: ${applicableVoltageLevels.join(", ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    drawingType,
    drawingNumber,
    drawingTitle,
    drawingSubject,
    visualElements,
    technicalTerms,
    applicableVoltageLevels,
    detectedLabels,
    technicalIntent,
    visualDescription,
  };
}
