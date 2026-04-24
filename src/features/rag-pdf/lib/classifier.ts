import type { RagPdfKind } from "./types";

const technicalTerms = [
  "awg",
  "cabo",
  "ca",
  "estrutura",
  "rede",
  "angulo",
  "poste",
  "demanda",
  "ramal",
  "disjuntor",
  "transformador",
  "subestacao",
  "bt",
  "mt",
  "gd",
  "spda",
  "norma",
  "abaco",
  "tabela",
  "item normativo",
];

const clientTerms = [
  "ligacao nova",
  "documentos",
  "passo a passo",
  "como solicitar",
  "prazo",
  "consumidor",
  "residencia",
  "loja",
  "conta de energia",
  "titularidade",
  "protocolo",
  "aumento de carga",
];

export function suggestRagPdfKind(question: string): RagPdfKind {
  const normalized = question.toLowerCase();

  const technicalScore = technicalTerms.filter((term) =>
    normalized.includes(term),
  ).length;
  const clientScore = clientTerms.filter((term) =>
    normalized.includes(term),
  ).length;

  return technicalScore >= clientScore ? "technical" : "client";
}

