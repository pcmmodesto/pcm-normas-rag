import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
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
  // createNormativeAsset calls ensureNormativeTableSchema (memoized) and creates the asset row
  const assetId = await createNormativeAsset({
    context,
    type: "TABLE",
    title: "Tabela 2 - Dimensionamento do Ramal de Conexao e Entrada das Instalacoes em 127/220V",
    code: "TABELA 2",
    pageNumber,
    extractedText: sourceText,
    structuredData: { rows: TABLE_2_127_220_ROWS },
    validationStatus: "VALIDATED",
    voltageLevel: "127/220V",
    tags: ["dimensionamento", "ramal de entrada", "127/220V", "cabo", "disjuntor", "aterramento"],
  });

  const tableId = randomUUID();
  const stateStr = (context.stateCodes ?? []).join(",");

  // Build batch VALUES for all 14 rows up-front (outside the transaction)
  const rowValues = TABLE_2_127_220_ROWS.map((item) =>
    Prisma.sql`(
      ${randomUUID()},
      ${tableId},
      ${item.rowIndex},
      ${"CARGA_INSTALADA"},
      ${item.supplyType},
      ${item.loadMinKw},
      ${item.loadMaxKw},
      ${null}::double precision,
      ${null}::double precision,
      ${"127/220V"},
      ${item.breakerAmp},
      ${item.breakerAmp},
      ${item.breakerType},
      ${item.copperMultiplexedMm2},
      ${item.aluminumQuadruplexMm2 ?? item.aluminumTriplexMm2 ?? item.aluminumDuplexMm2},
      ${item.copperConcentricMm2},
      ${item.copperConcentricMm2},
      ${item.copperMultiplexedMm2},
      ${item.aluminumDuplexMm2},
      ${item.aluminumTriplexMm2},
      ${item.aluminumQuadruplexMm2},
      ${item.galvanizedSteelConduitInch},
      ${item.customerPhaseNeutralConductorMm2},
      ${item.groundingConductorMm2},
      ${item.galvanizedSteelConduitInch},
      ${item.groundingConduitInch},
      ${item.groundingConduitInch},
      ${item.notes ?? null},
      ${JSON.stringify(item)}::jsonb,
      ${buildRawText(item)},
      ${pageNumber},
      ${buildRawText(item)},
      ${pageNumber},
      now(),
      now()
    )`,
  );

  // Use a transaction so that NormativeTable and all its rows succeed or fail together.
  // This prevents the FK-23503 error where rows reference a table that was never created.
  await prisma.$transaction(async (tx) => {
    // Delete existing table — ON DELETE CASCADE removes its rows automatically
    await tx.$executeRaw`
      delete from normative_tables
      where document_version_id = ${context.documentVersionId}
        and table_number = ${"2"}
        and voltage = ${"127/220V"}
    `;

    await tx.$executeRaw`
      insert into normative_tables (
        id, asset_id, document_version_id, document_id, table_number, title, page_number,
        concessionaire, state, voltage, category, validation_status,
        applicable_voltage, applicable_supply_type, unit_basis, table_notes,
        source_text, created_at, updated_at
      )
      values (
        ${tableId},
        ${assetId},
        ${context.documentVersionId},
        ${context.documentId},
        ${"2"},
        ${"Dimensionamento do Ramal de Conexao e Entrada das Instalacoes em 127/220V"},
        ${pageNumber},
        ${context.concessionaire},
        ${stateStr},
        ${"127/220V"},
        ${"SERVICE_ENTRANCE_SIZING"},
        ${"VALIDATED"},
        ${"127/220V"},
        ${null},
        ${"CARGA_INSTALADA_KW"},
        ${"Tabela importada manual/semi-manualmente para consulta estruturada auditavel."},
        ${sourceText},
        now(),
        now()
      )
    `;

    await tx.$executeRaw`
      insert into normative_table_rows (
        id, table_id, row_index, method, supply_type, load_min_kw, load_max_kw,
        load_min_kva, load_max_kva, voltage, breaker_amp, breaker_a, breaker_type,
        copper_cable_mm2, aluminum_cable_mm2, concentric_cable_mm2,
        copper_concentric_mm2, copper_multiplexed_mm2,
        aluminum_duplex_mm2, aluminum_triplex_mm2, aluminum_quadruplex_mm2,
        galvanized_steel_conduit_inch, customer_phase_neutral_conductor_mm2,
        grounding_conductor_mm2, conduit_diameter, grounding_conduit_diameter,
        grounding_conduit_inch, notes, raw_row_json, raw_text, source_page, source_text, page_number,
        created_at, updated_at
      )
      values ${Prisma.join(rowValues)}
    `;
  });
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

    const assetId = await createNormativeAsset({
      context,
      type: "DRAWING",
      title,
      code: `DESENHO ${drawingNumber}`,
      pageNumber: drawingPage.page.pageNumber,
      extractedText: group.map((item) => item.page.text).join("\n\n").slice(0, 12000),
      structuredData: {
        relatedTableNumber,
        rows: allRows,
        notes: allNotes,
        measurements: allMeasurements,
      },
      validationStatus: "PENDING",
      voltageLevel: detectVoltage(group.map((item) => item.page.text).join("\n")),
      tags: ["desenho", "legenda", "nota", relatedTableNumber ? `tabela ${relatedTableNumber}` : ""].filter(Boolean),
    });

    await prisma.$executeRaw`
      insert into normative_figures (
        id, asset_id, document_version_id, document_id, figure_number, title, page_number,
        image_storage_path, description, figure_type, topic, voltage, service_type,
        related_table_number, source_text, metadata, created_at, updated_at
      )
      values (
        ${figureId},
        ${assetId},
        ${context.documentVersionId},
        ${context.documentId},
        ${drawingNumber},
        ${title},
        ${drawingPage.page.pageNumber},
        null,
        ${title},
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
          id, figure_id, item_code, item_number, description, quantity, has_asterisk,
          responsibility, related_table, notes, raw_text, metadata, created_at, updated_at
        )
        values (
          ${randomUUID()},
          ${figureId},
          ${row.item},
          ${row.item},
          ${row.description},
          ${row.quantity},
          ${row.hasAsterisk},
          ${row.responsibility},
          ${relatedTableNumber},
          null,
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

export async function createNormativeAsset(params: {
  context: VersionContext;
  type: "TABLE" | "FIGURE" | "DRAWING" | "NOTE" | "LEGEND" | "REQUIREMENT";
  title: string;
  code: string | null;
  pageNumber: number;
  imageStoragePath?: string | null;
  extractedText?: string | null;
  structuredData?: unknown;
  validationStatus?: "PENDING" | "VALIDATED" | "REJECTED" | "NEEDS_REVIEW";
  voltageLevel?: string | null;
  tags?: string[];
}) {
  await ensureNormativeTableSchema();
  const id = randomUUID();

  await prisma.$executeRaw`
    insert into normative_assets (
      id, document_id, document_version_id, type, title, code, page_number,
      image_storage_path, extracted_text, structured_data_json, validation_status,
      validated_by_user_id, validated_at, is_active, concessionaire, state,
      voltage_level, tags, created_at, updated_at
    )
    values (
      ${id},
      ${params.context.documentId},
      ${params.context.documentVersionId},
      ${params.type}::normative_asset_type,
      ${params.title},
      ${params.code},
      ${params.pageNumber},
      ${params.imageStoragePath ?? null},
      ${params.extractedText ?? null},
      ${JSON.stringify(params.structuredData ?? {})}::jsonb,
      ${(params.validationStatus ?? "PENDING")}::normative_asset_validation_status,
      null,
      ${params.validationStatus === "VALIDATED" ? new Date() : null},
      true,
      ${params.context.concessionaire},
      ${(params.context.stateCodes ?? []).join(",")},
      ${params.voltageLevel ?? null},
      ${params.tags ?? []},
      now(),
      now()
    )
  `;

  return id;
}

// Memoize per module instance so repeated calls within one invocation are no-ops
let _schemaPromise: Promise<void> | null = null;
export function ensureNormativeTableSchema(): Promise<void> {
  if (_schemaPromise) return _schemaPromise;
  _schemaPromise = _runNormativeTableSchema().catch((err) => {
    _schemaPromise = null; // allow retry on failure
    throw err;
  });
  return _schemaPromise;
}

async function _runNormativeTableSchema() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'normative_asset_type') THEN
        CREATE TYPE normative_asset_type AS ENUM ('TABLE', 'FIGURE', 'DRAWING', 'NOTE', 'LEGEND', 'REQUIREMENT');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'normative_asset_validation_status') THEN
        CREATE TYPE normative_asset_validation_status AS ENUM ('PENDING', 'VALIDATED', 'REJECTED', 'NEEDS_REVIEW');
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS normative_assets (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      document_version_id TEXT NOT NULL,
      type normative_asset_type NOT NULL,
      title TEXT NOT NULL,
      code TEXT,
      page_number INTEGER NOT NULL,
      image_storage_path TEXT,
      extracted_text TEXT,
      structured_data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      validation_status normative_asset_validation_status NOT NULL DEFAULT 'PENDING',
      validated_by_user_id TEXT,
      validated_at TIMESTAMP(3),
      is_active BOOLEAN NOT NULL DEFAULT true,
      concessionaire TEXT,
      state TEXT,
      voltage_level TEXT,
      tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS normative_tables (
      id TEXT PRIMARY KEY,
      asset_id TEXT REFERENCES normative_assets(id) ON DELETE SET NULL,
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
      applicable_voltage TEXT,
      applicable_supply_type TEXT,
      unit_basis TEXT,
      table_notes TEXT,
      source_text TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE normative_tables
      ADD COLUMN IF NOT EXISTS asset_id TEXT REFERENCES normative_assets(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'NAO_VALIDADA',
      ADD COLUMN IF NOT EXISTS validation_notes TEXT,
      ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS applicable_voltage TEXT,
      ADD COLUMN IF NOT EXISTS applicable_supply_type TEXT,
      ADD COLUMN IF NOT EXISTS unit_basis TEXT,
      ADD COLUMN IF NOT EXISTS table_notes TEXT;
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
      load_min_kva DOUBLE PRECISION,
      load_max_kva DOUBLE PRECISION,
      voltage TEXT,
      breaker_amp INTEGER,
      breaker_a INTEGER,
      breaker_type TEXT,
      copper_cable_mm2 DOUBLE PRECISION,
      aluminum_cable_mm2 DOUBLE PRECISION,
      concentric_cable_mm2 DOUBLE PRECISION,
      copper_concentric_mm2 DOUBLE PRECISION,
      copper_multiplexed_mm2 DOUBLE PRECISION,
      aluminum_duplex_mm2 DOUBLE PRECISION,
      aluminum_triplex_mm2 DOUBLE PRECISION,
      aluminum_quadruplex_mm2 DOUBLE PRECISION,
      galvanized_steel_conduit_inch TEXT,
      customer_phase_neutral_conductor_mm2 DOUBLE PRECISION,
      grounding_conductor_mm2 DOUBLE PRECISION,
      conduit_diameter TEXT,
      grounding_conduit_diameter TEXT,
      grounding_conduit_inch TEXT,
      notes TEXT,
      raw_row_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      raw_text TEXT,
      source_page INTEGER,
      source_text TEXT,
      page_number INTEGER NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(table_id, row_index)
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE normative_table_rows
      ADD COLUMN IF NOT EXISTS load_min_kva DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS load_max_kva DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS breaker_a INTEGER,
      ADD COLUMN IF NOT EXISTS copper_cable_mm2 DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS aluminum_cable_mm2 DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS concentric_cable_mm2 DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS conduit_diameter TEXT,
      ADD COLUMN IF NOT EXISTS grounding_conduit_diameter TEXT,
      ADD COLUMN IF NOT EXISTS raw_row_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS source_page INTEGER,
      ADD COLUMN IF NOT EXISTS source_text TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS normative_figures (
      id TEXT PRIMARY KEY,
      asset_id TEXT REFERENCES normative_assets(id) ON DELETE SET NULL,
      document_version_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      figure_number TEXT,
      title TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      image_storage_path TEXT,
      description TEXT,
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
    ALTER TABLE normative_figures
      ADD COLUMN IF NOT EXISTS asset_id TEXT REFERENCES normative_assets(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS image_storage_path TEXT,
      ADD COLUMN IF NOT EXISTS description TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS normative_figure_items (
      id TEXT PRIMARY KEY,
      figure_id TEXT NOT NULL REFERENCES normative_figures(id) ON DELETE CASCADE,
      item_code TEXT,
      item_number TEXT,
      description TEXT NOT NULL,
      quantity TEXT,
      has_asterisk BOOLEAN NOT NULL DEFAULT false,
      responsibility TEXT NOT NULL DEFAULT 'NAO_INFORMADO',
      related_table TEXT,
      notes TEXT,
      raw_text TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE normative_figure_items
      ADD COLUMN IF NOT EXISTS item_number TEXT,
      ADD COLUMN IF NOT EXISTS related_table TEXT,
      ADD COLUMN IF NOT EXISTS notes TEXT;
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
    `CREATE INDEX IF NOT EXISTS normative_assets_document_version_id_idx ON normative_assets(document_version_id)`,
    `CREATE INDEX IF NOT EXISTS normative_assets_document_id_idx ON normative_assets(document_id)`,
    `CREATE INDEX IF NOT EXISTS normative_assets_type_idx ON normative_assets(type)`,
    `CREATE INDEX IF NOT EXISTS normative_assets_validation_status_idx ON normative_assets(validation_status)`,
    `CREATE INDEX IF NOT EXISTS normative_assets_is_active_idx ON normative_assets(is_active)`,
    `CREATE INDEX IF NOT EXISTS normative_assets_code_idx ON normative_assets(code)`,
    `CREATE INDEX IF NOT EXISTS normative_tables_document_version_id_idx ON normative_tables(document_version_id)`,
    `CREATE INDEX IF NOT EXISTS normative_tables_document_id_idx ON normative_tables(document_id)`,
    `CREATE INDEX IF NOT EXISTS normative_tables_table_number_idx ON normative_tables(table_number)`,
    `CREATE INDEX IF NOT EXISTS normative_tables_asset_id_idx ON normative_tables(asset_id)`,
    `CREATE INDEX IF NOT EXISTS normative_tables_state_voltage_idx ON normative_tables(state, voltage)`,
    `CREATE INDEX IF NOT EXISTS normative_table_rows_table_id_idx ON normative_table_rows(table_id)`,
    `CREATE INDEX IF NOT EXISTS normative_table_rows_voltage_supply_type_idx ON normative_table_rows(voltage, supply_type)`,
    `CREATE INDEX IF NOT EXISTS normative_table_rows_load_min_kw_load_max_kw_idx ON normative_table_rows(load_min_kw, load_max_kw)`,
    `CREATE INDEX IF NOT EXISTS normative_figures_document_version_id_idx ON normative_figures(document_version_id)`,
    `CREATE INDEX IF NOT EXISTS normative_figures_document_id_idx ON normative_figures(document_id)`,
    `CREATE INDEX IF NOT EXISTS normative_figures_asset_id_idx ON normative_figures(asset_id)`,
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
