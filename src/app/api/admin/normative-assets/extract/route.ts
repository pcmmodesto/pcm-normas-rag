import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 18 * 1024 * 1024;

type EvidenceFile = {
  name: string;
  mediaType: string;
  base64Data: string;
  isPdf: boolean;
};

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

  const openAiApiKey = getEnv("OPENAI_API_KEY");
  const anthropicApiKey = getAnthropicApiKey();
  if (!openAiApiKey && !anthropicApiKey) {
    return NextResponse.json(
      { ok: false, message: "Configure ANTHROPIC_API_KEY ou OPENAI_API_KEY para extracao visual." },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, message: "Formulario invalido." }, { status: 400 });
  }

  let files: EvidenceFile[];
  try {
    files = await readEvidenceFiles(form);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Evidencia invalida para extracao." },
      { status: 400 },
    );
  }
  if (!files.length) {
    return NextResponse.json({ ok: false, message: "Envie uma imagem ou PDF para extrair." }, { status: 400 });
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

  try {
    const prompt = buildPrompt(hints, files);
    const outputText = anthropicApiKey
      ? await extractWithAnthropic({
          apiKey: anthropicApiKey,
          files,
          prompt,
        })
      : await extractWithOpenAI({
          apiKey: openAiApiKey!,
          files,
          prompt,
        });
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

async function extractWithOpenAI({
  apiKey,
  files,
  prompt,
}: {
  apiKey: string;
  files: EvidenceFile[];
  prompt: string;
}) {
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
            ...files.map((file) =>
              file.isPdf
                ? {
                    type: "input_file",
                    filename: file.name || "norma.pdf",
                    file_data: `data:${file.mediaType};base64,${file.base64Data}`,
                  }
                : {
                    type: "input_image",
                    image_url: `data:${file.mediaType};base64,${file.base64Data}`,
                  },
            ),
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
      ],
      temperature: 0,
      max_output_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Falha na extracao visual OpenAI (${response.status}). ${text.slice(0, 300)}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return extractOpenAIOutputText(payload);
}

async function extractWithAnthropic({
  apiKey,
  files,
  prompt,
}: {
  apiKey: string;
  files: EvidenceFile[];
  prompt: string;
}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_EXTRACTION_MODEL ?? "claude-sonnet-4-20250514",
      max_tokens: 8000,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            ...files.map((file) =>
              file.isPdf
                ? {
                    type: "document",
                    source: {
                      type: "base64",
                      media_type: "application/pdf",
                      data: file.base64Data,
                    },
                  }
                : {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: file.mediaType,
                      data: file.base64Data,
                    },
                  },
            ),
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Falha na extracao visual Anthropic (${response.status}). ${text.slice(0, 300)}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return extractAnthropicOutputText(payload);
}

async function readEvidenceFiles(form: FormData): Promise<EvidenceFile[]> {
  const candidates = [
    ...form.getAll("files"),
    ...["file", "file2"].map((key) => form.get(key)),
  ];
  const files: File[] = [];
  for (const candidate of candidates) {
    if (!(candidate instanceof File) || candidate.size === 0) continue;
    if (files.some((file) => file.name === candidate.name && file.size === candidate.size)) continue;
    files.push(candidate);
  }

  let totalSize = 0;
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`Arquivo ${file.name} excede 12 MB. Use um recorte menor e nitido da tabela/desenho.`);
    }
    totalSize += file.size;
  }
  if (totalSize > MAX_TOTAL_FILE_BYTES) {
    throw new Error("As evidencias somadas excedem 18 MB. Envie recortes menores ou menos paginas por extracao.");
  }

  return Promise.all(
    files.slice(0, 2).map(async (file) => {
      const mediaType = file.type || guessMediaType(file.name);
      return {
        name: file.name,
        mediaType,
        base64Data: Buffer.from(await file.arrayBuffer()).toString("base64"),
        isPdf: mediaType.includes("pdf") || file.name.toLowerCase().endsWith(".pdf"),
      };
    }),
  );
}

function buildPrompt(hints: Record<string, string | null>, files: EvidenceFile[]) {
  const hasPdf = files.some((file) => file.isPdf);
  return `
Voce esta extraindo dados de uma norma tecnica de concessionaria de energia.
Os arquivos podem conter uma tabela/desenho em uma ou duas paginas consecutivas.

Objetivo:
- Identificar o tipo real do ativo.
- Extrair titulo, codigo/numero, notas e linhas estruturadas.
- Preservar valores, unidades, asteriscos, quantidades e responsabilidades.
- Nao inventar valor. Se nao enxergar, deixe vazio e coloque aviso em warnings.
- Quando houver 2 arquivos, trate o arquivo 1 antes do arquivo 2 e una a continuacao da mesma tabela.
- Nao pare na primeira pagina: extraia todas as linhas visiveis em todos os arquivos.
- Ignore cabecalhos, rodapes, logos e classificacao da informacao como linhas de dados.

Dicas do formulario:
${JSON.stringify(hints, null, 2)}

Arquivos recebidos, nesta ordem:
${files.map((file, index) => `${index + 1}. ${file.name} (${file.isPdf ? "PDF" : "imagem"})`).join("\n")}

Regras para tipos:
- Tabela de dimensionamento de ramal/cabo/disjuntor: preencher dimensioningRows com campos:
  supplyType, loadMinKw, loadMaxKw, breakerAmp, breakerType, copperConcentricMm2,
  copperMultiplexedMm2, aluminumDuplexMm2, aluminumTriplexMm2, aluminumQuadruplexMm2,
  galvanizedSteelConduitInch, customerPhaseNeutralConductorMm2, groundingConductorMm2,
  groundingConduitInch, notes.
- Para "MONOFASICO", "MONO" ou "(MONO)", use supplyType "MONOFASICO".
- Para "TRIFASICO", "TRI" ou "(TRI)", use supplyType "TRIFASICO".
- Para "BIFASICO" ou "BI", use supplyType "BIFASICO".
- Para carga "Ate 5", deixe loadMinKw vazio e use loadMaxKw 5.
- Para carga "De 48,1 a 60", use loadMinKw 48.1 e loadMaxKw 60.
- Para disjuntor "20 (TRI)", use breakerAmp 20 e breakerType "TRI".
- Nunca use valores de condutor/eletroduto como disjuntor. Se o disjuntor estiver ilegivel, deixe breakerAmp vazio e avise em warnings.
- Se a tabela continuar na pagina seguinte, mantenha o mesmo codigo/numero/titulo e acrescente as linhas da continuacao no fim de dimensioningRows.
- Outras tabelas: usar genericRowsText com uma linha por registro e celulas separadas por ponto e virgula.
  Exemplos:
  "Aquecedor de agua por acumulacao; 50 a 100 litros; 1000 W"
  "1; 0,80; 0,80"
  "ALVORADA; 220; NORTE"
  "01*; Alca pre-formada para servico para cabo multiplexado; 2 und; CONCESSIONARIA"
- Desenhos/detalhes/legendas: genericRowsText deve listar itens/cotas/componentes, e notesText deve listar notas.
- Se o desenho/detalhe contiver uma tabela tecnica embutida, preserve essa tabela em genericRowsText:
  - A primeira linha deve ser o cabecalho real, com colunas separadas por ponto e virgula.
  - Cada linha seguinte deve representar exatamente uma linha da tabela.
  - Nao junte varias linhas da tabela em uma unica linha.
  - Nao resuma valores numericos, codigos, dimensoes, materiais ou resistencias.
  - Se uma celula estiver ilegivel, use "[ilegivel]" nessa celula e adicione aviso em warnings.
- Para desenhos com cotas:
  - description deve explicar o que o desenho representa.
  - genericRowsText deve conter primeiro a tabela embutida, se houver; depois itens/cotas/componentes em linhas separadas.
  - notesText deve conter notas, chamadas e observacoes fora da tabela.
- Se houver asterisco e nota de responsabilidade da concessionaria, marque responsabilidade CONCESSIONARIA.
- Se for ${hasPdf ? "PDF" : "imagem"}, extraia apenas o que esta visivel/legivel.
- Para tabelas de materiais, dimensoes ou condutores, preserve todas as colunas no genericRowsText com cabecalho claro na primeira linha.
- Exemplos de genericRowsText para desenho/tabela de material:
  "ITEM; CODIGO; A; B; C; D; E; F; MATERIAL; CHAPA; RESISTENCIA daN"
  "1; 132210019; 5000; 1100; 2550; 100; 2450; 70; [material visivel]; 2; 50"
  "2; 132210023; 7000; 1300; 4350; 100; 2650; 70; [material visivel]; 2; 70"
- Antes de responder, conte mentalmente as linhas visiveis da tabela e confirme que dimensioningRows ou genericRowsText tem a mesma quantidade de linhas de dados.

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

function extractOpenAIOutputText(payload: Record<string, unknown>) {
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

function extractAnthropicOutputText(payload: Record<string, unknown>) {
  const content = payload.content;
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const piece of content) {
    if (!piece || typeof piece !== "object") continue;
    const text = (piece as { text?: unknown }).text;
    if (typeof text === "string") parts.push(text);
  }
  return parts.join("\n");
}

function getAnthropicApiKey() {
  return getEnv("ANTHROPIC_API_KEY") ?? getEnv("ANTROPIC_API_KEY");
}

function getEnv(key: string) {
  const value = process.env[key]?.trim();
  return value || undefined;
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
