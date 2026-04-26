import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureNormativeTableSchema } from "@/features/rag/processing/normative-table-2";

export type AdminNormativeTableRow = {
  id: string;
  rowIndex: number;
  method: string | null;
  supplyType: string | null;
  loadMinKw: number | null;
  loadMaxKw: number | null;
  voltage: string | null;
  breakerAmp: number | null;
  breakerType: string | null;
  copperConcentricMm2: number | null;
  copperMultiplexedMm2: number | null;
  aluminumDuplexMm2: number | null;
  aluminumTriplexMm2: number | null;
  aluminumQuadruplexMm2: number | null;
  galvanizedSteelConduitInch: string | null;
  customerPhaseNeutralConductorMm2: number | null;
  groundingConductorMm2: number | null;
  groundingConduitInch: string | null;
  notes: string | null;
  rawText: string | null;
  pageNumber: number;
};

export type AdminNormativeTable = {
  id: string;
  documentTitle: string;
  versionLabel: string;
  documentVersionId: string;
  tableNumber: string | null;
  title: string;
  pageNumber: number;
  concessionaire: string | null;
  state: string | null;
  voltage: string | null;
  category: string | null;
  validationStatus: string;
  validationNotes: string | null;
  validatedAt: Date | null;
  rowCount: number;
  rows: AdminNormativeTableRow[];
};

type TableSqlRow = {
  id: string;
  document_title: string;
  version_label: string;
  document_version_id: string;
  table_number: string | null;
  title: string;
  page_number: number;
  concessionaire: string | null;
  state: string | null;
  voltage: string | null;
  category: string | null;
  validation_status: string | null;
  validation_notes: string | null;
  validated_at: Date | null;
  row_count: number;
};

type RowSqlRow = {
  id: string;
  table_id: string;
  row_index: number;
  method: string | null;
  supply_type: string | null;
  load_min_kw: number | null;
  load_max_kw: number | null;
  voltage: string | null;
  breaker_amp: number | null;
  breaker_type: string | null;
  copper_concentric_mm2: number | null;
  copper_multiplexed_mm2: number | null;
  aluminum_duplex_mm2: number | null;
  aluminum_triplex_mm2: number | null;
  aluminum_quadruplex_mm2: number | null;
  galvanized_steel_conduit_inch: string | null;
  customer_phase_neutral_conductor_mm2: number | null;
  grounding_conductor_mm2: number | null;
  grounding_conduit_inch: string | null;
  notes: string | null;
  raw_text: string | null;
  page_number: number;
};

export async function getAdminNormativeTables(limit = 20): Promise<AdminNormativeTable[]> {
  await ensureNormativeTableSchema();

  const tables = await prisma.$queryRaw<TableSqlRow[]>`
    select
      nt.id,
      td.title as document_title,
      dv.version_label,
      nt.document_version_id,
      nt.table_number,
      nt.title,
      nt.page_number,
      nt.concessionaire,
      nt.state,
      nt.voltage,
      nt.category,
      nt.validation_status,
      nt.validation_notes,
      nt.validated_at,
      count(ntr.id)::int as row_count
    from normative_tables nt
    join document_versions dv on dv.id = nt.document_version_id
    join technical_documents td on td.id = dv.document_id
    left join normative_table_rows ntr on ntr.table_id = nt.id
    group by nt.id, td.title, dv.version_label
    order by nt.created_at desc
    limit ${limit}
  `;

  const tableIds = tables.map((table) => table.id);
  const rows = tableIds.length > 0
    ? await prisma.$queryRaw<RowSqlRow[]>`
        select *
        from normative_table_rows
        where table_id in (${Prisma.join(tableIds)})
        order by table_id, row_index
      `
    : [];
  const rowsByTable = new Map<string, RowSqlRow[]>();
  for (const row of rows) {
    const group = rowsByTable.get(row.table_id) ?? [];
    group.push(row);
    rowsByTable.set(row.table_id, group);
  }

  return tables.map((table) => ({
    id: table.id,
    documentTitle: table.document_title,
    versionLabel: table.version_label,
    documentVersionId: table.document_version_id,
    tableNumber: table.table_number,
    title: table.title,
    pageNumber: table.page_number,
    concessionaire: table.concessionaire,
    state: table.state,
    voltage: table.voltage,
    category: table.category,
    validationStatus: table.validation_status ?? "NAO_VALIDADA",
    validationNotes: table.validation_notes,
    validatedAt: table.validated_at,
    rowCount: table.row_count,
    rows: (rowsByTable.get(table.id) ?? []).map(mapRow),
  }));
}

function mapRow(row: RowSqlRow): AdminNormativeTableRow {
  return {
    id: row.id,
    rowIndex: row.row_index,
    method: row.method,
    supplyType: row.supply_type,
    loadMinKw: row.load_min_kw,
    loadMaxKw: row.load_max_kw,
    voltage: row.voltage,
    breakerAmp: row.breaker_amp,
    breakerType: row.breaker_type,
    copperConcentricMm2: row.copper_concentric_mm2,
    copperMultiplexedMm2: row.copper_multiplexed_mm2,
    aluminumDuplexMm2: row.aluminum_duplex_mm2,
    aluminumTriplexMm2: row.aluminum_triplex_mm2,
    aluminumQuadruplexMm2: row.aluminum_quadruplex_mm2,
    galvanizedSteelConduitInch: row.galvanized_steel_conduit_inch,
    customerPhaseNeutralConductorMm2: row.customer_phase_neutral_conductor_mm2,
    groundingConductorMm2: row.grounding_conductor_mm2,
    groundingConduitInch: row.grounding_conduit_inch,
    notes: row.notes,
    rawText: row.raw_text,
    pageNumber: row.page_number,
  };
}
