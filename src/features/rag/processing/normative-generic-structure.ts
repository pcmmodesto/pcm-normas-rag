import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { ExtractedPdfPage } from "./extract-pdf-text";
import { ensureNormativeTableSchema, type VersionContext } from "./normative-table-2";

type DetectedTable = {
  tableNumber: string;
  title: string;
  pageNumber: number;
  voltage: string | null;
  category: string;
  sourceText: string;
  rows: string[];
};

const TABLE_TITLE_RE = /\bTABELA\s+(\d+)\s*[-–—]?\s*([^\n]*)/gi;

export async function saveGenericNormativeTables(
  pages: ExtractedPdfPage[],
  context: VersionContext,
) {
  await ensureNormativeTableSchema();

  await prisma.$executeRaw`
    delete from normative_tables
    where document_version_id = ${context.documentVersionId}
      and category = 'GENERIC_NORMATIVE_TABLE'
  `;

  const tables = detectGenericTables(pages);

  for (const table of tables) {
    if (isCuratedTable2(table)) continue;

    const tableId = randomUUID();
    await prisma.$executeRaw`
      insert into normative_tables (
        id, document_version_id, document_id, table_number, title, page_number,
        concessionaire, state, voltage, category, validation_status, source_text,
        created_at, updated_at
      )
      values (
        ${tableId},
        ${context.documentVersionId},
        ${context.documentId},
        ${table.tableNumber},
        ${table.title},
        ${table.pageNumber},
        ${context.concessionaire},
        ${(context.stateCodes ?? []).join(",")},
        ${table.voltage},
        ${table.category},
        'NAO_VALIDADA',
        ${table.sourceText},
        now(),
        now()
      )
    `;

    const rows = table.rows.length > 0 ? table.rows : [table.sourceText.slice(0, 1500)];
    for (const [index, rawText] of rows.entries()) {
      await prisma.$executeRaw`
        insert into normative_table_rows (
          id, table_id, row_index, method, voltage, notes, raw_text, page_number,
          created_at, updated_at
        )
        values (
          ${randomUUID()},
          ${tableId},
          ${index + 1},
          'EXTRACAO_GENERICA',
          ${table.voltage},
          ${table.title},
          ${rawText},
          ${table.pageNumber},
          now(),
          now()
        )
      `;
    }
  }

  return { tables: tables.length };
}

function detectGenericTables(pages: ExtractedPdfPage[]): DetectedTable[] {
  const tables: DetectedTable[] = [];

  for (const page of pages) {
    const matches = Array.from(page.text.matchAll(TABLE_TITLE_RE));
    for (const [index, match] of matches.entries()) {
      const tableNumber = match[1];
      const rawTitle = match[2]?.trim() || `Tabela ${tableNumber}`;
      const start = match.index ?? 0;
      const nextStart = matches[index + 1]?.index ?? page.text.length;
      const sourceText = page.text.slice(start, nextStart).trim().slice(0, 12000);
      if (!sourceText) continue;

      const title = `Tabela ${tableNumber} - ${cleanTitle(rawTitle)}`;
      tables.push({
        tableNumber,
        title,
        pageNumber: page.pageNumber,
        voltage: detectVoltage(sourceText),
        category: "GENERIC_NORMATIVE_TABLE",
        sourceText,
        rows: extractGenericRows(sourceText),
      });
    }
  }

  return tables;
}

function extractGenericRows(sourceText: string) {
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);

  const rows = lines.filter((line) =>
    /^(\d{1,3}[*)]?|[a-z]\)|[IVX]{1,6}\b)\s+/i.test(line) ||
    /\b\d+(?:[,.]\d+)?\s*(?:kW|kVA|mm2|mm²|pol|und|m)\b/i.test(line),
  );

  return rows
    .filter((line) => !/^tabela\s+\d+/i.test(line))
    .slice(0, 80);
}

function cleanTitle(title: string) {
  return title
    .replace(/\s+/g, " ")
    .replace(/DOCUMENTO NAO CONTROLADO/gi, "")
    .trim()
    .slice(0, 240);
}

function detectVoltage(text: string) {
  const compact = text.replace(/\s/g, "").toLowerCase();
  if (compact.includes("127/220")) return "127/220V";
  if (compact.includes("220/380")) return "220/380V";
  return null;
}

function isCuratedTable2(table: DetectedTable) {
  return (
    table.tableNumber === "2" &&
    /dimensionamento do ramal de conex/i.test(
      table.title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    ) &&
    table.voltage === "127/220V"
  );
}
