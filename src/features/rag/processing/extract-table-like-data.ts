export type ExtractedTable = {
  tableNumber: string | null;
  tableTitle: string | null;
  columns: string[];
  rows: Array<Record<string, string>>;
  notes: string[];
  rawText: string;
  tableExtractionStatus: "ok" | "partial" | "needs_review";
};

const TABLE_TITLE_RE = /^Tabela\s+(\d+(?:\.\d+)?)\s*[–—\-]?\s*(.*?)$/im;

function splitColumns(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map((c) => c.trim()).filter(Boolean);
  }
  return line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
}

function isDataLine(line: string): boolean {
  const cells = splitColumns(line);
  if (cells.length < 2) return false;
  return cells.some((c) => /\d|^-+$|mm[²2]|kva|kw|kv/i.test(c));
}

function isColumnHeaderLine(line: string): boolean {
  const cells = splitColumns(line);
  return cells.length >= 2 && cells.every((c) => c.length < 40 && !/^\d+$/.test(c));
}

function looksLikeNote(line: string): boolean {
  return (
    /^Nota[s]?[:\.]\s*/i.test(line) ||
    /^\d+\.\s+[A-Z]/.test(line) ||
    /^ATENÇÃO:/i.test(line)
  );
}

export function extractTableLikeData(text: string): ExtractedTable[] {
  const tables: ExtractedTable[] = [];
  const lines = text.split("\n").map((l) => l.trimEnd());

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const titleMatch = TABLE_TITLE_RE.exec(line);

    if (!titleMatch) {
      i++;
      continue;
    }

    const tableNumber = titleMatch[1];
    const tableTitle = titleMatch[2].trim() || null;
    i++;

    const tableLines: string[] = [line];
    const notes: string[] = [];
    let inNotes = false;

    while (i < lines.length) {
      const current = lines[i].trim();

      if (current === "" && lines[i + 1]?.trim() === "") break;

      if (!inNotes && looksLikeNote(current)) {
        inNotes = true;
      }

      if (inNotes) {
        if (current) notes.push(current);
      } else {
        tableLines.push(current);
      }

      i++;
    }

    const rawText = tableLines.join("\n");
    const contentLines = tableLines.slice(1).map((l) => l.trim()).filter(Boolean);

    let columns: string[] = [];
    const rows: Array<Record<string, string>> = [];
    let headerFound = false;

    for (const cline of contentLines) {
      if (!headerFound && isColumnHeaderLine(cline)) {
        columns = splitColumns(cline);
        headerFound = true;
        continue;
      }
      if (isDataLine(cline)) {
        const cells = splitColumns(cline);
        const row: Record<string, string> = {};
        cells.forEach((cell, idx) => {
          const colKey = columns[idx] ?? `col${idx + 1}`;
          row[colKey] = cell;
        });
        rows.push(row);
      }
    }

    let tableExtractionStatus: "ok" | "partial" | "needs_review";
    if (columns.length >= 2 && rows.length >= 2) {
      const goodRows = rows.filter((r) => Object.keys(r).length >= columns.length - 1).length;
      tableExtractionStatus = goodRows / rows.length >= 0.7 ? "ok" : "partial";
    } else if (columns.length >= 1 || rows.length >= 1) {
      tableExtractionStatus = "partial";
    } else {
      tableExtractionStatus = "needs_review";
    }

    tables.push({
      tableNumber,
      tableTitle,
      columns,
      rows,
      notes,
      rawText,
      tableExtractionStatus,
    });
  }

  return tables;
}
