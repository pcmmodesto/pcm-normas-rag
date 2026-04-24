import {
  BASE_RAG_PDF_DISCLAIMER,
  CLIENT_RAG_PDF_DISCLAIMER,
  TECHNICAL_RAG_PDF_DISCLAIMER,
} from "./constants";
import type { RagPdfKind, RagPdfPayload, RagPdfSource } from "./types";

type BuildRagPdfPayloadParams = {
  question: string;
  answer: string;
  sources: RagPdfSource[];
  kind: RagPdfKind;
  companyName?: string;
  documentTitle?: string;
  generatedAt?: Date;
  metadata?: Record<string, unknown>;
};

export function buildRagPdfPayload({
  question,
  answer,
  sources,
  kind,
  companyName,
  documentTitle,
  generatedAt = new Date(),
  metadata,
}: BuildRagPdfPayloadParams): RagPdfPayload {
  const title =
    kind === "technical"
      ? "Relatorio tecnico de consulta normativa"
      : "Guia explicativo para atendimento";

  const specificDisclaimer =
    kind === "technical"
      ? TECHNICAL_RAG_PDF_DISCLAIMER
      : CLIENT_RAG_PDF_DISCLAIMER;

  return {
    question,
    answer,
    kind,
    title,
    companyName,
    documentTitle,
    sources,
    generatedAt: generatedAt.toISOString(),
    disclaimer: `${BASE_RAG_PDF_DISCLAIMER} ${specificDisclaimer}`,
    metadata,
    sections:
      kind === "technical"
        ? buildTechnicalSections(answer)
        : buildClientSections(answer),
  };
}

function buildTechnicalSections(answer: string) {
  return [
    {
      title: "Resposta tecnica estruturada",
      body: answer,
    },
    {
      title: "Condicoes consideradas",
      items: [
        "Consulta baseada somente nas fontes vinculadas a resposta RAG.",
        "Parametros tecnicos devem ser confirmados na norma vigente.",
        "Aplicacao depende de projeto, carga, rede existente e analise de campo.",
      ],
    },
    {
      title: "Interpretacao normativa",
      body: "A interpretacao deve cruzar o texto da norma, tabelas, abacos e itens citados nas fontes. Nesta etapa demonstrativa, a validacao final depende da conexao com os chunks reais do RAG.",
    },
    {
      title: "Criterios de verificacao",
      rows: [
        {
          label: "Condutor / bitola",
          value: "Confirmar na tabela ou abaco aplicavel.",
          note: "Nao inferir bitola sem fonte.",
        },
        {
          label: "Angulo / esforco",
          value: "Verificar criterio mecanico indicado pela norma.",
          note: "Pode exigir estrutura especifica.",
        },
        {
          label: "Padrao construtivo",
          value: "Validar item normativo e desenho associado.",
          note: "Depende da concessionaria e versao.",
        },
      ],
    },
    {
      title: "Checklist de validacao tecnica",
      items: [
        "Conferir versao vigente da norma.",
        "Confirmar pagina, item, tabela ou abaco citado.",
        "Validar carga, tensao, rede e condicoes de campo.",
        "Registrar decisao tecnica em memoria ou projeto.",
        "Submeter para profissional habilitado quando aplicavel.",
      ],
    },
  ];
}

function buildClientSections(answer: string) {
  return [
    {
      title: "Resposta em linguagem simples",
      body: answer,
    },
    {
      title: "Passo a passo",
      items: [
        "Reunir documentos pessoais e do imovel.",
        "Verificar se o padrao de entrada atende a norma vigente.",
        "Abrir solicitacao no canal da concessionaria.",
        "Aguardar analise, orientacoes e eventual vistoria.",
        "Corrigir pendencias antes de solicitar nova avaliacao.",
      ],
    },
    {
      title: "Documentos necessarios",
      items: [
        "Documento de identificacao do solicitante.",
        "Comprovante de propriedade, posse ou autorizacao do imovel.",
        "Endereco completo e ponto de referencia.",
        "Informacoes de carga ou atividade do imovel quando solicitadas.",
      ],
    },
    {
      title: "Cuidados e erros comuns",
      items: [
        "Montar o padrao sem conferir a norma vigente.",
        "Informar carga menor que a real.",
        "Enviar documentacao incompleta.",
        "Ignorar pendencias apontadas em vistoria.",
      ],
    },
    {
      title: "Checklist do cliente",
      items: [
        "Tenho documentos pessoais e do imovel.",
        "Conferi o padrao de entrada com profissional qualificado.",
        "Sei qual canal da concessionaria devo usar.",
        "Guardei protocolo e prazos informados.",
      ],
    },
  ];
}

