import type {
  BillingProduct,
  QueryAccessEvaluation,
  QuestionClassification,
  UserPlan,
} from "./domain-types";

type EvaluateQueryAccessParams = {
  userId?: string;
  question: string;
  classification: QuestionClassification;
  userPlan?: UserPlan;
  remainingCredits?: number;
};

const singleQueryPriceCents = 1000;

export function evaluateQueryAccess({
  classification,
  userPlan,
  remainingCredits = 0,
}: EvaluateQueryAccessParams): QueryAccessEvaluation {
  if (!classification.requiresPaidAccess) {
    return {
      allowed: true,
      accessLevel: "FREE",
      reason: "free_query",
      requiredProduct: "FREE_BT",
      priceCents: 0,
      messageForUser: "Esta consulta basica pode ser respondida gratuitamente.",
    };
  }

  if (userPlan === "ADMIN") {
    return {
      allowed: true,
      accessLevel: "INTERNAL_ADMIN",
      reason: "admin",
      messageForUser: "Acesso tecnico liberado para usuario interno.",
    };
  }

  if (userPlan === "TECHNICAL_MONTHLY" || userPlan === "TECHNICAL_ANNUAL") {
    return {
      allowed: true,
      accessLevel: "PAID_SUBSCRIPTION",
      reason: "subscription_active",
      requiredProduct:
        userPlan === "TECHNICAL_ANNUAL"
          ? "TECHNICAL_ANNUAL"
          : "TECHNICAL_MONTHLY",
      messageForUser: "Consulta tecnica liberada pelo plano ativo.",
    };
  }

  if (remainingCredits > 0) {
    return {
      allowed: true,
      accessLevel: "PAID_SINGLE",
      reason: "credit_available",
      requiredProduct: "TECHNICAL_SINGLE_QUERY",
      priceCents: singleQueryPriceCents,
      messageForUser: "Consulta tecnica liberada por credito avulso disponivel.",
    };
  }

  return {
    allowed: false,
    accessLevel: "PAID_SINGLE",
    reason: "payment_required",
    requiredProduct: requiredProductFor(classification),
    priceCents: singleQueryPriceCents,
    messageForUser:
      "Esta e uma consulta tecnica avancada baseada em normas, tabelas ou criterios de engenharia. Para continuar, adquira uma consulta avulsa ou assine o plano tecnico.",
  };
}

function requiredProductFor(
  classification: QuestionClassification,
): BillingProduct {
  return classification.complexity === "ADVANCED"
    ? "TECHNICAL_SINGLE_QUERY"
    : "TECHNICAL_SINGLE_QUERY";
}
