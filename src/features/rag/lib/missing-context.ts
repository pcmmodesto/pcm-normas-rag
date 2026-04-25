import type { QuestionClassification } from "./domain-types";

export function detectMissingContext(
  classification: Omit<QuestionClassification, "missingRequiredContext">,
) {
  if (!classification.requiresPaidAccess) {
    return [];
  }

  const missing = new Set<string>();
  const asksForAllAvailableVoltages = classification.detectedTopics.some((topic) =>
    topic.includes("tensoes disponiveis"),
  );

  if (!classification.detectedUtility) {
    missing.add("concessionaria");
  }

  if (!classification.detectedState) {
    missing.add("estado");
  }

  if (!classification.detectedVoltageLevel && !asksForAllAvailableVoltages) {
    missing.add("tensao de atendimento");
  }

  if (
    classification.queryType === "SUBSTATION" ||
    classification.detectedTopics.includes("subestacao")
  ) {
    missing.add("potencia ou demanda");
    missing.add("tipo de entrada");
    missing.add("padrao aereo ou subterraneo");
  }

  if (classification.queryType === "NETWORK_STRUCTURE") {
    missing.add("tipo de cabo/material");
    missing.add("distancia ou vao");
    missing.add("condicao de instalacao");
  }

  if (
    classification.queryType === "DIMENSIONING" ||
    classification.queryType === "TABLE_LOOKUP"
  ) {
    missing.add("norma ou tabela aplicavel");
  }

  return Array.from(missing);
}
