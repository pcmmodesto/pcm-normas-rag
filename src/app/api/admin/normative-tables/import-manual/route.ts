import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureNormativeTableSchema } from "@/features/rag/processing/normative-table-2";

export const runtime = "nodejs";

type RowPayload = {
  rowIndex: number;
  supplyType: string;
  loadMinKw: number | null;
  loadMaxKw: number;
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
  voltage: string;
  method: string;
};

type Body = {
  documentVersionId: string;
  documentId: string;
  concessionaire: string | null;
  stateCodes: string[];
  tableNumber: string;
  title: string;
  voltage: string;
  category: string;
  pdfPageNumber: number | null;
  printedPage: string | null;
  revision: string | null;
  homologationDate: string | null;
  method: string;
  rows: RowPayload[];
};

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ ok: false, message: "Autenticacao obrigatoria." }, { status: 401 });
  }
  if (currentUser.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Apenas administradores podem importar tabelas." }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON invalido." }, { status: 400 });
  }

  const { documentVersionId, documentId, concessionaire, stateCodes, tableNumber, title, voltage, category, pdfPageNumber, printedPage, revision, homologationDate, method, rows } = body;

  if (!documentVersionId || !documentId) {
    return NextResponse.json({ ok: false, message: "documentVersionId e documentId sao obrigatorios." }, { status: 400 });
  }
  if (!tableNumber?.trim() || !title?.trim()) {
    return NextResponse.json({ ok: false, message: "tableNumber e title sao obrigatorios." }, { status: 400 });
  }
  if (!rows?.length) {
    return NextResponse.json({ ok: false, message: "Pelo menos uma linha e obrigatoria." }, { status: 400 });
  }

  try {
    await ensureNormativeTableSchema();
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: `Falha ao preparar schema: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }

  // Build structured summary for the asset
  const stateStr = (stateCodes ?? []).join(",");
  const sourceText = [
    `Importacao manual — Tabela ${tableNumber}: ${title}`,
    revision ? `Revisao: ${revision}` : null,
    homologationDate ? `Homologada em: ${homologationDate}` : null,
    printedPage ? `Pagina: ${printedPage}` : null,
    `Tensao: ${voltage}`,
  ].filter(Boolean).join(" | ");

  const tableId = randomUUID();
  const assetId = randomUUID();
  const pageNumber = pdfPageNumber ?? 1;

  // Build batch VALUES for all rows
  const rowValues = rows.map((r) =>
    Prisma.sql`(
      ${randomUUID()},
      ${tableId},
      ${r.rowIndex},
      ${r.method},
      ${r.supplyType},
      ${r.loadMinKw},
      ${r.loadMaxKw},
      ${null}::double precision,
      ${null}::double precision,
      ${r.voltage},
      ${r.breakerAmp},
      ${r.breakerAmp},
      ${r.breakerType},
      ${r.copperMultiplexedMm2},
      ${r.aluminumQuadruplexMm2 ?? r.aluminumTriplexMm2 ?? r.aluminumDuplexMm2},
      ${r.copperConcentricMm2},
      ${r.copperConcentricMm2},
      ${r.copperMultiplexedMm2},
      ${r.aluminumDuplexMm2},
      ${r.aluminumTriplexMm2},
      ${r.aluminumQuadruplexMm2},
      ${r.galvanizedSteelConduitInch},
      ${r.customerPhaseNeutralConductorMm2},
      ${r.groundingConductorMm2},
      ${r.galvanizedSteelConduitInch},
      ${r.groundingConduitInch},
      ${r.groundingConduitInch},
      ${r.notes},
      ${JSON.stringify(r)}::jsonb,
      ${null},
      ${pageNumber},
      ${sourceText},
      ${pageNumber},
      now(),
      now()
    )`,
  );

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create normative asset (type TABLE, VALIDATED)
      await tx.$executeRaw`
        insert into normative_assets (
          id, document_id, document_version_id, type, title, code, page_number,
          image_storage_path, extracted_text, structured_data_json,
          validation_status, validated_by_user_id, validated_at,
          is_active, concessionaire, state, voltage_level, tags,
          created_at, updated_at
        )
        values (
          ${assetId},
          ${documentId},
          ${documentVersionId},
          ${"TABLE"}::normative_asset_type,
          ${title},
          ${"TABELA " + tableNumber},
          ${pageNumber},
          ${null},
          ${sourceText},
          ${JSON.stringify({ tableNumber, voltage, rows: rows.length, revision, homologationDate })}::jsonb,
          ${"VALIDATED"}::normative_asset_validation_status,
          ${currentUser.id},
          now(),
          true,
          ${concessionaire},
          ${stateStr},
          ${voltage},
          ${["dimensionamento", "tabela", tableNumber, voltage].filter(Boolean)},
          now(),
          now()
        )
      `;

      // 2. Delete any existing table with same number + voltage (idempotent)
      await tx.$executeRaw`
        delete from normative_tables
        where document_version_id = ${documentVersionId}
          and table_number = ${tableNumber}
          and voltage = ${voltage}
      `;

      // 3. Insert the normative_table record
      await tx.$executeRaw`
        insert into normative_tables (
          id, asset_id, document_version_id, document_id,
          table_number, title, page_number, concessionaire, state, voltage,
          category, validation_status,
          applicable_voltage, applicable_supply_type, unit_basis, table_notes,
          source_text, created_at, updated_at
        )
        values (
          ${tableId},
          ${assetId},
          ${documentVersionId},
          ${documentId},
          ${tableNumber},
          ${title},
          ${pageNumber},
          ${concessionaire},
          ${stateStr},
          ${voltage},
          ${category},
          ${"VALIDATED"},
          ${voltage},
          ${null},
          ${method},
          ${[revision ? `Rev. ${revision}` : null, homologationDate ? `Homologada: ${homologationDate}` : null, printedPage ? `Pag. ${printedPage}` : null].filter(Boolean).join(" | ") || null},
          ${sourceText},
          now(),
          now()
        )
      `;

      // 4. Batch insert all rows — within the same transaction guarantees FK integrity
      await tx.$executeRaw`
        insert into normative_table_rows (
          id, table_id, row_index, method, supply_type, load_min_kw, load_max_kw,
          load_min_kva, load_max_kva, voltage, breaker_amp, breaker_a, breaker_type,
          copper_cable_mm2, aluminum_cable_mm2, concentric_cable_mm2,
          copper_concentric_mm2, copper_multiplexed_mm2,
          aluminum_duplex_mm2, aluminum_triplex_mm2, aluminum_quadruplex_mm2,
          galvanized_steel_conduit_inch, customer_phase_neutral_conductor_mm2,
          grounding_conductor_mm2, conduit_diameter, grounding_conduit_diameter,
          grounding_conduit_inch, notes, raw_row_json, raw_text,
          source_page, source_text, page_number, created_at, updated_at
        )
        values ${Prisma.join(rowValues)}
      `;
    });

    return NextResponse.json({
      ok: true,
      tableId,
      message: `Tabela ${tableNumber} importada com ${rows.length} linhas validadas.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao salvar a tabela.";
    const isFk = /23503|foreign key|fkey/i.test(msg);
    return NextResponse.json(
      {
        ok: false,
        message: isFk
          ? "Falha de integridade: a versao do documento nao foi encontrada. Verifique se ela ainda existe e esta processada."
          : msg,
      },
      { status: 500 },
    );
  }
}
