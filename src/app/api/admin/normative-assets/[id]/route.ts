import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureNormativeTableSchema } from "@/features/rag/processing/normative-table-2";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/normative-assets/[id]">,
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ ok: false, message: "Autenticacao obrigatoria." }, { status: 401 });
  }

  if (currentUser.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Apenas administradores podem editar ativos normativos." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const validationStatus = parseValidationStatus(body.validationStatus);
  const isActive = typeof body.isActive === "boolean" ? body.isActive : null;
  const structuredDataJson =
    body.structuredDataJson && typeof body.structuredDataJson === "object"
      ? body.structuredDataJson
      : null;

  await ensureNormativeTableSchema();

  await prisma.$executeRaw`
    update normative_assets
    set
      validation_status = coalesce(${validationStatus}::normative_asset_validation_status, validation_status),
      validated_by_user_id = case
        when ${validationStatus} = 'VALIDATED' then ${currentUser.id}
        else validated_by_user_id
      end,
      validated_at = case
        when ${validationStatus} = 'VALIDATED' then now()
        when ${validationStatus} is not null and ${validationStatus} <> 'VALIDATED' then null
        else validated_at
      end,
      is_active = coalesce(${isActive}, is_active),
      structured_data_json = coalesce(${structuredDataJson ? JSON.stringify(structuredDataJson) : null}::jsonb, structured_data_json),
      updated_at = now()
    where id = ${id}
  `;

  const rows = await prisma.$queryRaw<Array<{
    validation_status: string;
    is_active: boolean;
    structured_data_json: unknown;
    validated_at: Date | null;
  }>>`
    select validation_status::text, is_active, structured_data_json, validated_at
    from normative_assets
    where id = ${id}
    limit 1
  `;

  const asset = rows[0];
  return NextResponse.json({
    ok: true,
    asset: asset
      ? {
          validationStatus: asset.validation_status,
          isActive: asset.is_active,
          structuredDataJson: asset.structured_data_json,
          validatedAt: asset.validated_at,
        }
      : {},
  });
}

function parseValidationStatus(value: unknown) {
  if (value === "PENDING" || value === "VALIDATED" || value === "REJECTED" || value === "NEEDS_REVIEW") {
    return value;
  }
  return null;
}
