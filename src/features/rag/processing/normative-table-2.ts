import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { ExtractedPdfPage } from "./extract-pdf-text";
import { detectDrawingStructure, type DrawingMeasurement } from "./drawing-normative-structure";

export type VersionContext = {
  documentVersionId: string;
  documentId: string;
  concessionaire: string | null;
  stateCodes: string[] | null;
};

export type Table2Row = {
  rowIndex: number;
  supplyType: "MONOFASICO" | "BIFASICO" | "TRIFASICO";
  loadMinKw: number | null;
  loadMaxKw: number;
  breakerAmp: number;
  breakerType: string;
  copperConcentricMm2: number | null;
  copperMultiplexedMm2: number | null;
  aluminumDuplexMm2: number | null;
  aluminumTriplexMm2: number | null;
  aluminumQuadruplexMm2: number | null;
  galvanizedSteelConduitInch: string;
  customerPhaseNeutralConductorMm2: number;
  groundingConductorMm2: number;
  groundingConduitInch: string;
  notes?: string;
};

export const TABLE_2_127_220_ROWS: Table2Row[] = [
  row(1, "MONOFASICO", null, 3.5, 32, "MONO", 6, 6, 10, null, null, "3/4", 6, 6, "1/2"),
  row(2, "MONOFASICO", 3.6, 7, 63, "MONO", 10, 10, 10, null, null, "3/4", 10, 10, "1/2"),
  row(3, "MONOFASICO", 7.1, 10, 80, "MONO", null, 10, 16, null, null, "3/4", 10, 10, "1/2"),
  row(4, "BIFASICO", null, 10, 50, "BI", null, 6, null, 10, null, "1", 10, 10, "1/2", "Ver Nota 24"),
  row(5, "BIFASICO", 10.1, 12, 63, "BI", null, 10, null, 16, null, "1", 10, 10, "1/2"),
  row(6, "BIFASICO", 12.1, 15, 70, "BI", null, 10, null, 16, null, "1", 10, 10, "1/2"),
  row(7, "TRIFASICO", null, 15, 40, "TRI", null, 6, null, null, 10, "1.1/2", 6, 6, "1/2", "Ver Nota 25"),
  row(8, "TRIFASICO", 15.1, 17, 50, "TRI", null, 10, null, null, 16, "1.1/2", 10, 6, "1/2"),
  row(9, "TRIFASICO", 17.1, 24, 70, "TRI", null, 16, null, null, 25, "2", 16, 16, "1"),
  row(10, "TRIFASICO", 24.1, 35, 100, "TRI", null, 25, null, null, 50, "2", 25, 25, "1"),
  row(11, "TRIFASICO", 35.1, 44, 125, "TRI", null, 35, null, null, 70, "2.1/2", 35, 25, "1"),
  row(12, "TRIFASICO", 44.1, 52, 150, "TRI", null, 50, null, null, 70, "3", 50, 25, "1"),
  row(13, "TRIFASICO", 52.1, 61, 175, "TRI", null, 70, null, null, 95, "3", 70, 35, "1"),
  row(14, "TRIFASICO", 61.1, 75, 200, "TRI", null, 70, null, null, 120, "3", 70, 35, "1"),
];

function row(
  rowIndex: number,
  supplyType: Table2Row["supplyType"],
  loadMinKw: number | null,
  loadMaxKw: number,
  breakerAmp: number,
  breakerType: string,
  copperConcentricMm2: number | null,
  copperMultiplexedMm2: number | null,
  aluminumDuplexMm2: number | null,
  aluminumTriplexMm2: number | null,
  aluminumQuadruplexMm2: number | null,
  galvanizedSteelConduitInch: string,
  customerPhaseNeutralConductorMm2: number,
  groundingConductorMm2: number,
  groundingConduitInch: string,
  notes?: string,
): Table2Row {
  return {
    rowIndex,
    supplyType,
    loadMinKw,
    loadMaxKw,
    breakerAmp,
    breakerType,
    copperConcentricMm2,
    copperMultiplexedMm2,
    aluminumDuplexMm2,
    aluminumTriplexMm2,
    aluminumQuadruplexMm2,
    galvanizedSteelConduitInch,
    customerPhaseNeutralConductorMm2,
    groundingConductorMm2,
    groundingConduitInch,
    notes,
  };
}

export async function saveKnownNormativeTables(
  pages: ExtractedPdfPage[],
  context: VersionContext,
) {
  await ensureNormativeTableSchema();

  const tablePage =
    pages.find((page) => /TABELA\s+2\s+[-–—]\s*Dimensionamento do Ramal/i.test(page.text)) ??
    pages.find((page) => /Dimensionamento do Ramal de Conex/i.test(page.text));

  if (!tablePage) return;

  const isEqtlBt =
    /NT\.?00001\.?EQTL|Fornecimento de Energia Eletrica em Baixa Tensao|Fornecimento de Energia El[eé]trica em Baixa Tens[aã]o/i.test(
      tablePage.text,
    ) || /TABELA\s+2|127\s*\/\s*220|Ramal de Conex/i.test(tablePage.text);
  if (!isEqtlBt) return;

  await upsertKnownTable2(context, tablePage.pageNumber, tablePage.text);
}

export async function importKnownTable2ForLatestVersion() {
  await ensureNormativeTableSchema();

  const rows = await prisma.$queryRaw<Array<{
    document_version_id: string;
    document_id: string;
    concessionaire: string | null;
    state_codes: string[] | null;
  }>>`
    select
      dv.id as document_version_id,
      td.id as document_id,
      td.concessionaire,
      td.state_codes
    from document_versions dv
    join technical_documents td on td.id = dv.document_id
    where td.title ilike '%NT.00001.EQTL-09%'
       or td.title ilike '%Fornecimento-de-Energia-Eletrica-em-Baixa-Tensao%'
       or td.title ilike '%Fornecimento de Energia Eletrica em Baixa Tensao%'
    order by dv.created_at desc
    limit 1
  `;

  const version = rows[0];
  if (!version) {
    throw new Error("Nenhuma versao da NT.00001.EQTL-09 foi encontrada para importar a Tabela 2.");
  }

  await upsertKnownTable2(
    {
      documentVersionId: version.document_version_id,
      documentId: version.document_id,
      concessionaire: version.concessionaire,
      stateCodes: version.state_codes,
    },
    32,
    "Importacao manual/semi-manual: Tabela 2 - Dimensionamento do Ramal de Conexao e Entrada das Instalacoes em 127/220V.",
  );

  return { rows: TABLE_2_127_220_ROWS.length };
}

async function upsertKnownTable2(
  context: VersionContext,
  pageNumber: number,
  sourceText: string,
) {
  await prisma.$executeRaw`
    delete from normative_tables
    where document_version_id = ${context.documentVersionId}
      and table_number = '2'
      and voltage = '127/220V'
  `;

  const tableId = randomUUID();
  await prisma.$executeRaw`
    insert into normative_tables (
      id, document_version_id, document_id, table_number, title, page_number,
      concessionaire, state, voltage, category, validation_status, source_text, created_at, updated_at
    )
    values (
      ${tableId},
      ${context.documentVersionId},
      ${context.documentId},
      '2',
      'Dimensionamento do Ramal de Conexao e Entrada das Instalacoes em 127/220V',
      ${pageNumber},
      ${context.concessionaire},
      ${(context.stateCodes ?? []).join(",")},
      '127/220V',
      'SERVICE_ENTRANCE_SIZING',
      'NAO_VALIDADA',
      ${sourceText},
      now(),
      now()
    )
  `;

  for (const item of TABLE_2_127_220_ROWS) {
    await prisma.$executeRaw`
      insert into normative_table_rows (
        id, table_id, row_index, method, supply_type, load_min_kw, load_max_kw,
        voltage, breaker_amp, breaker_type, copper_concentric_mm2, copper_multiplexed_mm2,
        aluminum_duplex_mm2, aluminum_triplex_mm2, aluminum_quadruplex_mm2,
        galvanized_steel_conduit_inch, customer_phase_neutral_conductor_mm2,
        grounding_conductor_mm2, grounding_conduit_inch, notes, raw_text, page_number,
        created_at, updated_at
      )
      values (
        ${randomUUID()},
        ${tableId},
        ${item.rowIndex},
        'CARGA_INSTALADA',
        ${item.supplyType},
        ${item.loadMinKw},
        ${item.loadMaxKw},
        '127/220V',
        ${item.breakerAmp},
        ${item.breakerType},
        ${item.copperConcentricMm2},
        ${item.copperMultiplexedMm2},
        ${item.aluminumDuplexMm2},
        ${item.aluminumTriplexMm2},
        ${item.aluminumQuadruplexMm2},
        ${item.galvanizedSteelConduitInch},
        ${item.customerPhaseNeutralConductorMm2},
        ${item.groundingConductorMm2},
        ${item.groundingConduitInch},
        ${item.notes},
        ${buildRawText(item)},
        ${pageNumber},
        now(),
        now()
      )
    `;
  }
}

export async function saveKnownNormativeFiguresAndNotes(
  pages: ExtractedPdfPage[],
  context: VersionContext,
) {
  await ensureNormativeTableSchema();

  await prisma.$executeRaw`
    delete from normative_figures
    where document_version_id = ${context.documentVersionId}
  `;
  await prisma.$executeRaw`
    delete from normative_notes
    where document_version_id = ${context.documentVersionId}
  `;

  const groups = new Map<string, Array<{ page: ExtractedPdfPage; structure: ReturnType<typeof detectDrawingStructure> }>>();

  for (const page of pages) {
    const structure = detectDrawingStructure(page.text);
    const drawingNumber = structure.drawingNumber ?? structure.relatedDrawingNumber;
    if (!drawingNumber) continue;
    if (
      !structure.drawingTitle &&
      !structure.tableTitle &&
      structure.rows.length === 0 &&
      structure.notes.length === 0 &&
      structure.measurements.length === 0
    ) {
      continue;
    }
    const group = groups.get(drawingNumber) ?? [];
    group.push({ page, structure });
    groups.set(drawingNumber, group);
  }

  for (const [drawingNumber, group] of groups) {
    const drawingPage = group.find((item) => item.structure.drawingTitle) ?? group[0];
    const tablePage = group.find((item) => item.structure.tableTitle);
    const figureId = randomUUID();
    const title =
      drawingPage.structure.drawingTitle ??
      `Desenho ${drawingNumber}${tablePage?.structure.tableTitle ? ` - ${tablePage.structure.tableTitle}` : ""}`;
    const relatedTableNumber = tablePage?.structure.tableNumber ?? drawingPage.structure.relatedTableNumber;
    const allRows = group.flatMap((item) => item.structure.rows);
    const allNotes = group.flatMap((item) =>
      item.structure.notes.map((note) => ({ ...note, pageNumber: item.page.pageNumber })),
    );
    const allMeasurements = group.flatMap((item) =>
      item.structure.measurements.map((measurement) => ({
        ...measurement,
        pageNumber: item.page.pageNumber,
      })),
    );

    await prisma.$executeRaw`
      insert into normative_figures (
        id, document_version_id, document_id, figure_number, title, page_number,
        figure_type, topic, voltage, service_type, related_table_number,
        source_text, metadata, created_at, updated_at
      )
      values (
        ${figureId},
        ${context.documentVersionId},
        ${context.documentId},
        ${drawingNumber},
        ${title},
        ${drawingPage.page.pageNumber},
        'TECHNICAL_DRAWING',
        ${title},
        ${detectVoltage(group.map((item) => item.page.text).join("\n"))},
        ${detectServiceType(title)},
        ${relatedTableNumber},
        ${group.map((item) => item.page.text).join("\n\n").slice(0, 12000)},
        ${JSON.stringify({
          relatedTableNumber,
          pages: group.map((item) => item.page.pageNumber),
          measurements: allMeasurements,
          notes: allNotes,
        })}::jsonb,
        now(),
        now()
      )
    `;

    for (const row of allRows) {
      await prisma.$executeRaw`
        insert into normative_figure_items (
          id, figure_id, item_code, description, quantity, has_asterisk,
          responsibility, raw_text, metadata, created_at, updated_at
        )
        values (
          ${randomUUID()},
          ${figureId},
          ${row.item},
          ${row.description},
          ${row.quantity},
          ${row.hasAsterisk},
          ${row.responsibility},
          ${`${row.item} ${row.description} ${row.quantity}`},
          ${JSON.stringify(row)}::jsonb,
          now(),
          now()
        )
      `;
    }

    for (const note of allNotes) {
      await insertNormativeNote({
        context,
        figureId,
        noteNumber: note.noteNumber,
        noteType: note.noteType,
        text: note.text,
        pageNumber: note.pageNumber,
      });
    }

    for (const measurement of allMeasurements) {
      await insertNormativeNote({
        context,
        figureId,
        noteNumber: measurement.noteNumber,
        noteType: "DIMENSION_REQUIREMENT",
        text: measurement.rawText,
        pageNumber: measurement.pageNumber,
        measurement,
      });
    }
  }
}

async function insertNormativeNote(params: {
  context: VersionContext;
  figureId: string | null;
  tableId?: string | null;
  noteNumber: string | null;
  noteType: string;
  text: string;
  pageNumber: number;
  measurement?: DrawingMeasurement;
}) {
  await prisma.$executeRaw`
    insert into normative_notes (
      id, document_version_id, document_id, table_id, figure_id, note_number,
      note_type, title, text, measurement_name, value, tolerance, unit,
      min_value, max_value, page_number, metadata, created_at, updated_at
    )
    values (
      ${randomUUID()},
      ${params.context.documentVersionId},
      ${params.context.documentId},
      ${params.tableId ?? null},
      ${params.figureId},
      ${params.noteNumber},
      ${params.noteType},
      ${params.measurement?.measurementName ?? null},
      ${params.text},
      ${params.measurement?.measurementName ?? null},
      ${params.measurement?.value ?? null},
      ${params.measurement?.tolerance ?? null},
      ${params.measurement?.unit ?? null},
      ${params.measurement?.minValue ?? null},
      ${params.measurement?.maxValue ?? null},
      ${params.pageNumber},
      ${JSON.stringify(params.measurement ?? {})}::jsonb,
      now(),
      now()
    )
  `;
}

function buildRawText(item: Table2Row) {
  return [
    item.supplyType,
    `${item.loadMinKw ?? "Ate"} a ${item.loadMaxKw} kW`,
    `${item.breakerAmp} A (${item.breakerType})`,
    `cobre concentrico ${item.copperConcentricMm2 ?? "-"}`,
    `cobre multiplexado ${item.copperMultiplexedMm2 ?? "-"}`,
    `aluminio duplex ${item.aluminumDuplexMm2 ?? "-"}`,
    `aluminio triplex ${item.aluminumTriplexMm2 ?? "-"}`,
    `aluminio quadruplex ${item.aluminumQuadruplexMm2 ?? "-"}`,
    `eletroduto aco ${item.galvanizedSteelConduitInch}`,
    `condutor cliente fase/neutro ${customerPhaseNeutralLabel(item)}`,
    `aterramento ${item.groundingConductorMm2}`,
  ].join(" | ");
}

export function customerPhaseNeutralLabel(
  item: Pick<Table2Row, "supplyType" | "customerPhaseNeutralConductorMm2" | "groundingConductorMm2">,
) {
  if (item.supplyType === "TRIFASICO") {
    return `${item.customerPhaseNeutralConductorMm2}(${item.groundingConductorMm2})`;
  }
  return `${item.customerPhaseNeutralConductorMm2}(${item.customerPhaseNeutralConductorMm2})`;
}

function detectVoltage(text: string) {
  const normalized = text.replace(/\s/g, "").toLowerCase();
  if (normalized.includes("127/220")) return "127/220V";
  if (normalized.includes("220/380")) return "220/380V";
  return null;
}

function detectServiceType(text: string) {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/trifasico/.test(normalized)) return "TRIFASICO";
  if (/bifasico/.test(normalized)) return "BIFASICO";
  if (/monofasico/.test(normalized)) return "MONOFASICO";
  return null;
}

export async function ensureNormativeTableSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS normative_tables (
      id TEXT PRIMARY KEY,
      document_version_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      table_number TEXT,
      title TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      concessionaire TEXT,
      state TEXT,
      voltage TEXT,
      category TEXT,
      validation_status TEXT NOT NULL DEFAULT 'NAO_VALIDADA',
      validation_notes TEXT,
      validated_at TIMESTAMP(3),
      source_text TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE normative_tables
      ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'NAO_VALIDADA',
      ADD COLUMN IF NOT EXISTS validation_notes TEXT,
      ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP(3);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS normative_table_rows (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL REFERENCES normative_tables(id) ON DELETE CASCADE,
      row_index INTEGER NOT NULL,
      method TEXT,
      supply_type TEXT,
      load_min_kw DOUBLE PRECISION,
      load_max_kw DOUBLE PRECISION,
      voltage TEXT,
      breaker_amp INTEGER,
      breaker_type TEXT,
      copper_concentric_mm2 DOUBLE PRECISION,
      copper_multiplexed_mm2 DOUBLE PRECISION,
      aluminum_duplex_mm2 DOUBLE PRECISION,
      aluminum_triplex_mm2 DOUBLE PRECISION,
      aluminum_quadruplex_mm2 DOUBLE PRECISION,
      galvanized_steel_conduit_inch TEXT,
      customer_phase_neutral_conductor_mm2 DOUBLE PRECISION,
      grounding_conductor_mm2 DOUBLE PRECISION,
      grounding_conduit_inch TEXT,
      notes TEXT,
      raw_text TEXT,
      page_number INTEGER NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(table_id, row_index)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS normative_figures (
      id TEXT PRIMARY KEY,
      document_version_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      figure_number TEXT,
      title TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      figure_type TEXT,
      topic TEXT,
      voltage TEXT,
      service_type TEXT,
      related_table_number TEXT,
      source_text TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS normative_figure_items (
      id TEXT PRIMARY KEY,
      figure_id TEXT NOT NULL REFERENCES normative_figures(id) ON DELETE CASCADE,
      item_code TEXT,
      description TEXT NOT NULL,
      quantity TEXT,
      has_asterisk BOOLEAN NOT NULL DEFAULT false,
      responsibility TEXT NOT NULL DEFAULT 'NAO_INFORMADO',
      raw_text TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS normative_notes (
      id TEXT PRIMARY KEY,
      document_version_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      table_id TEXT REFERENCES normative_tables(id) ON DELETE CASCADE,
      figure_id TEXT REFERENCES normative_figures(id) ON DELETE CASCADE,
      note_number TEXT,
      note_type TEXT NOT NULL,
      title TEXT,
      text TEXT NOT NULL,
      measurement_name TEXT,
      value DOUBLE PRECISION,
      tolerance DOUBLE PRECISION,
      unit TEXT,
      min_value DOUBLE PRECISION,
      max_value DOUBLE PRECISION,
      page_number INTEGER NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  for (const statement of [
    `CREATE INDEX IF NOT EXISTS normative_tables_document_version_id_idx ON normative_tables(document_version_id)`,
    `CREATE INDEX IF NOT EXISTS normative_tables_document_id_idx ON normative_tables(document_id)`,
    `CREATE INDEX IF NOT EXISTS normative_tables_table_number_idx ON normative_tables(table_number)`,
    `CREATE INDEX IF NOT EXISTS normative_tables_state_voltage_idx ON normative_tables(state, voltage)`,
    `CREATE INDEX IF NOT EXISTS normative_table_rows_table_id_idx ON normative_table_rows(table_id)`,
    `CREATE INDEX IF NOT EXISTS normative_table_rows_voltage_supply_type_idx ON normative_table_rows(voltage, supply_type)`,
    `CREATE INDEX IF NOT EXISTS normative_table_rows_load_min_kw_load_max_kw_idx ON normative_table_rows(load_min_kw, load_max_kw)`,
    `CREATE INDEX IF NOT EXISTS normative_figures_document_version_id_idx ON normative_figures(document_version_id)`,
    `CREATE INDEX IF NOT EXISTS normative_figures_document_id_idx ON normative_figures(document_id)`,
    `CREATE INDEX IF NOT EXISTS normative_figures_figure_number_idx ON normative_figures(figure_number)`,
    `CREATE INDEX IF NOT EXISTS normative_figures_related_table_number_idx ON normative_figures(related_table_number)`,
    `CREATE INDEX IF NOT EXISTS normative_figure_items_figure_id_idx ON normative_figure_items(figure_id)`,
    `CREATE INDEX IF NOT EXISTS normative_figure_items_responsibility_idx ON normative_figure_items(responsibility)`,
    `CREATE INDEX IF NOT EXISTS normative_notes_document_version_id_idx ON normative_notes(document_version_id)`,
    `CREATE INDEX IF NOT EXISTS normative_notes_document_id_idx ON normative_notes(document_id)`,
    `CREATE INDEX IF NOT EXISTS normative_notes_table_id_idx ON normative_notes(table_id)`,
    `CREATE INDEX IF NOT EXISTS normative_notes_figure_id_idx ON normative_notes(figure_id)`,
    `CREATE INDEX IF NOT EXISTS normative_notes_note_type_idx ON normative_notes(note_type)`,
    `CREATE INDEX IF NOT EXISTS normative_notes_note_number_idx ON normative_notes(note_number)`,
  ]) {
    await prisma.$executeRawUnsafe(statement);
  }
}
