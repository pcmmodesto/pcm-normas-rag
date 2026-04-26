import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ChunkRow = {
  chunk_id: string;
  chunk_text: string;
  page_number: number;
  chunk_index: number;
  document_title: string;
  version_label: string;
  concessionaire: string | null;
  state_codes: string[] | null;
  document_type: string;
};

export async function POST(request: Request) {
  let question: string;

  try {
    const body = (await request.json()) as { question?: unknown };
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, message: "JSON invalido." }, { status: 400 });
  }

  if (!question || question.length < 3) {
    return NextResponse.json({ ok: false, message: "Pergunta muito curta." }, { status: 400 });
  }

  const keywords = extractKeywords(question);

  if (keywords.length === 0) {
    return NextResponse.json({
      ok: true,
      answer: "Nao encontrei base normativa suficiente para responder com segurança.",
      sources: [],
    });
  }

  const chunks = await searchChunks(keywords);

  if (chunks.length === 0) {
    return NextResponse.json({
      ok: true,
      answer: "Nao encontrei base normativa suficiente para responder com segurança.",
      sources: [],
    });
  }

  return NextResponse.json({
    ok: true,
    answer: buildAnswer(question, chunks),
    sources: chunks.map((c) => ({
      documentTitle: c.document_title,
      versionLabel: c.version_label,
      pageNumber: c.page_number,
      chunkIndex: c.chunk_index,
      excerpt: c.chunk_text.slice(0, 400),
      concessionaire: c.concessionaire,
      stateCodes: c.state_codes ?? [],
      documentType: c.document_type,
    })),
  });
}

function extractKeywords(question: string): string[] {
  const stopwords = new Set([
    "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "da", "do",
    "das", "dos", "em", "na", "no", "nas", "nos", "para", "por", "com",
    "que", "qual", "quais", "como", "quando", "onde", "e", "ou", "se",
    "me", "te", "nos", "isso", "isto", "esse", "essa", "este", "esta",
    "aquele", "aquela", "meu", "minha", "seu", "sua", "dele", "dela",
    "e", "sao", "foi", "era", "ser", "ter", "mais", "menos", "muito",
    "nao", "sim", "tambem", "ja", "ate", "pela", "pelo", "sobre",
    "entre", "contra", "pelas", "pelos", "apos", "qual",
  ]);

  return question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopwords.has(w))
    .slice(0, 8);
}

async function searchChunks(keywords: string[]): Promise<ChunkRow[]> {
  const conditions = Prisma.join(
    keywords.map((k) => Prisma.sql`lower(dc.text) like ${`%${k}%`}`),
    " or ",
  );

  try {
    return await prisma.$queryRaw<ChunkRow[]>(Prisma.sql`
      select
        dc.id          as chunk_id,
        dc.text        as chunk_text,
        dc.page_number,
        dc.chunk_index,
        td.title       as document_title,
        dv.version_label,
        td.concessionaire,
        td.state_codes,
        td.document_type
      from document_chunks dc
      join document_versions dv on dv.id = dc.document_version_id
      join technical_documents td on td.id = dv.document_id
      where dv.processing_status = 'READY'
        and (${conditions})
      order by dc.page_number asc
      limit 8
    `);
  } catch {
    return [];
  }
}

function buildAnswer(question: string, chunks: ChunkRow[]): string {
  const sources = [...new Set(chunks.map((c) => c.document_title))];
  const lines: string[] = [
    `Com base nos documentos normativos cadastrados, encontrei as seguintes referencias relacionadas a sua consulta:`,
    "",
  ];

  for (const chunk of chunks.slice(0, 5)) {
    lines.push(
      `Documento: ${chunk.document_title} (${chunk.version_label}) - Pagina ${chunk.page_number}`,
    );
    lines.push(`Trecho: "${chunk.chunk_text.slice(0, 400)}"`);
    lines.push("");
  }

  lines.push(`Fontes consultadas: ${sources.join("; ")}.`);
  lines.push(
    "Esta resposta e baseada exclusivamente nos documentos indexados. Para analise tecnica completa, consulte os documentos originais.",
  );

  return lines.join("\n");
}
