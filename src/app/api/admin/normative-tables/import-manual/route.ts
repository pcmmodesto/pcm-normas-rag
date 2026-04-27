import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureNormativeTableSchema } from "@/features/rag/processing/normative-table-2";

export const runtime = "nodejs";
export const maxDuration = 120;

type RowPayload = {
  rowIndex: number;
  supplyType?: string | null;
  loadMinKw?: number | null;
  loadMaxKw?: number | null;
  breakerAmp?: number | null;
  breakerType?: string | null;
  copperConcentricMm2?: number | null;
  copperMultiplexedMm2?: number | null;
  aluminumDuplexMm2?: number | null;
  aluminumTriplexMm2?: number | null;
  aluminumQuadruplexMm2?: number | null;
  galvanizedSteelConduitInch?: string | null;
  customerPhaseNeutralConductorMm2?: number | null;
  groundingConductorMm2?: number | null;
  groundingConduitInch?: string | null;
  notes?: string | null;
  voltage?: string | null;
  method?: string | null;
};

type ManualImportBody = {
  documentVersionId: string;
  documentId: string;
  concessionaire: string | null;
  stateCodes: string[];
  assetType: "TABLE" | "DRAWING" | "FIGURE" | "NOTE" | "LEGEND" | "REQUIREMENT";
  validationStatus: "PENDING" | "VALIDATED" | "NEEDS_REVIEW";
  code: string | null;
  number: string | null;
  title: string;
  voltage: string | null;
  category: string;
  pdfPageNumber: number | null;
  printedPage: string | null;
  revision: string | null;
  homologationDate: string | null;
  method: string;
  relatedTable: string | null;
  tags: string[];
  description: string | null;
  genericRowsText: string | null;
  notesText: string | null;
  rows: RowPayload[];
  files: Array<{ field: string; file: File }>;
};

const VALID_ASSET_TYPES = new Set(["TABLE", "DRAWING", "FIGURE", "NOTE", "LEGEND", "REQUIREMENT"]);
const VALID_STATUSES = new Set(["PENDING", "VALIDATED", "NEEDS_REVIEW"]);
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ ok: false, message: "Autenticacao obrigatoria." }, { status: 401 });
  }
  if (currentUser.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Apenas administradores podem importar ativos normativos." }, { status: 403 });
  }

  let body: ManualImportBody;
  try {
    body = await readBody(request);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Payload invalido." },
      { status: 400 },
    );
  }

  if (!body.documentVersionId || !body.documentId) {
    return NextResponse.json({ ok: false, message: "documentVersionId e documentId sao obrigatorios." }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ ok: false, message: "Titulo do ativo e obrigatorio." }, { status: 400 });
  }
  if (!VALID_ASSET_TYPES.has(body.assetType)) {
    return NextResponse.json({ ok: false, message: "Tipo de ativo invalido." }, { status: 400 });
  }
  if (!VALID_STATUSES.has(body.validationStatus)) {
    return NextResponse.json({ ok: false, message: "Status de validacao invalido." }, { status: 400 });
  }

  const isDimensioningTable = body.assetType === "TABLE" && body.category === "SERVICE_ENTRANCE_SIZING";
  if (isDimensioningTable) {
    if (!body.number?.trim()) {
      return NextResponse.json({ ok: false, message: "Numero da tabela e obrigatorio para dimensionamento." }, { status: 400 });
    }
    if (!body.rows.length) {
      return NextResponse.json({ ok: false, message: "Informe ao menos uma linha de dimensionamento." }, { status: 400 });
    }
    if (body.rows.some((row) => row.loadMaxKw == null || row.breakerAmp == null)) {
      return NextResponse.json({ ok: false, message: "Linhas de dimensionamento precisam de carga maxima e disjuntor." }, { status: 400 });
    }
  }

  try {
    await ensureNormativeTableSchema();
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: `Falha ao preparar schema: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }

  const assetId = randomUUID();
  const tableId = body.assetType === "TABLE" || body.assetType === "LEGEND" ? randomUUID() : null;
  const figureId = body.assetType === "DRAWING" || body.assetType === "FIGURE" ? randomUUID() : null;
  const pageNumber = body.pdfPageNumber ?? 1;
  const stateStr = body.stateCodes.join(",");
  const code = body.code?.trim() || defaultCode(body.assetType, body.number);
  const sourceText = buildSourceText(body, code);
  const evidencePaths: string[] = [];

  try {
    for (let i = 0; i < body.files.length; i += 1) {
      evidencePaths.push(await uploadEvidence(body.files[i].file, body.documentVersionId, assetId, i + 1));
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Falha ao salvar imagem/PDF de referencia." },
      { status: 502 },
    );
  }

  const structuredData = {
    assetType: body.assetType,
    category: body.category,
    code,
    number: body.number,
    voltage: body.voltage,
    method: body.method,
    printedPage: body.printedPage,
    revision: body.revision,
    homologationDate: body.homologationDate,
    relatedTable: body.relatedTable,
    description: body.description,
    genericRows: parseGenericRows(body.genericRowsText),
    notes: splitLines(body.notesText),
    dimensioningRows: isDimensioningTable ? body.rows : [],
    evidencePaths,
  };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        insert into normative_assets (
          id, document_id, document_version_id, type, title, code, page_number,
          image_storage_path, extracted_text, structured_data_json,
          validation_status, validated_by_user_id, validated_at,
          is_active, concessionaire, state, voltage_level, tags,
          created_at, updated_at
        )
        values (
          ${assetId},
          ${body.documentId},
          ${body.documentVersionId},
          ${body.assetType}::normative_asset_type,
          ${body.title.trim()},
          ${code},
          ${pageNumber},
          ${evidencePaths[0] ?? null},
          ${sourceText},
          ${JSON.stringify(structuredData)}::jsonb,
          ${body.validationStatus}::normative_asset_validation_status,
          ${body.validationStatus === "VALIDATED" ? currentUser.id : null},
          ${body.validationStatus === "VALIDATED" ? new Date() : null},
          true,
          ${body.concessionaire},
          ${stateStr},
          ${body.voltage || null},
          ${body.tags},
          now(),
          now()
        )
      `;

      if (tableId) {
        await tx.$executeRaw`
          insert into normative_tables (
            id, asset_id, document_version_id, document_id,
            table_number, title, page_number, concessionaire, state, voltage,
            category, validation_status, validated_at,
            applicable_voltage, applicable_supply_type, unit_basis, table_notes,
            source_text, created_at, updated_at
          )
          values (
            ${tableId},
            ${assetId},
            ${body.documentVersionId},
            ${body.documentId},
            ${body.number},
            ${body.title.trim()},
            ${pageNumber},
            ${body.concessionaire},
            ${stateStr},
            ${body.voltage || null},
            ${body.category},
            ${body.validationStatus === "VALIDATED" ? "VALIDATED" : "NAO_VALIDADA"},
            ${body.validationStatus === "VALIDATED" ? new Date() : null},
            ${body.voltage || null},
            ${isDimensioningTable ? "DIMENSIONAMENTO" : null},
            ${body.method},
            ${body.notesText},
            ${sourceText},
            now(),
            now()
          )
        `;

        if (isDimensioningTable) {
          await insertDimensioningRows(tx, tableId, body.rows, pageNumber, sourceText);
        } else {
          await insertGenericTableRows(tx, tableId, parseGenericRows(body.genericRowsText), pageNumber, sourceText);
        }
      }

      if (figureId) {
        await tx.$executeRaw`
          insert into normative_figures (
            id, asset_id, document_version_id, document_id,
            figure_number, title, page_number, image_storage_path, description,
            figure_type, topic, voltage, service_type, related_table_number,
            source_text, metadata, created_at, updated_at
          )
          values (
            ${figureId},
            ${assetId},
            ${body.documentVersionId},
            ${body.documentId},
            ${body.number},
            ${body.title.trim()},
            ${pageNumber},
            ${evidencePaths[0] ?? null},
            ${body.description},
            ${body.assetType},
            ${body.category},
            ${body.voltage || null},
            ${body.method},
            ${body.relatedTable},
            ${sourceText},
            ${JSON.stringify({ evidencePaths, genericRows: parseGenericRows(body.genericRowsText) })}::jsonb,
            now(),
            now()
          )
        `;
        await insertFigureItems(tx, figureId, parseGenericRows(body.genericRowsText));
      }

      if (body.notesText?.trim()) {
        await insertNotes(tx, body, tableId, figureId, pageNumber);
      }
    });

    return NextResponse.json({
      ok: true,
      assetId,
      tableId,
      figureId,
      message: `${labelForType(body.assetType)} salvo com status ${body.validationStatus}.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro ao salvar o ativo normativo.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

async function readBody(request: Request): Promise<ManualImportBody> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const rowsText = getFormString(form, "rows") || "[]";
    let rows: RowPayload[] = [];
    try {
      rows = JSON.parse(rowsText) as RowPayload[];
    } catch {
      throw new Error("Linhas estruturadas invalidas.");
    }

    return {
      documentVersionId: requiredFormString(form, "documentVersionId"),
      documentId: requiredFormString(form, "documentId"),
      concessionaire: getFormString(form, "concessionaire"),
      stateCodes: splitCsv(getFormString(form, "stateCodes")),
      assetType: normalizeAssetType(getFormString(form, "assetType")),
      validationStatus: normalizeStatus(getFormString(form, "validationStatus")),
      code: getFormString(form, "code"),
      number: getFormString(form, "number"),
      title: requiredFormString(form, "title"),
      voltage: getFormString(form, "voltage"),
      category: getFormString(form, "category") || "GENERAL_REQUIREMENT",
      pdfPageNumber: parseNullableInt(getFormString(form, "pdfPageNumber")),
      printedPage: getFormString(form, "printedPage"),
      revision: getFormString(form, "revision"),
      homologationDate: getFormString(form, "homologationDate"),
      method: getFormString(form, "method") || "CONSULTA",
      relatedTable: getFormString(form, "relatedTable"),
      tags: splitTags(getFormString(form, "tags")),
      description: getFormString(form, "description"),
      genericRowsText: getFormString(form, "genericRowsText"),
      notesText: getFormString(form, "notesText"),
      rows,
      files: ["evidence1", "evidence2"]
        .map((field) => ({ field, file: form.get(field) }))
        .filter((item): item is { field: string; file: File } => item.file instanceof File && item.file.size > 0),
    };
  }

  const json = (await request.json()) as Partial<ManualImportBody> & {
    tableNumber?: string;
  };
  return {
    documentVersionId: String(json.documentVersionId ?? ""),
    documentId: String(json.documentId ?? ""),
    concessionaire: json.concessionaire ?? null,
    stateCodes: Array.isArray(json.stateCodes) ? json.stateCodes : [],
    assetType: normalizeAssetType(json.assetType ?? "TABLE"),
    validationStatus: normalizeStatus(json.validationStatus ?? "VALIDATED"),
    code: json.code ?? null,
    number: json.number ?? json.tableNumber ?? null,
    title: String(json.title ?? ""),
    voltage: json.voltage ?? null,
    category: json.category ?? "SERVICE_ENTRANCE_SIZING",
    pdfPageNumber: json.pdfPageNumber ?? null,
    printedPage: json.printedPage ?? null,
    revision: json.revision ?? null,
    homologationDate: json.homologationDate ?? null,
    method: json.method ?? "CARGA_INSTALADA",
    relatedTable: json.relatedTable ?? null,
    tags: json.tags ?? [],
    description: json.description ?? null,
    genericRowsText: json.genericRowsText ?? null,
    notesText: json.notesText ?? null,
    rows: Array.isArray(json.rows) ? json.rows : [],
    files: [],
  };
}

async function insertDimensioningRows(tx: Prisma.TransactionClient, tableId: string, rows: RowPayload[], pageNumber: number, sourceText: string) {
  const rowValues = rows.map((r) =>
    Prisma.sql`(
      ${randomUUID()},
      ${tableId},
      ${r.rowIndex},
      ${r.method ?? "CARGA_INSTALADA"},
      ${r.supplyType ?? null},
      ${r.loadMinKw ?? null},
      ${r.loadMaxKw ?? null},
      ${null}::double precision,
      ${null}::double precision,
      ${r.voltage ?? null},
      ${r.breakerAmp ?? null},
      ${r.breakerAmp ?? null},
      ${r.breakerType ?? null},
      ${r.copperMultiplexedMm2 ?? null},
      ${(r.aluminumQuadruplexMm2 ?? r.aluminumTriplexMm2 ?? r.aluminumDuplexMm2) ?? null},
      ${r.copperConcentricMm2 ?? null},
      ${r.copperConcentricMm2 ?? null},
      ${r.copperMultiplexedMm2 ?? null},
      ${r.aluminumDuplexMm2 ?? null},
      ${r.aluminumTriplexMm2 ?? null},
      ${r.aluminumQuadruplexMm2 ?? null},
      ${r.galvanizedSteelConduitInch ?? null},
      ${r.customerPhaseNeutralConductorMm2 ?? null},
      ${r.groundingConductorMm2 ?? null},
      ${r.galvanizedSteelConduitInch ?? null},
      ${r.groundingConduitInch ?? null},
      ${r.groundingConduitInch ?? null},
      ${r.notes ?? null},
      ${JSON.stringify(r)}::jsonb,
      ${null},
      ${pageNumber},
      ${sourceText},
      ${pageNumber},
      now(),
      now()
    )`,
  );

  if (!rowValues.length) return;
  await tx.$executeRaw`
    insert into normative_table_rows (
      id, table_id, row_index, method, supply_type, load_min_kw, load_max_kw,
      load_min_kva, load_max_kva, voltage, breaker_amp, breaker_a, breaker_type,
      copper_cable_mm2, aluminum_cable_mm2, concentric_cable_mm2,
      copper_concentric_mm2, copper_multiplexed_mm2,
      aluminum_duplex_mm2, aluminum_triplex_mm2, aluminum_quadruplex_mm2,
      galvanized_steel_conduit_inch, customer_phase_neutral_conductor_mm2,
      grounding_conductor_mm2, conduit_diameter, grounding_conduit_diameter,
      grounding_conduit_inch, notes, raw_row_json, raw_text,
      source_page, source_text, page_number, created_at, updated_at
    )
    values ${Prisma.join(rowValues)}
  `;
}

async function insertGenericTableRows(tx: Prisma.TransactionClient, tableId: string, rows: string[][], pageNumber: number, sourceText: string) {
  if (!rows.length) return;
  const values = rows.map((row, index) =>
    Prisma.sql`(
      ${randomUUID()},
      ${tableId},
      ${index + 1},
      ${"CONSULTA"},
      ${null},
      ${null}::double precision,
      ${null}::double precision,
      ${null}::double precision,
      ${null}::double precision,
      ${null},
      ${null}::integer,
      ${null}::integer,
      ${null},
      ${null}::double precision,
      ${null}::double precision,
      ${null}::double precision,
      ${null}::double precision,
      ${null}::double precision,
      ${null}::double precision,
      ${null}::double precision,
      ${null}::double precision,
      ${null},
      ${null}::double precision,
      ${null}::double precision,
      ${null},
      ${null},
      ${null},
      ${null},
      ${JSON.stringify({ cells: row })}::jsonb,
      ${row.join(" | ")},
      ${pageNumber},
      ${sourceText},
      ${pageNumber},
      now(),
      now()
    )`,
  );

  await tx.$executeRaw`
    insert into normative_table_rows (
      id, table_id, row_index, method, supply_type, load_min_kw, load_max_kw,
      load_min_kva, load_max_kva, voltage, breaker_amp, breaker_a, breaker_type,
      copper_cable_mm2, aluminum_cable_mm2, concentric_cable_mm2,
      copper_concentric_mm2, copper_multiplexed_mm2,
      aluminum_duplex_mm2, aluminum_triplex_mm2, aluminum_quadruplex_mm2,
      galvanized_steel_conduit_inch, customer_phase_neutral_conductor_mm2,
      grounding_conductor_mm2, conduit_diameter, grounding_conduit_diameter,
      grounding_conduit_inch, notes, raw_row_json, raw_text,
      source_page, source_text, page_number, created_at, updated_at
    )
    values ${Prisma.join(values)}
  `;
}

async function insertFigureItems(tx: Prisma.TransactionClient, figureId: string, rows: string[][]) {
  const candidates = rows.filter((row) => row.length >= 2);
  if (!candidates.length) return;

  const values = candidates.map((row, index) => {
    const item = row[0] || String(index + 1);
    const description = row[1] || row.join(" | ");
    const quantity = row[2] || null;
    const responsibility = normalizeResponsibility(row[3]);
    const hasAsterisk = /\*/.test(item) || /\*/.test(description);
    return Prisma.sql`(
      ${randomUUID()},
      ${figureId},
      ${item.replace("*", "")},
      ${item.replace("*", "")},
      ${description.replace("*", "")},
      ${quantity},
      ${hasAsterisk},
      ${responsibility},
      ${null},
      ${row[4] || null},
      ${row.join(" | ")},
      ${JSON.stringify({ cells: row })}::jsonb,
      now(),
      now()
    )`;
  });

  await tx.$executeRaw`
    insert into normative_figure_items (
      id, figure_id, item_code, item_number, description, quantity,
      has_asterisk, responsibility, related_table, notes, raw_text,
      metadata, created_at, updated_at
    )
    values ${Prisma.join(values)}
  `;
}

async function insertNotes(tx: Prisma.TransactionClient, body: ManualImportBody, tableId: string | null, figureId: string | null, pageNumber: number) {
  const notes = splitLines(body.notesText);
  if (!notes.length) return;
  const values = notes.map((text) => {
    const match = text.match(/nota\s*(\d+)/i);
    return Prisma.sql`(
      ${randomUUID()},
      ${body.documentVersionId},
      ${body.documentId},
      ${tableId},
      ${figureId},
      ${match?.[1] ?? null},
      ${body.assetType === "NOTE" ? "NOTE" : "MANUAL_NOTE"},
      ${match?.[0] ?? null},
      ${text},
      ${null},
      ${null}::double precision,
      ${null}::double precision,
      ${null},
      ${null}::double precision,
      ${null}::double precision,
      ${pageNumber},
      ${JSON.stringify({ category: body.category, code: body.code, number: body.number })}::jsonb,
      now(),
      now()
    )`;
  });

  await tx.$executeRaw`
    insert into normative_notes (
      id, document_version_id, document_id, table_id, figure_id,
      note_number, note_type, title, text, measurement_name, value,
      tolerance, unit, min_value, max_value, page_number, metadata,
      created_at, updated_at
    )
    values ${Prisma.join(values)}
  `;
}

async function uploadEvidence(file: File, documentVersionId: string, assetId: string, slot: number) {
  if (file.size > MAX_EVIDENCE_BYTES) {
    throw new Error(`Arquivo ${file.name} excede 10 MB. Use um recorte de imagem menor.`);
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET ?? "technical-documents";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Storage nao configurado para salvar evidencias normativas.");
  }

  const ext = sanitizeExt(file.name, file.type);
  const path = `normative-assets/${documentVersionId}/${assetId}-${slot}.${ext}`;
  const bytes = await file.arrayBuffer();
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "cache-control": "3600",
      "content-type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Falha ao enviar evidencia para o Storage (${response.status}). ${text.slice(0, 160)}`);
  }
  return `${bucket}/${path}`;
}

function getFormString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredFormString(form: FormData, key: string) {
  const value = getFormString(form, key);
  if (!value) throw new Error(`Campo obrigatorio ausente: ${key}.`);
  return value;
}

function normalizeAssetType(value: unknown): ManualImportBody["assetType"] {
  const next = String(value ?? "TABLE").toUpperCase();
  return VALID_ASSET_TYPES.has(next) ? (next as ManualImportBody["assetType"]) : "TABLE";
}

function normalizeStatus(value: unknown): ManualImportBody["validationStatus"] {
  const next = String(value ?? "NEEDS_REVIEW").toUpperCase();
  return VALID_STATUSES.has(next) ? (next as ManualImportBody["validationStatus"]) : "NEEDS_REVIEW";
}

function parseNullableInt(value: string | null) {
  if (!value) return null;
  const next = Number.parseInt(value, 10);
  return Number.isFinite(next) ? next : null;
}

function splitCsv(value: string | null) {
  return (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function splitTags(value: string | null) {
  return splitCsv(value).map((item) => item.toLowerCase());
}

function splitLines(value: string | null) {
  return (value ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function parseGenericRows(value: string | null) {
  return splitLines(value).map((line) =>
    line.split(/\t|;|\|/).map((cell) => cell.trim()).filter(Boolean),
  );
}

function defaultCode(assetType: string, number: string | null) {
  if (!number) return assetType;
  if (assetType === "TABLE") return `TABELA ${number}`;
  if (assetType === "DRAWING") return `DESENHO ${number}`;
  if (assetType === "NOTE") return `NOTA ${number}`;
  return `${assetType} ${number}`;
}

function buildSourceText(body: ManualImportBody, code: string) {
  return [
    `Importacao manual - ${code}: ${body.title}`,
    body.revision ? `Revisao: ${body.revision}` : null,
    body.homologationDate ? `Homologada em: ${body.homologationDate}` : null,
    body.printedPage ? `Pagina impressa: ${body.printedPage}` : null,
    body.pdfPageNumber ? `Pagina PDF: ${body.pdfPageNumber}` : null,
    body.voltage ? `Tensao: ${body.voltage}` : null,
    body.description,
    body.genericRowsText,
    body.notesText,
  ].filter(Boolean).join(" | ");
}

function normalizeResponsibility(value: string | undefined) {
  const text = (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (text.includes("CONCESS")) return "CONCESSIONARIA";
  if (text.includes("CLIENTE") || text.includes("INSTALADOR") || text.includes("CONSUMIDOR")) return "CLIENTE_OU_INSTALADOR";
  return "NAO_INFORMADO";
}

function labelForType(assetType: ManualImportBody["assetType"]) {
  const labels: Record<ManualImportBody["assetType"], string> = {
    TABLE: "Tabela",
    DRAWING: "Desenho",
    FIGURE: "Detalhe/Figura",
    NOTE: "Nota",
    LEGEND: "Legenda",
    REQUIREMENT: "Requisito",
  };
  return labels[assetType];
}

function sanitizeExt(name: string, contentType: string) {
  const extFromName = name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extFromName && extFromName.length <= 8) return extFromName;
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "bin";
}
