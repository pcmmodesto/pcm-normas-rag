import type { ProductQuestionClassification } from "./classify-question";

export type NormativeAnswerPayload = {
  question: string;
  classification: Pick<
    ProductQuestionClassification,
    "audienceType" | "queryType" | "category" | "accessRequired" | "missingContext"
  >;
  answer: {
    directAnswer: string;
    assumptions: string[];
    technicalDetails: string[];
    limitations: string[];
    nextQuestions: string[];
    confidence: "LOW" | "MEDIUM" | "HIGH";
  };
  sources: Array<{
    documentTitle: string;
    utilityCompany: string;
    state: string;
    version: string;
    pageNumber: number;
    itemNumber?: string;
    tableTitle?: string;
    excerpt: string;
  }>;
};

export const insufficientSourceAnswer =
  "A base documental disponível ainda não possui informação suficiente para responder com segurança.";
