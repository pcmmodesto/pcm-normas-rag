import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { indexDocumentVersion } from "@/features/rag/processing/index-document-version";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/admin/document-versions/[id]/process">,
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      { ok: false, message: "Autenticacao obrigatoria." },
      { status: 401 },
    );
  }

  if (currentUser.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, message: "Apenas administradores podem processar documentos." },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  try {
    await prisma.$executeRaw`
      update document_versions
      set
        status = ${"PROCESSING"}::version_status,
        processing_status = ${"EXTRACTING"}::processing_status,
        processing_error = null,
        updated_at = now()
      where id = ${id}
    `;

    await indexDocumentVersion(id);

    return NextResponse.json({
      ok: true,
      message: "Documento enviado para processamento.",
    });
  } catch (error) {
    await markVersionAsFailed(id, error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel processar o documento.",
      },
      { status: 501 },
    );
  }
}

async function markVersionAsFailed(id: string, error: unknown) {
  await prisma.$executeRaw`
    update document_versions
    set
      status = ${"FAILED"}::version_status,
      processing_status = ${"FAILED"}::processing_status,
      processing_error = ${
        error instanceof Error
          ? error.message
          : "Processamento interrompido por erro desconhecido."
      },
      updated_at = now()
    where id = ${id}
  `.catch(() => undefined);
}
