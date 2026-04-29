import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureNormativeTableSchema } from "@/features/rag/processing/normative-table-2";

export type ServiceEntranceLookupInput = {
  loadKw?: number | null;
  loadKva?: number | null;
  voltage?: string | null;
  connectionType?: "MONOFASICO" | "BIFASICO" | "TRIFASICO" | null;
  state?: string | null;
  utility?: string | null;
};

export type ServiceEntranceLookupResult = {
  status: "FOUND" | "MISSING_CONTEXT" | "INSUFFICIENT_TABLE_DATA";
  reason: string;
  missingContext: string[];
  table?: {
    id: string;
    tableNumber: string | null;
    title: string;
    pageNumber: number;
    documentTitle: string;
    versionLabel: string;
    concessionaire: string | null;
    state: string | null;
    voltage: string | null;
    validationStatus: string | null;
    imageStoragePath: string | null;
  };
  row?: {
    id: string;
    rowIndex: number;
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
  candidateRows: Array<NonNullable<ServiceEntranceLookupResult["row"]>>;
  validationDebug?: {
    finalUsedValidatedTable: boolean;
    acceptedTables: ServiceEntranceTableCandidate[];
    blockedTables: ServiceEntranceTableCandidate[];
  };
};

export type ServiceEntranceTableCandidate = {
  tableId: string;
  tableNumber: string | null;
  title: string;
  documentTitle: string;
  versionLabel: string;
  pageNumber: number;
  concessionaire: string | null;
  state: string | null;
  voltage: string | null;
  tableValidationStatus: string | null;
  assetValidationStatus: string | null;
  rowIndex: number;
  stateMatchMode?: "EXACT" | "CONCESSIONAIRE_FALLBACK";
  blockReason?: string;
  acceptReason?: string;
};

type ServiceEntranceLookupRow = {
  table_id: string;
  table_number: string | null;
  title: string;
  table_page_number: number;
  document_title: string;
  version_label: string;
  concessionaire: string | null;
  state: string | null;
  table_voltage: string | null;
  asset_validation_status: string | null;
  table_validation_status: string | null;
  image_storage_path: string | null;
  state_match_mode: "EXACT" | "CONCESSIONAIRE_FALLBACK";
  row_id: string;
  row_index: number;
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

export async function lookupServiceEntranceTable(
  input: ServiceEntranceLookupInput,
): Promise<ServiceEntranceLookupResult> {
  const loadKw = input.loadKw ?? input.loadKva ?? null;
  const loadLabel = input.loadKw != null ? `${input.loadKw} kW` : `${input.loadKva} kVA`;
  const voltage = normalizeVoltage(input.voltage);
  const connectionType = input.connectionType ?? null;
  const state = input.state ?? null;
  const utility = input.utility ?? inferUtilityFromState(state);
  const missingContext = buildMissingContext({ loadKw, voltage, connectionType, state });

  if (missingContext.length > 0) {
    return {
      status: "MISSING_CONTEXT",
      reason: "Dados minimos insuficientes para selecionar linha normativa estruturada.",
      missingContext,
      candidateRows: [],
    };
  }

  try {
    await ensureNormativeTableSchema();
    const rows = await queryRows({
      loadKw: loadKw!,
      voltage: voltage!,
      connectionType: connectionType!,
      state: state!,
      utility,
      validationMode: "VALIDATED",
      allowStateFallback: false,
    });
    const fallbackRows = rows.length === 0
      ? await queryRows({
          loadKw: loadKw!,
          voltage: voltage!,
          connectionType: connectionType!,
          state: state!,
          utility,
          validationMode: "VALIDATED",
          allowStateFallback: true,
        })
      : [];
    const acceptedRows = rows.length > 0 ? rows : fallbackRows;
    const blockedExactRows = await queryRows({
      loadKw: loadKw!,
      voltage: voltage!,
      connectionType: connectionType!,
      state: state!,
      utility,
      validationMode: "BLOCKED",
      allowStateFallback: false,
    });
    const blockedRows = blockedExactRows.length > 0
      ? blockedExactRows
      : await queryRows({
          loadKw: loadKw!,
          voltage: voltage!,
          connectionType: connectionType!,
          state: state!,
          utility,
          validationMode: "BLOCKED",
          allowStateFallback: true,
        });

    if (acceptedRows.length === 0) {
      return {
        status: "INSUFFICIENT_TABLE_DATA",
        reason: blockedRows.length > 0
          ? "Tabela candidata encontrada, mas ainda nao validada."
          : "Tabela estruturada validada nao possui linha confiavel para a carga/contexto informado.",
        missingContext: [],
        candidateRows: [],
        validationDebug: buildValidationDebug([], blockedRows),
      };
    }

    const selected = acceptedRows[0];
    const fallbackNotice = selected.state_match_mode === "CONCESSIONAIRE_FALLBACK"
      ? ` Nao havia tabela validada especifica para ${state}; foi usada tabela validada da concessionaria ${selected.concessionaire ?? utility ?? "informada"}.`
      : "";
    return {
      status: "FOUND",
      reason: `Linha encontrada para ${loadLabel}, ${connectionType}, ${voltage}, ${state}.${fallbackNotice}`,
      missingContext: [],
      table: {
        id: selected.table_id,
        tableNumber: selected.table_number,
        title: selected.title,
        pageNumber: selected.table_page_number,
        documentTitle: selected.document_title,
        versionLabel: selected.version_label,
        concessionaire: selected.concessionaire,
        state: selected.state,
        voltage: selected.table_voltage,
        validationStatus: selected.asset_validation_status ?? selected.table_validation_status,
        imageStoragePath: selected.image_storage_path,
      },
      row: mapRow(selected),
      candidateRows: acceptedRows.map(mapRow),
      validationDebug: buildValidationDebug(acceptedRows, blockedRows),
    };
  } catch (error) {
    return {
      status: "INSUFFICIENT_TABLE_DATA",
      reason: error instanceof Error ? error.message : "Falha ao consultar tabela normativa estruturada.",
      missingContext: [],
      candidateRows: [],
      validationDebug: {
        finalUsedValidatedTable: false,
        acceptedTables: [],
        blockedTables: [],
      },
    };
  }
}

async function queryRows(params: {
  loadKw: number;
  voltage: string;
  connectionType: "MONOFASICO" | "BIFASICO" | "TRIFASICO";
  state: string;
  utility: string | null;
  validationMode: "VALIDATED" | "BLOCKED";
  allowStateFallback: boolean;
}) {
  const validationFilter = params.validationMode === "VALIDATED"
    ? Prisma.sql`nt.validation_status = 'VALIDATED'`
    : Prisma.sql`nt.validation_status <> 'VALIDATED' and nt.validation_status <> 'INACTIVE'`;

  return prisma.$queryRaw<ServiceEntranceLookupRow[]>(Prisma.sql`
    select
      nt.id as table_id,
      nt.table_number,
      nt.title,
      nt.page_number as table_page_number,
      td.title as document_title,
      dv.version_label,
      nt.concessionaire,
      nt.state,
      nt.voltage as table_voltage,
      na.validation_status::text as asset_validation_status,
      nt.validation_status as table_validation_status,
      na.image_storage_path,
      case
        when (
          nt.state ilike ${`%${params.state}%`}
          or td.state_codes @> ARRAY[${params.state}]::text[]
        ) then 'EXACT'
        else 'CONCESSIONAIRE_FALLBACK'
      end as state_match_mode,
      ntr.id as row_id,
      ntr.row_index,
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
      and coalesce(na.is_active, true) = true
      and ${validationFilter}
      and ntr.voltage = ${params.voltage}
      and ntr.supply_type = ${params.connectionType}
      and ${params.loadKw} >= coalesce(ntr.load_min_kw, -999999)
      and ${params.loadKw} <= ntr.load_max_kw
      and (
        nt.state ilike ${`%${params.state}%`}
        or td.state_codes @> ARRAY[${params.state}]::text[]
        or (
          ${params.allowStateFallback} = true
          and ${params.utility}::text is not null
          and (
            nt.concessionaire ilike ${`%${params.utility ?? ""}%`}
            or td.concessionaire ilike ${`%${params.utility ?? ""}%`}
            or nt.concessionaire ilike '%EQUATORIAL%'
            or td.concessionaire ilike '%EQUATORIAL%'
          )
        )
      )
      and (
        ${params.utility}::text is null
        or nt.concessionaire ilike ${`%${params.utility ?? ""}%`}
        or td.concessionaire ilike ${`%${params.utility ?? ""}%`}
      )
    order by
      case
        when (
          nt.state ilike ${`%${params.state}%`}
          or td.state_codes @> ARRAY[${params.state}]::text[]
        ) then 0
        else 1
      end,
      case when nt.validation_status = 'VALIDATED' then 0 else 1 end,
      ntr.row_index asc
    limit 5
  `);
}

function buildValidationDebug(
  acceptedRows: ServiceEntranceLookupRow[],
  blockedRows: ServiceEntranceLookupRow[],
): NonNullable<ServiceEntranceLookupResult["validationDebug"]> {
  return {
    finalUsedValidatedTable: acceptedRows.length > 0,
    acceptedTables: acceptedRows.map((row) =>
      mapCandidate(
        row,
        row.state_match_mode === "CONCESSIONAIRE_FALLBACK"
          ? "Tabela validada elegivel por fallback de concessionaria."
          : "Tabela validada elegivel para resposta tecnica.",
      ),
    ),
    blockedTables: blockedRows.map((row) => mapCandidate(row, undefined, blockReasonForStatus(row.table_validation_status))),
  };
}

function mapCandidate(
  row: ServiceEntranceLookupRow,
  acceptReason?: string,
  blockReason?: string,
): ServiceEntranceTableCandidate {
  return {
    tableId: row.table_id,
    tableNumber: row.table_number,
    title: row.title,
    documentTitle: row.document_title,
    versionLabel: row.version_label,
    pageNumber: row.table_page_number,
    concessionaire: row.concessionaire,
    state: row.state,
    voltage: row.table_voltage,
    tableValidationStatus: row.table_validation_status,
    assetValidationStatus: row.asset_validation_status,
    rowIndex: row.row_index,
    stateMatchMode: row.state_match_mode,
    acceptReason,
    blockReason,
  };
}

function blockReasonForStatus(status: string | null) {
  if (status === "PENDING") return "tabela ainda nao validada";
  if (status === "REVIEW" || status === "NEEDS_REVIEW") return "tabela em revisao";
  return "tabela ainda nao validada";
}

function mapRow(row: ServiceEntranceLookupRow): NonNullable<ServiceEntranceLookupResult["row"]> {
  return {
    id: row.row_id,
    rowIndex: row.row_index,
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

function buildMissingContext(params: {
  loadKw: number | null;
  voltage: string | null;
  connectionType: ServiceEntranceLookupInput["connectionType"];
  state: string | null;
}) {
  const missing: string[] = [];
  if (!params.loadKw) missing.push("carga instalada calculada ou informada");
  if (!params.voltage) missing.push("tensao de atendimento");
  if (!params.connectionType) missing.push("tipo de ligacao");
  if (!params.state) missing.push("cidade/estado ou concessionaria/tabela aplicavel");
  return missing;
}

function normalizeVoltage(voltage: string | null | undefined) {
  if (!voltage) return null;
  const normalized = voltage.replace(/\s/g, "").toLowerCase();
  if (normalized.includes("127/220")) return "127/220V";
  if (normalized.includes("220/380")) return "220/380V";
  if (normalized.includes("220/308")) return "220/380V";
  if (normalized === "127v") return "127V";
  if (normalized === "220v") return "220V";
  if (normalized === "380v") return "380V";
  return voltage;
}

function inferUtilityFromState(state: string | null) {
  if (state === "PA") return "Equatorial";
  if (state === "MA") return "Equatorial";
  return null;
}
