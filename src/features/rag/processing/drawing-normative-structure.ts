import type { DocContext, SmartChunk } from "./smart-chunker";
import { buildSearchText } from "./technical-normalizer";

export type DrawingMeasurement = {
  measurementName: string;
  value: number;
  tolerance: number | null;
  unit: string;
  minValue: number | null;
  maxValue: number | null;
  relatedDrawingNumber: string | null;
  noteNumber: string | null;
  rawText: string;
};

export type DrawingLegendRow = {
  item: string;
  description: string;
  quantity: string;
  hasAsterisk: boolean;
  responsibility: "CONCESSIONARIA" | "CLIENTE_OU_INSTALADOR" | "NAO_INFORMADO";
};

export type DrawingNote = {
  noteNumber: string | null;
  text: string;
  noteType: "RESPONSIBILITY_RULE" | "DIMENSION_REQUIREMENT" | "DRAWING_NOTE";
};

export type NormativeDrawingStructure = {
  drawingNumber: string | null;
  drawingTitle: string | null;
  relatedTableNumber: string | null;
  tableNumber: string | null;
  tableTitle: string | null;
  relatedDrawingNumber: string | null;
  rows: DrawingLegendRow[];
  notes: DrawingNote[];
  measurements: DrawingMeasurement[];
  hasConcessionaireResponsibilityRule: boolean;
};

const DRAWING_TITLE_RE =
  /\bDESENHO\s+(\d+)\s*[-–—]?\s*([^\n]+)/i;
const TABLE_TITLE_RE =
  /\bTABELA\s+(\d+)\s*[-–—]?\s*(Legenda\s+do\s+Desenho\s+(\d+)[^\n]*|[^\n]*)/i;

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function detectDrawingStructure(text: string): NormativeDrawingStructure {
  const drawingMatch = DRAWING_TITLE_RE.exec(text);
  const tableMatch = TABLE_TITLE_RE.exec(text);
  const notes = extractDrawingNotes(text, drawingMatch?.[1] ?? tableMatch?.[3] ?? null);
  const hasConcessionaireResponsibilityRule = notes.some(
    (note) => note.noteType === "RESPONSIBILITY_RULE",
  );
  const rows = extractLegendRows(text, hasConcessionaireResponsibilityRule);
  const measurements = extractMeasurements(notes, drawingMatch?.[1] ?? tableMatch?.[3] ?? null);

  return {
    drawingNumber: drawingMatch?.[1] ?? null,
    drawingTitle: drawingMatch
      ? `Desenho ${drawingMatch[1]} - ${drawingMatch[2].trim()}`
      : null,
    relatedTableNumber: tableMatch?.[1] ?? null,
    tableNumber: tableMatch?.[1] ?? null,
    tableTitle: tableMatch?.[2]?.trim() ?? null,
    relatedDrawingNumber: tableMatch?.[3] ?? null,
    rows,
    notes,
    measurements,
    hasConcessionaireResponsibilityRule,
  };
}

export function extractDrawingNotes(text: string, drawingNumber: string | null): DrawingNote[] {
  const notes: DrawingNote[] = [];
  const noteMatches = text.matchAll(/Nota\s*(\d+)\s*[:\-]\s*([^\n]+)/gi);

  for (const match of noteMatches) {
    const noteNumber = match[1] ?? null;
    const noteText = match[2].trim();
    const normalized = normalize(noteText);
    const noteType: DrawingNote["noteType"] =
      /responsabilidade.*concessionaria|concessionaria/.test(normalized) && /\*/.test(noteText)
        ? "RESPONSIBILITY_RULE"
        : /altura|distancia|afastamento|mm|metro|cota/.test(normalized)
          ? "DIMENSION_REQUIREMENT"
          : "DRAWING_NOTE";

    notes.push({
      noteNumber,
      text: noteText,
      noteType,
    });
  }

  if (notes.length === 0 && /nota/i.test(text) && drawingNumber) {
    notes.push({
      noteNumber: null,
      text: text.slice(Math.max(0, text.toLowerCase().indexOf("nota")), 600),
      noteType: "DRAWING_NOTE",
    });
  }

  return notes;
}

function extractMeasurements(
  notes: DrawingNote[],
  drawingNumber: string | null,
): DrawingMeasurement[] {
  const measurements: DrawingMeasurement[] = [];

  for (const note of notes) {
    const normalized = normalize(note.text);
    const valueMatch = /(\d{1,2}[.,]\d{3}|\d{3,4})\s*(?:\(\s*\+?\/?-?\s*(\d{2,4})\s*mm\s*\)|(?:\+\/-|\+\/\-|±)\s*(\d{2,4})\s*mm)?/i.exec(
      note.text,
    );

    if (!valueMatch || !/altura|medicao|medidor|caixa/.test(normalized)) continue;

    const value = Number(valueMatch[1].replace(".", "").replace(",", ""));
    const toleranceText = valueMatch[2] ?? valueMatch[3] ?? null;
    const tolerance = toleranceText ? Number(toleranceText) : null;

    measurements.push({
      measurementName: /caixa/.test(normalized)
        ? "altura da caixa de medicao"
        : "altura do medidor",
      value,
      tolerance,
      unit: "mm",
      minValue: tolerance ? value - tolerance : null,
      maxValue: tolerance ? value + tolerance : null,
      relatedDrawingNumber: drawingNumber,
      noteNumber: note.noteNumber,
      rawText: note.text,
    });
  }

  return measurements;
}

function extractLegendRows(
  text: string,
  hasConcessionaireResponsibilityRule: boolean,
): DrawingLegendRow[] {
  const rows: DrawingLegendRow[] = [];
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const startIndex = lines.findIndex((line) => /ITEM\s+DESCRI/i.test(normalize(line)));
  const tableLines = startIndex >= 0 ? lines.slice(startIndex + 1) : lines;

  for (const line of tableLines) {
    if (/^nota\b/i.test(line) || /^tabela\b/i.test(line)) continue;
    const match = /^(\d{1,2})(\*)?\s+(.+?)\s+((?:vari[aá]vel)|(?:\d+(?:[,.]\d+)?\s*(?:und|m|un|pç|pc)?))$/i.exec(line);
    if (!match) continue;

    const hasAsterisk = Boolean(match[2]);
    rows.push({
      item: `${match[1]}${hasAsterisk ? "*" : ""}`,
      description: match[3].trim(),
      quantity: match[4].trim(),
      hasAsterisk,
      responsibility: hasAsterisk
        ? "CONCESSIONARIA"
        : hasConcessionaireResponsibilityRule
          ? "CLIENTE_OU_INSTALADOR"
          : "NAO_INFORMADO",
    });
  }

  return rows;
}

export function buildConsolidatedDrawingChunks(
  chunks: SmartChunk[],
  docContext: DocContext,
  startIndex: number,
): SmartChunk[] {
  const drawingGroups = new Map<string, SmartChunk[]>();

  for (const chunk of chunks) {
    const drawingNumber =
      getStringMetadata(chunk, "drawingNumber") ??
      getStringMetadata(chunk, "relatedDrawingNumber");
    if (!drawingNumber) continue;
    const group = drawingGroups.get(drawingNumber) ?? [];
    group.push(chunk);
    drawingGroups.set(drawingNumber, group);
  }

  const consolidated: SmartChunk[] = [];
  let idx = startIndex;

  for (const [drawingNumber, group] of drawingGroups) {
    const drawingChunk = group.find((chunk) => getStringMetadata(chunk, "drawingNumber") === drawingNumber);
    const tableChunk = group.find((chunk) => getStringMetadata(chunk, "relatedDrawingNumber") === drawingNumber);
    const drawingTitle =
      getStringMetadata(drawingChunk ?? group[0], "drawingTitle") ??
      `Desenho ${drawingNumber}`;
    const tableNumber = getStringMetadata(tableChunk, "tableNumber");
    const hasResponsibilityRule = group.some((chunk) =>
      getArrayMetadata<DrawingNote>(chunk, "technicalNotes").some(
        (note) => note.noteType === "RESPONSIBILITY_RULE",
      ),
    );
    const rows = group.flatMap((chunk) => getRowsMetadata(chunk)).map((row) => ({
      ...row,
      responsibility:
        row.hasAsterisk && hasResponsibilityRule
          ? "CONCESSIONARIA"
          : !row.hasAsterisk && hasResponsibilityRule
            ? "CLIENTE_OU_INSTALADOR"
            : row.responsibility,
    }));
    const notes = group.flatMap((chunk) => getArrayMetadata<DrawingNote>(chunk, "technicalNotes"));
    const measurements = group.flatMap((chunk) =>
      getArrayMetadata<DrawingMeasurement>(chunk, "measurements"),
    );

    if (rows.length === 0 && notes.length === 0 && measurements.length === 0) continue;

    const concessionaireItems = rows.filter((row) => row.responsibility === "CONCESSIONARIA");
    const clientItems = rows.filter((row) => row.responsibility !== "CONCESSIONARIA");
    const text = [
      `${drawingTitle}`,
      tableNumber ? `Tabela relacionada: ${tableNumber}` : "",
      `Paginas relacionadas: ${Array.from(new Set(group.map((chunk) => chunk.pageNumber))).join(", ")}`,
      "",
      measurements.length > 0 ? "Cotas detectadas:" : "",
      ...measurements.map((m) =>
        `Nota ${m.noteNumber ?? "-"}: ${m.measurementName} = ${m.value} ${m.unit}${
          m.tolerance ? ` (+/- ${m.tolerance} ${m.unit}; minimo ${m.minValue}, maximo ${m.maxValue})` : ""
        }`,
      ),
      notes.length > 0 ? "\nNotas tecnicas:" : "",
      ...notes.map((note) => `Nota ${note.noteNumber ?? "-"}: ${note.text}`),
      concessionaireItems.length > 0 ? "\nItens de responsabilidade da concessionaria:" : "",
      ...concessionaireItems.map((row) => `${row.item} - ${row.description} (${row.quantity})`),
      clientItems.length > 0 ? "\nItens sem asterisco:" : "",
      ...clientItems.map((row) => `${row.item} - ${row.description} (${row.quantity})`),
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 5000);

    consolidated.push({
      pageNumber: group[0].pageNumber,
      chunkIndex: idx++,
      text,
      chunkType: "NORMATIVE_NOTE",
      sectionNumber: null,
      sectionTitle: drawingTitle,
      parentSectionNumber: null,
      tableNumber,
      tableTitle: getStringMetadata(tableChunk, "tableTitle"),
      isSearchable: true,
      isLowValue: false,
      searchText: buildSearchText({
        ...docContext,
        chunkText: text,
        sectionTitle: drawingTitle,
        tableTitle: getStringMetadata(tableChunk, "tableTitle"),
        chunkType: "CONSOLIDATED_DRAWING_TOPIC",
      }),
      metadata: {
        pageType: "CONSOLIDATED_DRAWING_TOPIC",
        drawingNumber,
        drawingTitle,
        relatedTableNumber: tableNumber,
        tableRows: rows,
        technicalNotes: notes,
        measurements,
        concessionaireItems,
        clientOrInstallerItems: clientItems,
        hasConcessionaireResponsibilityRule: hasResponsibilityRule,
        technicalIntent: "METERING",
        topic: `${drawingTitle}`,
        extractionMethod: "drawing_topic_consolidation",
      },
    });
  }

  return consolidated;
}

function getStringMetadata(chunk: SmartChunk | undefined, key: string) {
  const value = chunk?.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getArrayMetadata<T>(chunk: SmartChunk, key: string): T[] {
  const value = chunk.metadata?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

function getRowsMetadata(chunk: SmartChunk): DrawingLegendRow[] {
  return getArrayMetadata<DrawingLegendRow>(chunk, "tableRows");
}
