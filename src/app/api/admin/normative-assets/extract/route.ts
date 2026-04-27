import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_BYTES = 12 * 1024 * 1024;

type ExtractedAsset = {
  assetType?: string;
  category?: string;
  code?: string;
  number?: string;
  title?: string;
  voltage?: string;
  description?: string;
  genericRowsText?: string;
  notesText?: string;
  dimensioningRows?: Array<Record<string, unknown>>;
  confidence?: string;
  warnings?: string[];
};

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ ok: false, message: "Autenticacao obrigatoria." }, { status: 401 });
  }
  if (currentUser.role !== "ADMIN") {
    return NextResponse.json({ ok: false, message: "Apenas administradores podem extrair ativos normativos." }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "OPENAI_API_KEY nao esta configurada para extracao visual." },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, message: "Formulario invalido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, message: "Envie uma imagem ou PDF para extrair." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Arquivo muito grande. Use um recorte da tabela/desenho com ate 12 MB." },
      { status: 400 },
    );
  }

  const hints = {
    assetType: stringField(form, "assetType"),
    category: stringField(form, "category"),
    title: stringField(form, "title"),
    code: stringField(form, "code"),
    number: stringField(form, "number"),
    voltage: stringField(form, "voltage"),
    printedPage: stringField(form, "printedPage"),
  };
  const bytes = Buffer.from(await file.arrayBuffer());
  const mediaType = file.type || guessMediaType(file.name);
  const fileData = `data:${mediaType};base64,${bytes.toString("base64")}`;
  const isPdf = mediaType.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildPrompt(hints, isPdf),
              },
              isPdf
                ? {
                    type: "input_file",
                    filename: file.name || "norma.pdf",
                    file_data: fileData,
                  }
                : {
                    type: "input_image",
                    image_url: fileData,
                  },
            ],
          },
        ],
        temperature: 0,
        max_output_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        { ok: false, message: `Falha na extracao visual (${response.status}). ${text.slice(0, 300)}` },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const outputText = extractOutputText(payload);
    const parsed = parseJsonObject(outputText);
    if (!parsed) {
      return NextResponse.json(
        {
          ok: false,
          message: "A extracao nao retornou JSON valido. Tente recortar melhor a imagem da tabela.",
          rawText: outputText.slice(0, 1200),
        },
        { status: 502 },
      );
    }

    const normalized = normalizeExtracted(parsed);
    return NextResponse.json({
      ok: true,
      extracted: normalized,
      message: "Extracao concluida. Revise os dados antes de validar.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Falha ao extrair dados da imagem/PDF." },
      { status: 500 },
    );
  }
}

function buildPrompt(hints: Record<string, string | null>, isPdf: boolean) {
  return `
Voce esta extraindo dados de uma norma tecnica de concessionaria de energia.
O arquivo pode conter tabela, desenho, legenda, detalhe, nota ou requisito.

Objetivo:
- Identificar o tipo real do ativo.
- Extrair titulo, codigo/numero, notas e linhas estruturadas.
- Preservar valores, unidades, asteriscos, quantidades e responsabilidades.
- Nao inventar valor. Se nao enxergar, deixe vazio e coloque aviso em warnings.

Dicas do formulario:
${JSON.stringify(hints, null, 2)}

Regras para tipos:
- Tabela de dimensionamento de ramal/cabo/disjuntor: preencher dimensioningRows com campos:
  supplyType, loadMinKw, loadMaxKw, breakerAmp, breakerType, copperConcentricMm2,
  copperMultiplexedMm2, aluminumDuplexMm2, aluminumTriplexMm2, aluminumQuadruplexMm2,
  galvanizedSteelConduitInch, customerPhaseNeutralConductorMm2, groundingConductorMm2,
  groundingConduitInch, notes.
- Outras tabelas: usar genericRowsText com uma linha por registro e celulas separadas por ponto e virgula.
  Exemplos:
  "Aquecedor de agua por acumulacao; 50 a 100 litros; 1000 W"
  "1; 0,80; 0,80"
  "ALVORADA; 220; NORTE"
  "01*; Alca pre-formada para servico para cabo multiplexado; 2 und; CONCESSIONARIA"
- Desenhos/detalhes/legendas: genericRowsText deve listar itens/cotas/componentes, e notesText deve listar notas.
- Se houver asterisco e nota de responsabilidade da concessionaria, marque responsabilidade CONCESSIONARIA.
- Se for ${isPdf ? "PDF" : "imagem"}, extraia apenas o que esta visivel/legivel.

Retorne somente JSON valido no formato:
{
  "assetType": "TABLE|DRAWING|FIGURE|NOTE|LEGEND|REQUIREMENT",
  "category": "SERVICE_ENTRANCE_SIZING|APPLIANCE_POWER|DEMAND_FACTOR|MINIMUM_LOAD_DEMAND|VOLTAGE_BY_CITY|MATERIAL_DIMENSIONS|METERING_DRAWING|CONDUIT_DETAIL|POST_DETAIL|RESPONSIBILITY_LEGEND|GENERAL_REQUIREMENT",
  "code": "TABELA 3",
  "number": "3",
  "title": "titulo extraido",
  "voltage": "127/220V ou 220/380V ou vazio",
  "description": "resumo tecnico curto",
  "genericRowsText": "linhas separadas por \\n e colunas por ;",
  "notesText": "notas separadas por \\n",
  "dimensioningRows": [],
  "confidence": "alta|media|baixa",
  "warnings": []
}
`.trim();
}

function extractOutputText(payload: Record<string, unknown>) {
  const direct = payload.output_text;
  if (typeof direct === "string") return direct;

  const output = payload.output;
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object" || !("content" in item)) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const piece of content) {
      if (!piece || typeof piece !== "object") continue;
      const text = (piece as { text?: unknown }).text;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("\n");
}

function parseJsonObject(text: string): ExtractedAsset | null {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as ExtractedAsset;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as ExtractedAsset;
    } catch {
      return null;
    }
  }
}

function normalizeExtracted(value: ExtractedAsset): ExtractedAsset {
  return {
    assetType: normalizeChoice(value.assetType, ["TABLE", "DRAWING", "FIGURE", "NOTE", "LEGEND", "REQUIREMENT"], "TABLE"),
    category: normalizeChoice(
      value.category,
      [
        "SERVICE_ENTRANCE_SIZING",
        "APPLIANCE_POWER",
        "DEMAND_FACTOR",
        "MINIMUM_LOAD_DEMAND",
        "VOLTAGE_BY_CITY",
        "MATERIAL_DIMENSIONS",
        "METERING_DRAWING",
        "CONDUIT_DETAIL",
        "POST_DETAIL",
        "RESPONSIBILITY_LEGEND",
        "GENERAL_REQUIREMENT",
      ],
      "GENERAL_REQUIREMENT",
    ),
    code: stringOrEmpty(value.code),
    number: stringOrEmpty(value.number),
    title: stringOrEmpty(value.title),
    voltage: stringOrEmpty(value.voltage),
    description: stringOrEmpty(value.description),
    genericRowsText: stringOrEmpty(value.genericRowsText),
    notesText: stringOrEmpty(value.notesText),
    dimensioningRows: Array.isArray(value.dimensioningRows) ? value.dimensioningRows : [],
    confidence: stringOrEmpty(value.confidence) || "media",
    warnings: Array.isArray(value.warnings) ? value.warnings.map(String).filter(Boolean) : [],
  };
}

function normalizeChoice(value: unknown, allowed: string[], fallback: string) {
  const text = String(value ?? "").toUpperCase().trim();
  return allowed.includes(text) ? text : fallback;
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringField(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function guessMediaType(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}
