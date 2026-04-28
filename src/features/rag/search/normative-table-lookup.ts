import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureNormativeTableSchema } from "@/features/rag/processing/normative-table-2";
import type { TechnicalEntities } from "./intent-classifier";

export type NormativeTableLookupResult = {
  mode: "TABLE_LOOKUP";
  attempted: boolean;
  found: boolean;
  reason: string;
  table?: {
    id: string;
    tableNumber: string | null;
    title: string;
    pageNumber: number;
    concessionaire: string | null;
    state: string | null;
    voltage: string | null;
    category: string | null;
    documentTitle: string;
    versionLabel: string;
    imageStoragePath?: string | null;
    validationStatus?: string | null;
  };
  selectedRow?: NormativeTableRowResult;
  candidateRows: NormativeTableRowResult[];
  kvaKwNotice?: string;
};

export type NormativeTableRowResult = {
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

type TableLookupRow = {
  table_id: string;
  table_number: string | null;
  title: string;
  table_page_number: number;
  concessionaire: string | null;
  state: string | null;
  table_voltage: string | null;
  category: string | null;
  document_title: string;
  version_label: string;
  image_storage_path: string | null;
  asset_validation_status: string | null;
  table_validation_status: string | null;
  row_id: string;
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

export function shouldUseTableLookup(entities: TechnicalEntities) {
  return (
    entities.hasCable ||
    entities.hasBreaker ||
    entities.hasKva ||
    Boolean(entities.voltage) ||
    Boolean(entities.installedLoadKva) ||
    entities.hasServiceDrop ||
    entities.hasServiceEntranceStandard ||
    entities.hasMetering ||
    entities.hasClearance ||
    entities.hasHeight ||
    entities.hasMaterials ||
    Boolean(entities.drawingNumber)
  );
}

export async function lookupNormativeSizingTable(
  entities: TechnicalEntities,
): Promise<NormativeTableLookupResult> {
  if (!shouldUseTableLookup(entities)) {
    return {
      mode: "TABLE_LOOKUP",
      attempted: false,
      found: false,
      reason: "Pergunta nao possui sinais de dimensionamento tabular.",
      candidateRows: [],
    };
  }

  const loadKw = entities.installedLoadKva ?? null;
  const supplyType = entities.connectionType?.toUpperCase() ?? null;
  const voltage = normalizeVoltage(entities.voltage);
  const state = entities.state ?? null;

  if (!loadKw || !supplyType || !voltage) {
    return {
      mode: "TABLE_LOOKUP",
      attempted: true,
      found: false,
      reason: "Faltam carga, tipo de ligacao ou tensao para selecionar linha estruturada.",
      candidateRows: [],
      kvaKwNotice: entities.hasKva ? kvaKwNotice(entities.installedLoadKva) : undefined,
    };
  }

  let rows: TableLookupRow[] = [];
  let queryError: string | null = null;
  try {
    await ensureNormativeTableSchema();
    rows = await queryRows({ loadKw, supplyType, voltage, state });
  } catch (error) {
    queryError = error instanceof Error ? error.message : "Erro ao consultar tabelas estruturadas.";
  }
  const selected = rows[0] ?? null;

  if (!selected) {
    return {
      mode: "TABLE_LOOKUP",
      attempted: true,
      found: false,
      reason: "Nenhuma linha estruturada encontrada para a faixa informada.",
      candidateRows: rows.map(mapRow),
      kvaKwNotice: entities.hasKva ? kvaKwNotice(entities.installedLoadKva) : undefined,
    };
  }

  const selectedRow = mapRow(selected);
  const table = {
    id: selected.table_id,
    tableNumber: selected.table_number,
    title: selected.title,
    pageNumber: selected.table_page_number,
    concessionaire: selected.concessionaire,
    state: selected.state,
    voltage: selected.table_voltage,
    category: selected.category,
    documentTitle: selected.document_title,
    versionLabel: selected.version_label,
    imageStoragePath: selected.image_storage_path,
    validationStatus: selected.asset_validation_status ?? selected.table_validation_status,
  };

  return {
    mode: "TABLE_LOOKUP",
    attempted: true,
    found: true,
    reason: queryError
      ? `Linha selecionada pela base estruturada validada. Observacao SQL: ${queryError}`
      : `Linha selecionada por tensao ${voltage}, tipo ${supplyType} e carga ${loadKw} kW dentro da faixa.`,
    table,
    selectedRow,
    candidateRows: rows.map(mapRow),
    kvaKwNotice: entities.hasKva ? kvaKwNotice(entities.installedLoadKva) : undefined,
  };
}

async function queryRows(params: {
  loadKw: number;
  supplyType: string;
  voltage: string;
  state: string | null;
}) {
  return prisma.$queryRaw<TableLookupRow[]>(Prisma.sql`
    select
      nt.id as table_id,
      nt.table_number,
      nt.title,
      nt.page_number as table_page_number,
      nt.concessionaire,
      nt.state,
      nt.voltage as table_voltage,
      nt.category,
      td.title as document_title,
      dv.version_label,
      na.image_storage_path,
      na.validation_status::text as asset_validation_status,
      nt.validation_status as table_validation_status,
      ntr.id as row_id,
      ntr.row_index,
      ntr.method,
      ntr.supply_type,
      ntr.load_min_kw,
      ntr.load_max_kw,
      ntr.voltage,
      ntr.breaker_amp,
      ntr.breaker_type,
      ntr.copper_concentric_mm2,
      ntr.copper_multiplexed_mm2,
      ntr.aluminum_duplex_mm2,
      ntr.aluminum_triplex_mm2,
      ntr.aluminum_quadruplex_mm2,
      ntr.galvanized_steel_conduit_inch,
      ntr.customer_phase_neutral_conductor_mm2,
      ntr.grounding_conductor_mm2,
      ntr.grounding_conduit_inch,
      ntr.notes,
      ntr.raw_text,
      ntr.page_number
    from normative_table_rows ntr
    join normative_tables nt on nt.id = ntr.table_id
    left join normative_assets na on na.id = nt.asset_id
    join document_versions dv on dv.id = nt.document_version_id
    join technical_documents td on td.id = dv.document_id
    where dv.processing_status = 'READY'
      and dv.status <> 'ARCHIVED'::version_status
      and ntr.voltage = ${params.voltage}
      and ntr.supply_type = ${params.supplyType}
      and (${params.loadKw} >= coalesce(ntr.load_min_kw, -999999))
      and ${params.loadKw} <= ntr.load_max_kw
      and (${params.state}::text is null or nt.state ilike ${`%${params.state ?? ""}%`} or td.state_codes @> ARRAY[${params.state ?? ""}]::text[])
      and coalesce(na.is_active, true) = true
      and (
        na.validation_status = 'VALIDATED'::normative_asset_validation_status
        or nt.validation_status in ('VALIDATED', 'VALIDADA')
      )
    order by
      case when nt.validation_status = 'VALIDADA' then 0 else 1 end,
      case when nt.table_number = '2' then 0 else 1 end,
      ntr.row_index asc
    limit 5
  `);
}

function mapRow(row: TableLookupRow): NormativeTableRowResult {
  return {
    id: row.row_id,
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

function normalizeVoltage(voltage: string | undefined) {
  if (!voltage) return null;
  const normalized = voltage.replace(/\s/g, "").toLowerCase();
  if (normalized.includes("127/220")) return "127/220V";
  if (normalized.includes("220/380")) return "220/380V";
  return null;
}

function kvaKwNotice(load: number | undefined) {
  if (!load) return undefined;
  return `A tabela usa carga em kW. Voce informou kVA. Considerando fator de potencia 1,0, ${load} kVA ≈ ${load} kW. Confirme a demanda/carga em kW para validacao final.`;
}
