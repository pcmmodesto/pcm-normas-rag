import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { chunkDocument } from "./chunk-document";
import { extractPdfText } from "./extract-pdf-text";

type VersionRow = {
  id: string;
  storage_path: string | null;
  metadata: Record<string, unknown>;
};

export async function indexDocumentVersion(documentVersionId: string) {
  const rows = await prisma.$queryRaw<VersionRow[]>`
    select id, storage_path, metadata
    from document_versions
    where id = ${documentVersionId}
    limit 1
  `;

  const version = rows[0];
  if (!version) throw new Error(`Versao ${documentVersionId} nao encontrada.`);
  if (!version.storage_path) throw new Error("Versao nao possui storage_path.");

  const bucket =
    (version.metadata?.storageBucket as string | undefined) ??
    process.env.SUPABASE_DOCUMENTS_BUCKET ??
    "technical-documents";

  const pdfBytes = await downloadFromStorage(bucket, version.storage_path);

  await prisma.$executeRaw`
    update document_versions
    set processing_status = ${"EXTRACTING"}::processing_status, updated_at = now()
    where id = ${documentVersionId}
  `;

  const pages = await extractPdfText(pdfBytes);

  await prisma.$executeRaw`
    update document_versions
    set processing_status = ${"CHUNKING"}::processing_status, updated_at = now()
    where id = ${documentVersionId}
  `;

  const chunks = await chunkDocument(pages);

  await savePages(documentVersionId, pages);
  await saveChunks(documentVersionId, chunks);

  await prisma.$executeRaw`
    update document_versions
    set
      status = ${"READY"}::version_status,
      processing_status = ${"READY"}::processing_status,
      page_count = ${pages.length},
      chunk_count = ${chunks.length},
      processed_at = now(),
      updated_at = now()
    where id = ${documentVersionId}
  `;

  return { pages: pages.length, chunks: chunks.length };
}

async function downloadFromStorage(
  bucket: string,
  storagePath: string,
): Promise<Uint8Array> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias.");
  }

  const url = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${storagePath}`;
  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Nao foi possivel baixar o PDF do Storage (HTTP ${response.status}). Bucket: ${bucket}, path: ${storagePath}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

type PageId = { pageNumber: number; id: string };

async function savePages(
  documentVersionId: string,
  pages: Awaited<ReturnType<typeof extractPdfText>>,
): Promise<PageId[]> {
  const result: PageId[] = [];

  for (const page of pages) {
    const id = randomUUID();
    await prisma.$executeRaw`
      insert into document_pages (id, document_version_id, page_number, text, metadata, created_at, updated_at)
      values (
        ${id},
        ${documentVersionId},
        ${page.pageNumber},
        ${page.text},
        ${{}}::jsonb,
        now(),
        now()
      )
      on conflict (document_version_id, page_number) do update
        set text = excluded.text, updated_at = now()
    `;
    result.push({ pageNumber: page.pageNumber, id });
  }

  return result;
}

async function saveChunks(
  documentVersionId: string,
  chunks: Awaited<ReturnType<typeof chunkDocument>>,
): Promise<void> {
  const pageRows = await prisma.$queryRaw<Array<{ page_number: number; id: string }>>`
    select page_number, id from document_pages
    where document_version_id = ${documentVersionId}
  `;

  const pageIdMap = new Map(pageRows.map((r) => [r.page_number, r.id]));

  for (const chunk of chunks) {
    const pageId = pageIdMap.get(chunk.pageNumber);
    if (!pageId) continue;

    const metadata: Record<string, unknown> = {};
    if (chunk.sectionTitle) metadata.sectionTitle = chunk.sectionTitle;
    if (chunk.itemReference) metadata.itemReference = chunk.itemReference;
    if (chunk.tableReference) metadata.tableReference = chunk.tableReference;

    await prisma.$executeRaw`
      insert into document_chunks (
        id, document_version_id, document_page_id, page_number,
        chunk_index, text, metadata, created_at, updated_at
      )
      values (
        ${randomUUID()},
        ${documentVersionId},
        ${pageId},
        ${chunk.pageNumber},
        ${chunk.chunkIndex},
        ${chunk.text},
        ${JSON.stringify(metadata)}::jsonb,
        now(),
        now()
      )
      on conflict (document_version_id, chunk_index) do update
        set text = excluded.text, metadata = excluded.metadata, updated_at = now()
    `;
  }
}
