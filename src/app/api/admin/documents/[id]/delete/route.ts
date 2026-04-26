import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/admin/documents/[id]/delete">,
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ ok: false, message: "Autenticacao obrigatoria." }, { status: 401 });
  }

  if (currentUser.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, message: "Apenas administradores podem excluir documentos." },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  try {
    // Get storage paths before deletion
    const versions = await prisma.$queryRaw<
      Array<{ id: string; storage_path: string | null; metadata: unknown }>
    >`
      select id, storage_path, metadata
      from document_versions
      where document_id = ${id}
    `;

    // Production may be one migration behind. Each optional cleanup is isolated
    // so a missing future RAG table/column does not block deleting the document.
    await safeDeleteStep("technical_table_rows", () => prisma.$executeRaw`
      delete from technical_table_rows
      where technical_table_id in (
        select id from technical_tables
        where document_version_id in (
          select id from document_versions where document_id = ${id}
        )
      )
    `);

    await safeDeleteStep("technical_tables", () => prisma.$executeRaw`
      delete from technical_tables
      where document_version_id in (
        select id from document_versions where document_id = ${id}
      )
    `);

    await safeDeleteStep("technical_abacuses", () => prisma.$executeRaw`
      delete from technical_abacuses
      where document_version_id in (
        select id from document_versions where document_id = ${id}
      )
    `);

    await safeDeleteStep("rag_answer_sources", () => prisma.$executeRaw`
      update rag_answer_sources
      set document_chunk_id = null
      where document_chunk_id in (
        select id from document_chunks
        where document_version_id in (
          select id from document_versions where document_id = ${id}
        )
      )
    `);

    await safeDeleteStep("rag_questions", () => prisma.$executeRaw`
      update rag_questions
      set technical_document_id = null
      where technical_document_id = ${id}
    `);

    await safeDeleteStep("document_chunks", () => prisma.$executeRaw`
      delete from document_chunks
      where document_version_id in (
        select id from document_versions where document_id = ${id}
      )
    `);

    await safeDeleteStep("document_pages", () => prisma.$executeRaw`
      delete from document_pages
      where document_version_id in (
        select id from document_versions where document_id = ${id}
      )
    `);

    await prisma.$executeRaw`
      delete from document_versions where document_id = ${id}
    `;

    await prisma.$executeRaw`
      delete from technical_documents where id = ${id}
    `;

    await removeStorageObjectsBestEffort(versions);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/documents/delete]", {
      documentId: id,
      message: error instanceof Error ? error.message : "Unknown error",
      errorName: error instanceof Error ? error.name : typeof error,
    });

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Nao foi possivel excluir o documento.",
      },
      { status: 500 },
    );
  }
}

async function safeDeleteStep(
  stage: string,
  operation: () => Promise<unknown>,
) {
  try {
    await operation();
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined;

    if (code === "42P01" || code === "42703" || code === "P2010") {
      console.warn("[admin/documents/delete]", {
        stage,
        message: "Optional cleanup skipped because schema is partially migrated.",
        code,
      });
      return;
    }

    throw error;
  }
}

async function removeStorageObjectsBestEffort(
  versions: Array<{ storage_path: string | null; metadata: unknown }>,
) {
  try {
    const supabase = createSupabaseServiceRoleClient();

    for (const version of versions) {
      if (!version.storage_path) continue;

      const meta = version.metadata as Record<string, unknown> | null;
      const bucket =
        (meta?.storageBucket as string | undefined) ??
        process.env.SUPABASE_DOCUMENTS_BUCKET ??
        "technical-documents";

      const { error } = await supabase.storage
        .from(bucket)
        .remove([version.storage_path]);

      if (error) {
        console.error("[admin/documents/delete]", {
          stage: "storage_cleanup",
          bucket,
          message: error.message,
        });
      }
    }
  } catch (error) {
    console.error("[admin/documents/delete]", {
      stage: "storage_cleanup",
      message: error instanceof Error ? error.message : "Unknown error",
      errorName: error instanceof Error ? error.name : typeof error,
    });
  }
}
