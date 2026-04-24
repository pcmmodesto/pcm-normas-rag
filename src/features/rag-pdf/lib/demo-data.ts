import { buildRagPdfPayload } from "./build-payload";
import type { RagPdfKind } from "./types";

export function getDemoRagPdfPayload(kind: RagPdfKind) {
  if (kind === "technical") {
    return buildRagPdfPayload({
      kind,
      question:
        "Qual estrutura de rede devo usar em um angulo de 45 graus com cabo 2 AWG CA?",
      answer:
        "Com base nos documentos carregados, a estrutura aplicavel deve ser definida pela tabela ou abaco de estruturas para rede de distribuicao considerando angulo, bitola e tipo de condutor. Como esta etapa ainda nao esta conectada ao RAG real, a resposta final deve aguardar a consulta aos chunks indexados.",
      documentTitle: "Norma Tecnica de Distribuicao",
      metadata: { mode: "demo", suggestedKind: "technical" },
      sources: [
        {
          id: "demo-tech-1",
          documentTitle: "Norma Tecnica de Distribuicao",
          pageNumber: 32,
          excerpt:
            "Trecho demonstrativo sobre selecao de estrutura conforme angulo e condutor.",
          normativeItem: "Item demonstrativo 6.2",
          chunkIndex: 4,
        },
        {
          id: "demo-tech-2",
          documentTitle: "Abaco de Estruturas",
          pageNumber: 45,
          excerpt:
            "Trecho demonstrativo de abaco para cruzamento entre angulo, bitola e esforco.",
          normativeItem: "Abaco demonstrativo A-03",
          chunkIndex: 12,
        },
      ],
    });
  }

  return buildRagPdfPayload({
    kind,
    question: "Qual o passo a passo para ligacao nova em Belem do Para?",
    answer:
      "O processo geralmente envolve reunir documentos, verificar padrao de entrada, solicitar ligacao, aguardar analise, executar adequacoes quando necessario e acompanhar vistoria/conclusao. A resposta final dependera dos documentos normativos carregados e da versao vigente.",
    documentTitle: "Norma de Fornecimento em Baixa Tensao",
    metadata: { mode: "demo", suggestedKind: "client" },
    sources: [
      {
        id: "demo-client-1",
        documentTitle: "Norma de Fornecimento em Baixa Tensao",
        pageNumber: 10,
        excerpt:
          "Trecho demonstrativo sobre solicitacao de ligacao e verificacao do padrao.",
        chunkIndex: 2,
      },
      {
        id: "demo-client-2",
        documentTitle: "Procedimento de Atendimento ao Cliente",
        pageNumber: 14,
        excerpt:
          "Trecho demonstrativo sobre documentacao, protocolo e acompanhamento.",
        chunkIndex: 7,
      },
    ],
  });
}

