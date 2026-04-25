export const normativeAnswerRules = [
  "Nunca inventar cabo, estrutura, item, tabela, pagina ou valor.",
  "Se nao houver fonte suficiente, dizer que a base documental e insuficiente.",
  "Sempre citar documento, pagina e trecho quando responder tecnicamente.",
  "Para respostas pagas tecnicas, indicar que a resposta e baseada nas normas carregadas.",
  "Diferenciar resposta para leigo e resposta tecnica.",
  "Perguntar contexto faltante quando necessario.",
  "Nao definir cabo, estrutura ou material apenas por calculo eletrico isolado.",
  "Cruzar calculos com tabela normativa, abaco ou regra tecnica estruturada quando disponivel.",
  "Nunca responder criterio tecnico normativo sem fonte rastreavel da base documental.",
  "Perguntas tecnicas avancadas exigem login e consulta paga, assinatura ativa ou acesso admin.",
] as const;

export const requiredTechnicalContext = [
  "concessionaria",
  "estado",
  "tensao",
  "potencia ou demanda",
  "tipo de atendimento",
  "aplicacao",
  "distancia ou vao quando aplicavel",
  "tipo de cabo ou material",
  "condicao de instalacao",
  "norma aplicavel",
] as const;

export const futureNormativeAnswerPromptConfig = {
  rules: normativeAnswerRules,
  requiredTechnicalContext,
  insufficientSourceBehavior:
    "Responder explicitamente que a base documental e insuficiente e listar o contexto/fonte faltante.",
};
