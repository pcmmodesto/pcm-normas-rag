import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/document-versions/[id]/archive">,
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ ok: false, message: "Autenticacao obrigatoria." }, { status: 401 });
  }

  if (currentUser.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Apenas administradores podem arquivar versoes normativas." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const reason = typeof body.reason === "string" && body.reason.trim()
    ? body.reason.trim().slice(0, 500)
    : "Versao substituida por revisao normativa mais recente.";

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    document_id: string;
    version_label: string;
    status: string;
    metadata: unknown;
  }>>`
    select id, document_id, version_label, status::text, metadata
    from document_versions
    where id = ${id}
    limit 1
  `;

  const version = rows[0];
  if (!version) {
    return NextResponse.json({ ok: false, message: "Versao nao encontrada." }, { status: 404 });
  }

  if (version.status === "ARCHIVED") {
    return NextResponse.json({
      ok: true,
      message: "Versao ja estava arquivada.",
      version: { status: "ARCHIVED" },
    });
  }

  const metadata = mergeArchiveMetadata(version.metadata, {
    archivedAt: new Date().toISOString(),
    archivedByUserId: currentUser.id,
    archiveReason: reason,
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      update document_versions
      set
        status = 'ARCHIVED'::version_status,
        metadata = ${JSON.stringify(metadata)}::jsonb,
        updated_at = now()
      where id = ${id}
    `;

    await tx.$executeRaw`
      update document_chunks
      set is_searchable = false, updated_at = now()
      where document_version_id = ${id}
    `;

    await tx.$executeRaw`
      update normative_assets
      set is_active = false, updated_at = now()
      where document_version_id = ${id}
    `;

    await tx.$executeRaw`
      update normative_tables
      set validation_status = 'ARQUIVADA', updated_at = now()
      where document_version_id = ${id}
    `;

    await tx.auditLog.create({
      data: {
        userId: currentUser.id,
        action: "DOCUMENT_UPDATED",
        entityType: "DocumentVersion",
        entityId: id,
        metadata: {
          versionLabel: version.version_label,
          previousStatus: version.status,
          newStatus: "ARCHIVED",
          reason,
        },
      },
    });
  });

  return NextResponse.json({
    ok: true,
    message: "Versao arquivada. Chunks e ativos desta revisao foram removidos da busca ativa.",
    version: { status: "ARCHIVED" },
  });
}

function mergeArchiveMetadata(metadata: unknown, archive: Record<string, string>) {
  const base = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};

  return {
    ...base,
    lifecycle: {
      ...(base.lifecycle && typeof base.lifecycle === "object" && !Array.isArray(base.lifecycle)
        ? (base.lifecycle as Record<string, unknown>)
        : {}),
      ...archive,
    },
  };
}
