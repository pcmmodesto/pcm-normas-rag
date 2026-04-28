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

  await prisma.$executeRaw`
    update normative_tables
    set
      validation_status = ${validationStatus},
      validation_notes = ${validationNotes},
      validated_at = case when ${validationStatus} = 'VALIDATED' then now() else null end,
      updated_at = now()
    where id = ${id}
  `;

  return NextResponse.json({ ok: true, validationStatus });
}

function normalizeValidationStatus(value: unknown) {
  if (value === "VALIDATED" || value === "VALIDADA") return "VALIDATED";
  if (value === "INACTIVE") return "INACTIVE";
  if (value === "NEEDS_REVIEW" || value === "REVIEW") return "REVIEW";
  return "PENDING";
}
