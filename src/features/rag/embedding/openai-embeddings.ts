import "server-only";

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export function getEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
}

export function normalizeEmbeddingInput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24_000);
}

export async function generateEmbedding(input: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY nao configurada para gerar embeddings.");
  }

  const normalized = normalizeEmbeddingInput(input);
  if (!normalized) {
    throw new Error("Texto vazio para embedding.");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: getEmbeddingModel(),
      input: normalized,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Falha ao gerar embedding OpenAI (HTTP ${response.status}). ${detail.slice(0, 240)}`,
    );
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: unknown }>;
  };
  const embedding = payload.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding invalido: esperado ${EMBEDDING_DIMENSIONS} dimensoes.`);
  }

  return embedding.map((value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("Embedding retornou valor nao numerico.");
    }
    return value;
  });
}
