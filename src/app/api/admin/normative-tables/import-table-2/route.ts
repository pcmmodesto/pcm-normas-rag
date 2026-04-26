import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { importKnownTable2ForLatestVersion } from "@/features/rag/processing/normative-table-2";

export const runtime = "nodejs";

export async function POST() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ ok: false, message: "Autenticacao obrigatoria." }, { status: 401 });
  }

  if (currentUser.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Apenas administradores podem importar tabelas." }, { status: 403 });
  }

  try {
    const result = await importKnownTable2ForLatestVersion();
    return NextResponse.json({
      ok: true,
      message: `Tabela 2 importada com ${result.rows} linhas estruturadas.`,
      rows: result.rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Nao foi possivel importar a Tabela 2.",
      },
      { status: 500 },
    );
  }
}
