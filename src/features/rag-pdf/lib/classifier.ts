import type { RagPdfKind } from "./types";

export type RagPdfKindClassifier = (question: string) => RagPdfKind;

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

export const keywordRagPdfKindClassifier: RagPdfKindClassifier = (question) => {
  const normalized = question.toLowerCase();

  const technicalScore = technicalTerms.filter((term) =>
    normalized.includes(term),
  ).length;
  const clientScore = clientTerms.filter((term) =>
    normalized.includes(term),
  ).length;

  return technicalScore >= clientScore ? "technical" : "client";
};

export function suggestRagPdfKind(
  question: string,
  classifier: RagPdfKindClassifier = keywordRagPdfKindClassifier,
): RagPdfKind {
  return classifier(question);
}
