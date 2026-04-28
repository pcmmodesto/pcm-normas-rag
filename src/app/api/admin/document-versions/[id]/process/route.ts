import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { indexDocumentVersion } from "@/features/rag/processing/index-document-version";

export const runtime = "nodejs";
export const maxDuration = 300;

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
    const versions = await prisma.$queryRaw<Array<{ status: string }>>`
      select status::text
      from document_versions
      where id = ${id}
      limit 1
    `;

    if (versions[0]?.status === "ARCHIVED") {
      return NextResponse.json(
        { ok: false, message: "Versoes arquivadas nao podem ser reprocessadas. Cadastre uma nova versao da norma." },
        { status: 409 },
      );
    }

    await prisma.$executeRaw`
      update document_versions
      set
        status = ${"PROCESSING"}::version_status,
        processing_status = ${"EXTRACTING"}::processing_status,
        processing_error = null,
        updated_at = now()
      where id = ${id}
    `;

    const result = await indexDocumentVersion(id);

    return NextResponse.json({
      ok: true,
      message: "Documento processado com chunks estruturados.",
      pages: result.pages,
      chunks: result.chunks,
    });
  } catch (error) {
    await markVersionAsFailed(id, error);

    return NextResponse.json(
      {
        ok: false,
        message: formatProcessingError(error),
      },
      { status: 500 },
    );
  }
}

function formatProcessingError(error: unknown) {
  const message = error instanceof Error ? error.message : "Nao foi possivel processar o documento.";

  if (/MaxClientsInSessionMode|max clients|pool_size/i.test(message)) {
    return [
      "Limite de conexoes do banco atingido durante o processamento.",
      "O pipeline foi ajustado para executar as etapas de schema/index de forma sequencial.",
      "Aguarde alguns segundos e reprocesse o documento.",
      `Detalhe tecnico: ${message}`,
    ].join(" ");
  }

  return message;
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
