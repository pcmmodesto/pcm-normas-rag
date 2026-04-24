export const documentTypeLabels = {
  TECHNICAL_STANDARD: "Norma tecnica",
  CONNECTION_STANDARD: "Norma de conexao",
  PROCEDURE: "Procedimento",
  MANUAL: "Manual",
  RESOLUTION: "Resolucao",
  OTHER: "Outro",
} as const;

export const usageMetricLabels = {
  RAG_QUESTION: "Perguntas RAG",
  DOCUMENT_UPLOAD: "Uploads de documentos",
  DOCUMENT_PAGE: "Paginas processadas",
  DOCUMENT_CHUNK: "Chunks gerados",
  STORAGE_MB: "Armazenamento em MB",
  EMBEDDING_TOKEN: "Tokens de embedding",
  CHAT_TOKEN: "Tokens de chat",
} as const;
