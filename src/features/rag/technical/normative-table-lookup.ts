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

export type TableCompatibilityStatus =
  | "COMPATIBLE_BY_CORPORATE_GROUP"
  | "COMPATIBLE_BY_STATE"
  | "BLOCKED_BY_VOLTAGE"
  | "NEEDS_VOLTAGE_CONTEXT"
  | "NO_VALIDATED_TABLE_FOUND";

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
    scope: string;
    utilityGroup: string | null;
    applicableUfs: string[];
    serviceType: string | null;
    compatibilityStatus: TableCompatibilityStatus;
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
    compatibilityStatus: TableCompatibilityStatus;
    city?: string | null;
    state?: string | null;
    probableUtility?: string | null;
    questionVoltage?: string | null;
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
  scope: string;
  utilityGroup: string | null;
  applicableUfs: string[];
  serviceType: string | null;
  questionVoltage?: string | null;
  compatibilityStatus: TableCompatibilityStatus;
  tableValidationStatus: string | null;
  assetValidationStatus: string | null;
  rowIndex: number;
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
  scope: string;
  utility_group: string | null;
  applicable_ufs: string[] | null;
  service_type: string | null;
  compatibility_status: TableCompatibilityStatus;
  asset_validation_status: string | null;
  table_validation_status: string | null;
  image_storage_path: string | null;
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
    const compatibilityStatus: TableCompatibilityStatus = !voltage
      ? "NEEDS_VOLTAGE_CONTEXT"
      : "NO_VALIDATED_TABLE_FOUND";
    return {
      status: "MISSING_CONTEXT",
      reason: !voltage
        ? "Informe a tensao de fornecimento para selecionar a tabela normativa correta."
        : "Dados minimos insuficientes para selecionar linha normativa estruturada.",
      missingContext,
      candidateRows: [],
      validationDebug: {
        finalUsedValidatedTable: false,
        compatibilityStatus,
        state,
        probableUtility: utility,
        questionVoltage: voltage,
        acceptedTables: [],
        blockedTables: [],
      },
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
      ignoreVoltage: false,
    });
    const voltageBlockedRows = rows.length === 0
      ? await queryRows({
          loadKw: loadKw!,
          voltage: voltage!,
          connectionType: connectionType!,
          state: state!,
          utility,
          validationMode: "VALIDATED",
          ignoreVoltage: true,
        })
      : [];
    const blockedRows = await queryRows({
      loadKw: loadKw!,
      voltage: voltage!,
      connectionType: connectionType!,
      state: state!,
      utility,
      validationMode: "BLOCKED",
      ignoreVoltage: false,
    });

    if (rows.length === 0) {
      const compatibilityStatus: TableCompatibilityStatus =
        voltageBlockedRows.length > 0 ? "BLOCKED_BY_VOLTAGE" : "NO_VALIDATED_TABLE_FOUND";
      return {
        status: "INSUFFICIENT_TABLE_DATA",
        reason: compatibilityStatus === "BLOCKED_BY_VOLTAGE"
          ? "Existe tabela validada corporativa/compatível, mas a tensao informada nao corresponde a tensao da tabela."
          : blockedRows.length > 0
            ? "Tabela candidata encontrada, mas ainda nao validada."
            : "Nenhuma tabela validada compativel foi encontrada para carga, tensao e tipo de ligacao informados.",
        missingContext: [],
        candidateRows: [],
        validationDebug: buildValidationDebug([], [...voltageBlockedRows, ...blockedRows], {
          compatibilityStatus,
          state,
          probableUtility: utility,
          questionVoltage: voltage,
        }),
      };
    }

    const selected = rows[0];
    const corporateNotice = selected.compatibility_status === "COMPATIBLE_BY_CORPORATE_GROUP"
      ? " Norma corporativa Equatorial utilizada conforme tensao informada."
      : "";
    return {
      status: "FOUND",
      reason: `Linha encontrada para ${loadLabel}, ${connectionType}, ${voltage}, ${state}.${corporateNotice}`,
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
        scope: selected.scope,
        utilityGroup: selected.utility_group,
        applicableUfs: selected.applicable_ufs ?? [],
        serviceType: selected.service_type,
        compatibilityStatus: selected.compatibility_status,
        validationStatus: selected.asset_validation_status ?? selected.table_validation_status,
        imageStoragePath: selected.image_storage_path,
      },
      row: mapRow(selected),
      candidateRows: rows.map(mapRow),
      validationDebug: buildValidationDebug(rows, blockedRows, {
        compatibilityStatus: selected.compatibility_status,
        state,
        probableUtility: utility,
        questionVoltage: voltage,
      }),
    };
  } catch (error) {
    return {
      status: "INSUFFICIENT_TABLE_DATA",
      reason: error instanceof Error ? error.message : "Falha ao consultar tabela normativa estruturada.",
      missingContext: [],
      candidateRows: [],
      validationDebug: {
        finalUsedValidatedTable: false,
        compatibilityStatus: "NO_VALIDATED_TABLE_FOUND",
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
  ignoreVoltage: boolean;
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
      nt.scope,
      nt.utility_group,
      nt.applicable_ufs,
      nt.service_type,
      case
        when nt.scope = 'CORPORATE_GROUP' and nt.utility_group = 'EQUATORIAL' then 'COMPATIBLE_BY_CORPORATE_GROUP'
        when (
          nt.state ilike ${`%${params.state}%`}
          or td.state_codes @> ARRAY[${params.state}]::text[]
          or nt.applicable_ufs @> ARRAY[${params.state}]::text[]
        ) then 'COMPATIBLE_BY_STATE'
        else 'NO_VALIDATED_TABLE_FOUND'
      end as compatibility_status,
      na.validation_status::text as asset_validation_status,
      nt.validation_status as table_validation_status,
      na.image_storage_path,
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
      and (${params.ignoreVoltage} = true or ntr.voltage = ${params.voltage})
      and ntr.supply_type = ${params.connectionType}
      and ${params.loadKw} >= coalesce(ntr.load_min_kw, -999999)
      and ${params.loadKw} <= ntr.load_max_kw
      and (
        (
          nt.scope = 'CORPORATE_GROUP'
          and nt.utility_group = 'EQUATORIAL'
          and ${params.utility}::text ilike '%Equatorial%'
        )
        or (
          coalesce(nt.scope, 'STATE_SPECIFIC') = 'STATE_SPECIFIC'
          and (
            nt.state ilike ${`%${params.state}%`}
            or td.state_codes @> ARRAY[${params.state}]::text[]
            or nt.applicable_ufs @> ARRAY[${params.state}]::text[]
          )
        )
      )
      and (
        ${params.utility}::text is null
        or nt.utility_group ilike ${`%${params.utility ?? ""}%`}
        or nt.concessionaire ilike ${`%${params.utility ?? ""}%`}
        or td.concessionaire ilike ${`%${params.utility ?? ""}%`}
      )
    order by
      case when ntr.voltage = ${params.voltage} then 0 else 1 end,
      case
        when nt.scope = 'CORPORATE_GROUP' and nt.utility_group = 'EQUATORIAL' then 0
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
  context: {
    compatibilityStatus: TableCompatibilityStatus;
    state?: string | null;
    probableUtility?: string | null;
    questionVoltage?: string | null;
  },
): NonNullable<ServiceEntranceLookupResult["validationDebug"]> {
  return {
    finalUsedValidatedTable: acceptedRows.length > 0,
    compatibilityStatus: context.compatibilityStatus,
    state: context.state,
    probableUtility: context.probableUtility,
    questionVoltage: context.questionVoltage,
    acceptedTables: acceptedRows.map((row) =>
      mapCandidate(
        row,
        row.compatibility_status === "COMPATIBLE_BY_CORPORATE_GROUP"
          ? "Tabela corporativa Equatorial compativel pela tensao informada."
          : "Tabela validada elegivel para resposta tecnica.",
        undefined,
        context.questionVoltage,
      ),
    ),
    blockedTables: blockedRows.map((row) =>
      mapCandidate(
        row,
        undefined,
        row.voltage !== context.questionVoltage
          ? "tensao da tabela diferente da tensao informada"
          : blockReasonForStatus(row.table_validation_status),
        context.questionVoltage,
      ),
    ),
  };
}

function mapCandidate(
  row: ServiceEntranceLookupRow,
  acceptReason?: string,
  blockReason?: string,
  questionVoltage?: string | null,
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
    scope: row.scope,
    utilityGroup: row.utility_group,
    applicableUfs: row.applicable_ufs ?? [],
    serviceType: row.service_type,
    questionVoltage,
    compatibilityStatus: row.compatibility_status,
    tableValidationStatus: row.table_validation_status,
    assetValidationStatus: row.asset_validation_status,
    rowIndex: row.row_index,
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
