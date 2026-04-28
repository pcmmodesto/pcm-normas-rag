import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureNormativeTableSchema } from "@/features/rag/processing/normative-table-2";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/normative-tables/[id]">,
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ ok: false, message: "Autenticacao obrigatoria." }, { status: 401 });
  }

  if (currentUser.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Apenas administradores podem validar tabelas." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    validationStatus?: unknown;
    validationNotes?: unknown;
  };
  const validationStatus = normalizeValidationStatus(body.validationStatus);
  const validationNotes = typeof body.validationNotes === "string" ? body.validationNotes : null;

  await ensureNormativeTableSchema();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      update normative_tables
      set
        validation_status = ${validationStatus},
        validation_notes = ${validationNotes},
        validated_at = case when ${validationStatus} = 'VALIDATED' then now() else null end,
        updated_at = now()
      where id = ${id}
    `;

    const rows = await tx.$queryRaw<Array<{
      id: string;
      asset_id: string | null;
      document_id: string;
      document_version_id: string;
      table_number: string | null;
      title: string;
      page_number: number;
      concessionaire: string | null;
      state: string | null;
      voltage: string | null;
      category: string | null;
      source_text: string | null;
      table_notes: string | null;
    }>>`
      select
        id, asset_id, document_id, document_version_id, table_number, title,
        page_number, concessionaire, state, voltage, category, source_text, table_notes
      from normative_tables
      where id = ${id}
      limit 1
    `;

    const table = rows[0];
    if (!table) return;

    const assetStatus = validationStatus === "VALIDATED"
      ? "VALIDATED"
      : validationStatus === "REVIEW"
        ? "NEEDS_REVIEW"
        : "PENDING";
    const isActive = validationStatus !== "INACTIVE";

    if (table.asset_id) {
      await tx.$executeRaw`
        update normative_assets
        set
          validation_status = ${assetStatus}::normative_asset_validation_status,
          validated_by_user_id = case when ${assetStatus} = 'VALIDATED' then ${currentUser.id} else null end,
          validated_at = case when ${assetStatus} = 'VALIDATED' then now() else null end,
          is_active = ${isActive},
          updated_at = now()
        where id = ${table.asset_id}
      `;
      return;
    }

    if (validationStatus !== "VALIDATED") return;

    const assetId = randomUUID();
    const structuredRows = await tx.$queryRaw<Array<{
      row_index: number;
      raw_text: string | null;
      raw_row_json: unknown;
      supply_type: string | null;
      load_min_kw: number | null;
      load_max_kw: number | null;
      breaker_amp: number | null;
      breaker_type: string | null;
      voltage: string | null;
    }>>`
      select
        row_index, raw_text, raw_row_json, supply_type, load_min_kw, load_max_kw,
        breaker_amp, breaker_type, voltage
      from normative_table_rows
      where table_id = ${id}
      order by row_index asc
    `;
    const structuredData = {
      assetType: "TABLE",
      category: table.category,
      number: table.table_number,
      voltage: table.voltage,
      promotedFromTableId: table.id,
      rows: structuredRows,
    };

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
        ${table.document_id},
        ${table.document_version_id},
        ${"TABLE"}::normative_asset_type,
        ${table.title},
        ${table.table_number ? `TABELA ${table.table_number}` : "TABELA"},
        ${table.page_number},
        ${null},
        ${table.source_text ?? table.table_notes ?? table.title},
        ${JSON.stringify(structuredData)}::jsonb,
        ${"VALIDATED"}::normative_asset_validation_status,
        ${currentUser.id},
        now(),
        true,
        ${table.concessionaire},
        ${table.state},
        ${table.voltage},
        ${["table", table.category, table.table_number ? `tabela-${table.table_number}` : null].filter(Boolean)},
        now(),
        now()
      )
    `;

    await tx.$executeRaw`
      update normative_tables
      set asset_id = ${assetId}, updated_at = now()
      where id = ${id}
    `;
  });

  return NextResponse.json({ ok: true, validationStatus });
}

function normalizeValidationStatus(value: unknown) {
  if (value === "VALIDATED" || value === "VALIDADA") return "VALIDATED";
  if (value === "INACTIVE") return "INACTIVE";
  if (value === "NEEDS_REVIEW" || value === "REVIEW") return "REVIEW";
  return "PENDING";
}
