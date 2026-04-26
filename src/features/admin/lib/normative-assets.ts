import { prisma } from "@/lib/prisma";
import { ensureNormativeTableSchema } from "@/features/rag/processing/normative-table-2";

export type AdminNormativeAsset = {
  id: string;
  documentTitle: string;
  versionLabel: string;
  type: string;
  title: string;
  code: string | null;
  pageNumber: number;
  imageStoragePath: string | null;
  extractedText: string | null;
  structuredDataJson: unknown;
  validationStatus: string;
  isActive: boolean;
  concessionaire: string | null;
  state: string | null;
  voltageLevel: string | null;
  tags: string[];
  validatedAt: Date | null;
};

type AssetSqlRow = {
  id: string;
  document_title: string;
  version_label: string;
  type: string;
  title: string;
  code: string | null;
  page_number: number;
  image_storage_path: string | null;
  extracted_text: string | null;
  structured_data_json: unknown;
  validation_status: string;
  is_active: boolean;
  concessionaire: string | null;
  state: string | null;
  voltage_level: string | null;
  tags: string[] | null;
  validated_at: Date | null;
};

export async function getAdminNormativeAssets(limit = 80): Promise<AdminNormativeAsset[]> {
  await ensureNormativeTableSchema();

  const rows = await prisma.$queryRaw<AssetSqlRow[]>`
    select
      na.id,
      td.title as document_title,
      dv.version_label,
      na.type::text as type,
      na.title,
      na.code,
      na.page_number,
      na.image_storage_path,
      na.extracted_text,
      na.structured_data_json,
      na.validation_status::text as validation_status,
      na.is_active,
      na.concessionaire,
      na.state,
      na.voltage_level,
      na.tags,
      na.validated_at
    from normative_assets na
    join document_versions dv on dv.id = na.document_version_id
    join technical_documents td on td.id = dv.document_id
    order by na.page_number asc, na.created_at desc
    limit ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    documentTitle: row.document_title,
    versionLabel: row.version_label,
    type: row.type,
    title: row.title,
    code: row.code,
    pageNumber: row.page_number,
    imageStoragePath: row.image_storage_path,
    extractedText: row.extracted_text,
    structuredDataJson: row.structured_data_json,
    validationStatus: row.validation_status,
    isActive: row.is_active,
    concessionaire: row.concessionaire,
    state: row.state,
    voltageLevel: row.voltage_level,
    tags: row.tags ?? [],
    validatedAt: row.validated_at,
  }));
}
