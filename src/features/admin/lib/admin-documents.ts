import { prisma } from "@/lib/prisma";

export type AdminDocumentRow = {
  id: string;
  title: string;
  concessionaire: string | null;
  stateCodes: string[];
  documentType: string;
  status: string;
  createdAt: Date;
  versionId: string | null;
  versionLabel: string | null;
  versionCreatedAt: Date | null;
  pageCount: number;
  chunkCount: number;
  processingStatus: string | null;
};

type AdminDocumentSqlRow = {
  id: string;
  title: string;
  concessionaire: string | null;
  state_codes: string[] | null;
  document_type: string | null;
  status: string | null;
  created_at: Date;
  version_id: string | null;
  version_label: string | null;
  version_created_at: Date | null;
  page_count: number | null;
  chunk_count: number | null;
  processing_status: string | null;
};

export async function getAdminDocuments(limit = 50): Promise<AdminDocumentRow[]> {
  const rows = await prisma.$queryRaw<AdminDocumentSqlRow[]>`
    select
      d.id,
      d.title,
      d.concessionaire,
      d.state_codes,
      d.document_type,
      d.status,
      d.created_at,
      v.id as version_id,
      v.version_label,
      v.created_at as version_created_at,
      v.page_count,
      v.chunk_count,
      v.processing_status
    from technical_documents d
    left join lateral (
      select
        id,
        version_label,
        created_at,
        page_count,
        chunk_count,
        processing_status
      from document_versions
      where document_id = d.id
      order by created_at desc
      limit 1
    ) v on true
    order by d.created_at desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    concessionaire: row.concessionaire,
    stateCodes: row.state_codes ?? [],
    documentType: row.document_type ?? "-",
    status: row.status ?? "-",
    createdAt: row.created_at,
    versionId: row.version_id,
    versionLabel: row.version_label,
    versionCreatedAt: row.version_created_at,
    pageCount: row.page_count ?? 0,
    chunkCount: row.chunk_count ?? 0,
    processingStatus: row.processing_status,
  }));
}

export type AdminDocumentVersionRow = {
  id: string;
  documentId: string;
  documentTitle: string;
  versionLabel: string;
  status: string;
  processingStatus: string;
  pageCount: number;
  chunkCount: number;
  processingError: string | null;
  createdAt: Date;
};

type AdminDocumentVersionSqlRow = {
  id: string;
  document_id: string;
  document_title: string;
  version_label: string;
  status: string;
  processing_status: string;
  page_count: number | null;
  chunk_count: number | null;
  processing_error: string | null;
  created_at: Date;
};

export async function getAdminDocumentVersions(limit = 50) {
  const rows = await prisma.$queryRaw<AdminDocumentVersionSqlRow[]>`
    select
      v.id,
      v.document_id,
      d.title as document_title,
      v.version_label,
      v.status,
      v.processing_status,
      v.page_count,
      v.chunk_count,
      v.processing_error,
      v.created_at
    from document_versions v
    join technical_documents d on d.id = v.document_id
    order by v.created_at desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    documentTitle: row.document_title,
    versionLabel: row.version_label,
    status: row.status,
    processingStatus: row.processing_status,
    pageCount: row.page_count ?? 0,
    chunkCount: row.chunk_count ?? 0,
    processingError: row.processing_error,
    createdAt: row.created_at,
  }));
}
