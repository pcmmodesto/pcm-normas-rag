import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureNormativeTableSchema } from "@/features/rag/processing/normative-table-2";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/normative-table-rows/[id]">,
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ ok: false, message: "Autenticacao obrigatoria." }, { status: 401 });
  }

  if (currentUser.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Apenas administradores podem editar linhas." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  await ensureNormativeTableSchema();

  await prisma.$executeRaw`
    update normative_table_rows
    set
      copper_multiplexed_mm2 = ${parseNullableNumber(body.copperMultiplexedMm2)},
      aluminum_quadruplex_mm2 = ${parseNullableNumber(body.aluminumQuadruplexMm2)},
      galvanized_steel_conduit_inch = ${parseNullableString(body.galvanizedSteelConduitInch)},
      customer_phase_neutral_conductor_mm2 = ${parseNullableNumber(body.customerPhaseNeutralConductorMm2)},
      grounding_conductor_mm2 = ${parseNullableNumber(body.groundingConductorMm2)},
      updated_at = now()
    where id = ${id}
  `;

  return NextResponse.json({ ok: true, message: "Linha normativa atualizada." });
}

function parseNullableNumber(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim().replace(",", ".");
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableString(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text || null;
}
