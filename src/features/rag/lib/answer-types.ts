import type { NormativeAnswerPayload } from "./domain-types";

export type {
  NormativeAnswerPayload,
  NormativeAnswerSource,
  NormativeCalculation,
} from "./domain-types";

export const normativeAnswerDisclaimer =
  "Ferramenta independente de apoio tecnico. A resposta deve ser validada nas normas vigentes e por profissional habilitado antes de execucao, protocolo ou tomada de decisao.";

export function buildInsufficientSourceAnswer(
  question: string,
  missingContext: string[],
): NormativeAnswerPayload {
  return {
    question,
    answer:
      "A base documental disponivel ainda e insuficiente para responder com seguranca normativa.",
    audience: "TECHNICAL",
    complexity: "ADVANCED",
    accessLevel: "PAID_SINGLE",
    usedSources: [],
    calculations: [],
    tablesUsed: [],
    abacosUsed: [],
    missingContext,
    limitations: [
      "Nao foram encontradas fontes suficientes para concluir a resposta.",
      "Nao foram inventados itens, paginas, tabelas ou valores.",
    ],
    disclaimer: normativeAnswerDisclaimer,
    confidence: 0,
  };
}
