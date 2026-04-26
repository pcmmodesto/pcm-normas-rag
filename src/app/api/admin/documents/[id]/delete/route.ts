import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

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
      Array<{ storage_path: string | null; metadata: unknown }>
    >`
      select storage_path, metadata
      from document_versions
      where document_id = ${id}
    `;

    // Delete from DB in dependency order
    await prisma.$executeRaw`
      delete from document_chunks
      where document_version_id in (
        select id from document_versions where document_id = ${id}
      )
    `;

    await prisma.$executeRaw`
      delete from document_pages
      where document_version_id in (
        select id from document_versions where document_id = ${id}
      )
    `;

    await prisma.$executeRaw`
      delete from document_versions where document_id = ${id}
    `;

    await prisma.$executeRaw`
      delete from technical_documents where id = ${id}
    `;

    // Best-effort: delete from Supabase Storage
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceRoleKey && supabaseUrl) {
      for (const version of versions) {
        if (!version.storage_path) continue;
        const meta = version.metadata as Record<string, unknown> | null;
        const bucket = (meta?.storageBucket as string | undefined) ?? "documents";

        await fetch(
          `${supabaseUrl}/storage/v1/object/${bucket}/${version.storage_path}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${serviceRoleKey}` },
          },
        ).catch(() => undefined);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
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
