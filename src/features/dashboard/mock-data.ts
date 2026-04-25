export const adminMetrics = [
  { label: "Usuarios", value: "128", detail: "Contas cadastradas", trend: "+12%" },
  { label: "Empresas", value: "34", detail: "Clientes e grupos", trend: "+4" },
  { label: "Documentos", value: "412", detail: "Normas e anexos", trend: "27 pendentes" },
  { label: "Consultas", value: "8.420", detail: "Total historico", trend: "+18%" },
  { label: "Gratuitas", value: "5.980", detail: "BT e atendimento", trend: "71%" },
  { label: "Pagas", value: "2.440", detail: "Tecnicas avancadas", trend: "29%" },
  { label: "PDFs gerados", value: "1.126", detail: "Tecnicos e cliente", trend: "+9%" },
  { label: "Receita estimada", value: "R$ 18,7 mil", detail: "MRR previsto", trend: "mock" },
];

export const adminKpis = [
  { label: "Receita mensal estimada", value: "R$ 18.740", detail: "Assinaturas e avulsas" },
  { label: "Receita anual estimada", value: "R$ 224.880", detail: "ARR projetado" },
  { label: "Consultas tecnicas pagas", value: "2.440", detail: "Mes corrente" },
  { label: "Conversao free para pago", value: "11,8%", detail: "Preview comercial" },
  { label: "Uso de storage", value: "38 GB", detail: "Bucket privado" },
  { label: "Tokens futuros", value: "2,1M", detail: "Estimativa RAG" },
  { label: "PDFs exportados", value: "1.126", detail: "Relatorios gerados" },
  { label: "Erros recentes", value: "6", detail: "Ultimas 24h" },
];

export const subscriptionRows = [
  ["PCM Solar", "admin@pcmsolar.com", "Tecnico mensal", "active", "02/04/2026", "02/05/2026", "82 / 150", "R$ 30,00", "Ver"],
  ["Engenharia Norte", "ops@norte.eng", "Tecnico anual", "active", "12/01/2026", "12/01/2027", "340 / 2000", "R$ 306,00", "Ver"],
  ["Cliente avulso", "cliente@email.com", "Consulta avulsa", "trial", "24/04/2026", "25/04/2026", "1 / 1", "R$ 10,00", "Ver"],
  ["Projetos BT", "financeiro@bt.com", "Gratuito", "past_due", "01/03/2026", "01/04/2026", "28 / 50", "R$ 0,00", "Ver"],
];

export const auditLogRows = [
  ["25/04/2026 14:12", "admin@pcm.com", "document.upload", "TechnicalDocument", "192.168.0.12", "success", "PDF cadastrado"],
  ["25/04/2026 13:58", "sistema", "rag.classify", "RagQuestion", "-", "success", "Consulta tecnica"],
  ["25/04/2026 13:31", "ops@cliente.com", "pdf.export", "RagAnswer", "10.0.0.8", "success", "PDF tecnico"],
  ["25/04/2026 12:44", "admin@pcm.com", "storage.upload", "DocumentVersion", "192.168.0.12", "error", "Bucket indisponivel"],
];

export const financeMetrics = [
  { label: "Receita do mes", value: "R$ 18.740", detail: "Mock sem gateway" },
  { label: "Receita anual", value: "R$ 224.880", detail: "Projecao" },
  { label: "MRR previsto", value: "R$ 15.420", detail: "Assinaturas ativas" },
  { label: "ARR previsto", value: "R$ 185.040", detail: "Mensal recorrente" },
  { label: "Avulsas vendidas", value: "332", detail: "R$ 10 por consulta" },
  { label: "Mensais", value: "514", detail: "Planos ativos" },
  { label: "Anuais", value: "87", detail: "Planos ativos" },
  { label: "Ticket medio", value: "R$ 26,40", detail: "Estimado" },
];

export const documentRows = [
  ["NT.00001 fornecimento BT", "Equatorial", "PA", "Baixa tensao", "2025.1", "enviado", "25/04/2026", "0", "0", "Pendente", "Ver"],
  ["EPD rede aerea compacta", "Base publica", "MA", "EPD", "2024.3", "processando", "22/04/2026", "184", "0", "Nao", "Reprocessar"],
  ["Manual subestacao abrigada", "Base publica", "GO", "Subestacao", "2023.2", "indexado", "18/04/2026", "96", "1.220", "Sim", "Ver"],
  ["EPE materiais padronizados", "Base publica", "PI", "EPE", "2024.1", "erro", "15/04/2026", "72", "0", "Nao", "Arquivar"],
];

export const pdfExportRows = [
  ["25/04/2026", "engenheiro@cliente.com", "PDF tecnico", "Cabo para subestacao 300 kVA", "pcm-rag-300kva.pdf", "gerado", "Tecnico mensal", "R$ 0,18", "Visualizar"],
  ["24/04/2026", "cliente@email.com", "PDF cliente", "Documentos para ligacao nova", "ligacao-nova.pdf", "gerado", "Gratuito", "R$ 0,04", "Visualizar"],
  ["23/04/2026", "ops@empresa.com", "PDF tecnico", "Estrutura angulo 45 graus", "estrutura-45.pdf", "falhou", "Avulsa", "R$ 0,22", "Recriar"],
];

export const dashboardMetrics = [
  { label: "Plano atual", value: "Tecnico mensal", detail: "Renova em 02/05/2026" },
  { label: "Consultas disponiveis", value: "68", detail: "De 150 no mes" },
  { label: "Consultas usadas", value: "82", detail: "54% do limite" },
  { label: "PDFs gerados", value: "19", detail: "Mes corrente" },
  { label: "Favoritos", value: "12", detail: "Documentos salvos" },
  { label: "Consumo anual", value: "1.248", detail: "Consultas totais" },
];

export const usageRows = [
  ["Janeiro", "142", "98", "44", "12", "Padrao de entrada", "NT BT"],
  ["Fevereiro", "168", "103", "65", "18", "Subestacao", "Manual MT"],
  ["Marco", "194", "121", "73", "24", "Cabo e bitola", "Tabela EPD"],
  ["Abril", "82", "51", "31", "19", "Rede aerea", "EPE materiais"],
];

export const historyRows = [
  ["Qual documento para ligacao nova?", "Basica", "respondida", "25/04/2026", "2 fontes", "Sim", "Gratuito"],
  ["Qual cabo para subestacao 300 kVA?", "Tecnica", "precisa contexto", "24/04/2026", "0 fontes", "Nao", "Pago"],
  ["Estrutura para angulo de 45 graus?", "Tecnica", "respondida", "23/04/2026", "4 fontes", "Sim", "Assinatura"],
];

export const recentUploads = [
  ["NT.00001 fornecimento BT", "PA", "enviado", "25/04/2026"],
  ["Manual subestacao abrigada", "GO", "indexado", "18/04/2026"],
  ["EPE materiais padronizados", "PI", "erro", "15/04/2026"],
];

export const helpSections = [
  ["Como usar o chat", "Digite uma pergunta objetiva, informe concessionaria, estado e tensao quando a consulta for tecnica."],
  ["Consulta gratuita e paga", "Baixa tensao e atendimento basico ficam no plano gratuito. Criterios tecnicos avancados exigem consulta avulsa ou assinatura."],
  ["Como interpretar fontes", "Respostas tecnicas devem exibir documento, versao, pagina, item, tabela e trecho usado."],
  ["Como gerar PDF", "Depois de uma resposta, escolha PDF tecnico ou PDF para cliente. A geracao real sera conectada em etapa futura."],
  ["Limitacoes da IA", "O sistema nao deve inventar norma, pagina, cabo, tabela ou valor. Se a base for insuficiente, a resposta deve dizer isso claramente."],
  ["Assinaturas", "Os planos estao preparados visualmente. Checkout e cobranca real serao conectados depois."],
];

export const pricingPlans = [
  {
    name: "Consulta basica",
    price: "Gratis",
    cadence: "com limites",
    badge: "FREE_BT",
    features: ["Ligacao nova", "Baixa tensao", "Documentos", "Passo a passo", "Atendimento ao consumidor"],
  },
  {
    name: "Consulta tecnica avulsa",
    price: "R$ 10,00",
    cadence: "por pergunta",
    badge: "SINGLE",
    features: ["Uma pergunta tecnica", "Fontes normativas", "Resposta rastreavel", "PDF tecnico futuro"],
  },
  {
    name: "Plano Tecnico Mensal",
    price: "R$ 30,00",
    cadence: "por mes",
    badge: "MONTHLY",
    features: ["Consultas mensais", "Historico", "PDFs", "Painel de uso"],
  },
  {
    name: "Plano Tecnico Anual",
    price: "R$ 306,00",
    cadence: "por ano",
    badge: "ANNUAL",
    features: ["15% de desconto", "Beneficios do mensal", "Melhor custo-beneficio", "Uso anual consolidado"],
  },
];

export const mockUserLoggedIn = true;
export const mockUserPlan = "FREE_BT";
export const mockHasTechnicalAccess = false;
export const mockRemainingCredits = 0;

export const freeChatExamples = [
  "Quais documentos preciso para ligacao nova?",
  "Como pedir ligacao em baixa tensao?",
  "O que e padrao de entrada?",
];

export const userRows = [
  ["Ana Projetos", "ana@cliente.com", "Cliente", "active", "Tecnico mensal", "25/04/2026"],
  ["Carlos Solar", "carlos@solar.com", "Cliente", "trial", "Gratis", "24/04/2026"],
  ["Admin PCM", "admin@pcm.com", "Admin", "active", "Interno", "20/04/2026"],
];

export const processingRows = [
  ["NT.00001 fornecimento BT", "Extracao de texto", "pendente", "0 / 96", "Aguardando worker"],
  ["Manual subestacao abrigada", "Chunks", "processando", "480 / 1220", "Fila tecnica"],
  ["EPE materiais padronizados", "Embeddings", "erro", "0 / 720", "Dependencia futura"],
];

export const customerPdfRows = [
  ["25/04/2026", "PDF tecnico", "Cabo para subestacao 300 kVA", "gerado", "Tecnico mensal"],
  ["24/04/2026", "PDF cliente", "Documentos para ligacao nova", "gerado", "Gratuito"],
  ["23/04/2026", "PDF tecnico", "Estrutura angulo 45 graus", "falhou", "Avulsa"],
];
