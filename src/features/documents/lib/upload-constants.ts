export const MAX_DOCUMENT_UPLOAD_BYTES = 50 * 1024 * 1024;
export const DOCUMENTS_BUCKET_ENV = "SUPABASE_DOCUMENTS_BUCKET";
export const DEFAULT_DOCUMENTS_BUCKET = "technical-documents";

export const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export const DOCUMENT_TYPE_OPTIONS = [
  {
    value: "TECHNICAL_STANDARD",
    label: "Norma tecnica",
  },
  {
    value: "CONNECTION_STANDARD",
    label: "Padrao de conexao",
  },
  {
    value: "PROCEDURE",
    label: "Procedimento",
  },
  {
    value: "MANUAL",
    label: "Manual",
  },
  {
    value: "RESOLUTION",
    label: "Resolucao",
  },
  {
    value: "OTHER",
    label: "Outro",
  },
] as const;
