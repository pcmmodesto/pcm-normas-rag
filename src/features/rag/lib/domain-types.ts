export const questionAudiences = ["CLIENT", "TECHNICAL", "UNKNOWN"] as const;
export type QuestionAudience = (typeof questionAudiences)[number];

export const questionComplexities = [
  "SIMPLE",
  "INTERMEDIATE",
  "ADVANCED",
] as const;
export type QuestionComplexity = (typeof questionComplexities)[number];

export const accessLevels = [
  "FREE",
  "PAID_SINGLE",
  "PAID_SUBSCRIPTION",
  "INTERNAL_ADMIN",
] as const;
export type AccessLevel = (typeof accessLevels)[number];

export const billingProducts = [
  "FREE_BT",
  "TECHNICAL_SINGLE_QUERY",
  "TECHNICAL_MONTHLY",
  "TECHNICAL_ANNUAL",
] as const;
export type BillingProduct = (typeof billingProducts)[number];

export const queryTypes = [
  "BASIC_INFO",
  "STEP_BY_STEP",
  "DOCUMENT_LIST",
  "TECHNICAL_CRITERIA",
  "DIMENSIONING",
  "TABLE_LOOKUP",
  "ABACO_LOOKUP",
  "MATERIAL_SPECIFICATION",
  "NETWORK_STRUCTURE",
  "SUBSTATION",
  "REGULATORY_INTERPRETATION",
  "UNKNOWN",
] as const;
export type QueryType = (typeof queryTypes)[number];

export type QuestionClassification = {
  audience: QuestionAudience;
  complexity: QuestionComplexity;
  queryType: QueryType;
  suggestedAccessLevel: AccessLevel;
  detectedTopics: string[];
  detectedVoltageLevel?: string;
  detectedUtility?: string;
  detectedState?: string;
  requiresPaidAccess: boolean;
  missingRequiredContext: string[];
};

export type UserPlan = "FREE" | "TECHNICAL_MONTHLY" | "TECHNICAL_ANNUAL" | "ADMIN";

export type QueryAccessEvaluation = {
  allowed: boolean;
  accessLevel: AccessLevel;
  reason: "free_query" | "subscription_active" | "credit_available" | "admin" | "payment_required";
  requiredProduct?: BillingProduct;
  priceCents?: number;
  messageForUser: string;
};

export type NormativeAnswerSource = {
  documentTitle: string;
  documentVersion?: string;
  concessionaire?: string;
  stateCode?: string;
  pageNumber: number;
  itemReference?: string;
  tableReference?: string;
  quotedText: string;
  relevanceScore?: number;
};

export type NormativeCalculation = {
  formula: string;
  inputs: Record<string, string | number>;
  result: string | number;
  unit?: string;
  explanation: string;
  warning?: string;
};

export type NormativeAnswerPayload = {
  question: string;
  answer: string;
  audience: QuestionAudience;
  complexity: QuestionComplexity;
  accessLevel: AccessLevel;
  usedSources: NormativeAnswerSource[];
  calculations: NormativeCalculation[];
  tablesUsed: Array<{
    title: string;
    pageNumber: number;
    itemReference?: string;
  }>;
  abacosUsed: Array<{
    title: string;
    pageNumber: number;
    itemReference?: string;
  }>;
  missingContext: string[];
  limitations: string[];
  disclaimer: string;
  confidence: number;
};
