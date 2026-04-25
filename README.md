# PCM Normas RAG

Base inicial em Next.js para um aplicativo RAG de consulta inteligente de normas
tecnicas de concessionarias de energia.

O produto e uma ferramenta independente. Nao e oficial, afiliado ou endossado
pela Equatorial ou por qualquer concessionaria.

## Visao do produto

O PCM Normas RAG sera um assistente inteligente para consulta de normas,
notas tecnicas, especificacoes de materiais, padroes de entrada, EPDs, EPEs,
manuais e documentos tecnicos de concessionarias de energia.

A resposta futura deve ser baseada exclusivamente nos documentos cadastrados e
sempre rastreavel por documento, versao, concessionaria, estado, pagina, item
normativo, tabela, trecho usado, confianca, limitacoes e observacoes.

O sistema atende dois publicos:

- Cliente comum: perguntas simples de baixa tensao, ligacao nova, documentos,
  titularidade, religacao, segunda via, protocolo e passo a passo. Esse escopo
  sera gratuito dentro dos limites definidos.
- Publico tecnico: criterios de media tensao, subestacao, cabos, estruturas,
  materiais, redes aereas/subterraneas, tabelas, abacos, EPD/EPE e
  interpretacao normativa. Esse escopo sera pago.

## Modelo comercial preparado

Pagamento real ainda nao foi implementado. A modelagem e os servicos foram
preparados para futuro gateway como Stripe:

- `FREE_BT`: consultas basicas gratuitas de baixa tensao e atendimento.
- `TECHNICAL_SINGLE_QUERY`: consulta tecnica avulsa por R$ 10,00.
- `TECHNICAL_MONTHLY`: assinatura tecnica mensal por R$ 30,00/mes.
- `TECHNICAL_ANNUAL`: assinatura anual por R$ 306,00/ano, com 15% de desconto
  sobre R$ 360,00.

O servico `evaluateQueryAccess` retorna se a consulta pode seguir, qual produto
e exigido, preco em centavos e mensagem para o usuario. Sem autenticacao real,
consultas tecnicas avancadas retornam estado de pagamento requerido.

## Stack inicial

- Next.js com App Router
- TypeScript
- Tailwind CSS
- ESLint
- Prisma
- PostgreSQL/Supabase preparado
- pgvector preparado para embeddings
- Estrutura `src/`

## Escopo atual

Implementado:

- Identidade visual PCM em navy/ciano para SaaS tecnico
- Design system simples com shell, cards, tabelas, badges, barras de uso,
  secoes, precificacao e ajuda
- Pagina inicial profissional
- Pagina de login visual
- Painel administrativo visual
- Painel do cliente visual
- Telas de assinaturas, financeiro, auditoria, documentos e exportacoes PDF
- Upload real de PDFs para Supabase Storage privado
- Pagina de chat tecnico visual
- Layout com navegacao
- Schema Prisma multiempresa e multiusuario
- Preparacao para chunks vetoriais com pgvector
- Classificacao inicial de perguntas por palavras-chave
- Estrutura de paywall para consulta tecnica avulsa e assinaturas
- Modelagem para tabelas tecnicas, abacos, regras tecnicas e feedback validado
- Base de previa para PDF tecnico e PDF explicativo para cliente
- `.env.example`

Ainda nao implementado:

- Autenticacao real
- IA, embeddings ou chamadas OpenAI
- Renderizacao real/download de PDF
- Processamento de documentos, extracao de texto, chunks e embeddings
- Pagamento real, checkout ou integracao Stripe

## Identidade visual e rotas

A interface foi redesenhada para a marca PCM Modesto Engenharia com fundo navy,
gradiente azul profundo, destaques em ciano, texto claro e acabamento tecnico
institucional.

Arquitetura de produto:

- Area publica: landing page, consulta gratuita basica, planos, ajuda e login.
- Area do cliente: dashboard pos-login, chat tecnico, historico, uso, PDFs e
  configuracoes.
- Area administrativa: painel interno para documentos, uploads, processamento,
  usuarios, assinaturas, financeiro, PDFs e logs.

Rotas publicas:

- `/`: home institucional com proposta de valor e beneficios.
- `/pricing`: planos gratuito, avulso, mensal e anual.
- `/help`: central de ajuda e limites da IA.
- `/login`: tela visual de login, criar conta, recuperar senha e Google futuro.

Rotas do cliente:

- `/dashboard`: painel do cliente.
- `/dashboard/chat`: chat tecnico autenticado/pago em modo mock.
- `/dashboard/usage`: uso mensal e anual.
- `/dashboard/history`: historico de consultas.
- `/dashboard/pdfs`: PDFs gerados pelo cliente.
- `/dashboard/settings`: configuracoes de conta e empresa.

Rotas administrativas:

- `/admin`: dashboard geral do sistema.
- `/admin/upload`: upload real de PDFs para o bucket privado.
- `/admin/documents`: acervo e processamento de documentos.
- `/admin/processing`: fila futura de extracao, chunks e embeddings.
- `/admin/users`: usuarios e clientes.
- `/admin/subscriptions`: assinaturas e uso contratado.
- `/admin/logs`: logs e auditoria.
- `/admin/finance`: financeiro, MRR, ARR e receitas estimadas.
- `/admin/pdf-exports`: exportacoes futuras de PDFs.

Os dados de dashboards, tabelas e planos ficam centralizados em
`src/features/dashboard/mock-data.ts`. Eles sao placeholders e nao representam
clientes reais.

O aviso institucional permanece obrigatorio em toda a aplicacao:

> Ferramenta independente. Nao e oficial, afiliada ou endossada pela Equatorial
> ou por concessionarias de energia.

## Autenticacao e controle de acesso

O sistema usa Supabase Auth para login com e-mail e senha. A sessao e lida no
servidor antes de renderizar areas protegidas.

Papeis:

- `ADMIN`: equipe PCM, unica autorizada a enviar normas e gerenciar a base.
- `MEMBER`: cliente/usuario final, autorizado a consultar chat, historico, uso
  e PDFs.

O cliente final nao envia documentos, nao ve upload, nao gerencia normas e nao
acessa documentos brutos da base normativa. A base de conhecimento e criada e
mantida pela PCM/admin.

Para definir administradores iniciais, configure no ambiente:

```bash
ADMIN_EMAILS="pcm.modestoengenharia@gmail.com"
```

Pode haver mais de um e-mail, separados por virgula. Quando um usuario logado
tem e-mail presente em `ADMIN_EMAILS`, ele e sincronizado no banco como
`User.role = ADMIN`. Demais usuarios sao sincronizados como `MEMBER`.

Protecao de rotas:

- Visitante publico acessa `/`, `/pricing`, `/help` e `/login`.
- `/dashboard/*` exige login.
- `/admin/*` exige login e papel `ADMIN`.
- Cliente tentando acessar `/admin/*` e redirecionado para `/dashboard`.
- Visitante tentando acessar area protegida e redirecionado para `/login`.
- `POST /api/documents/upload` valida sessao e papel `ADMIN`; caso contrario
  retorna `401` ou `403`.

Como testar local:

1. Configure Supabase Auth no projeto.
2. Configure `.env` com as variaveis Supabase, banco e `ADMIN_EMAILS`.
3. Rode `npm run dev`.
4. Crie/login com um e-mail que nao esta em `ADMIN_EMAILS`: deve ir para
   `/dashboard` e nao acessar `/admin`.
5. Crie/login com um e-mail em `ADMIN_EMAILS`: deve ir para `/admin` e acessar
   `/admin/upload`.

Como testar na Vercel:

1. Configure as mesmas variaveis em Project Settings > Environment Variables.
2. Inclua `ADMIN_EMAILS`.
3. Faca novo deploy.
4. Teste login de cliente e admin no dominio de producao.

## Como rodar

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Upload de PDFs

A tela `/admin/upload` envia PDFs reais para o bucket privado
`technical-documents` no Supabase Storage e cria registros iniciais no banco:

- `TechnicalDocument` com `scope = GLOBAL` e `status = DRAFT`;
- `DocumentVersion` com `status = DRAFT` e `processingStatus = PENDING`;
- metadados de bucket, nome original, MIME type e tamanho em bytes no JSON da
  versao.

Nesta etapa ainda nao ha autenticacao real. Por isso, uploads sao registrados
como documentos globais temporarios, sem `companyId` e sem usuario de upload.
Esse fluxo deve ser substituido por validacao de sessao e empresa antes de uso
multiempresa real.

Para testar:

1. Garanta que o bucket privado `technical-documents` exista no Supabase
   Storage.
2. Configure `.env` com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_DOCUMENTS_BUCKET`, `DATABASE_URL` e `DIRECT_URL`.
3. Rode `npm run dev` e acesse `http://localhost:3000/admin/upload`.
4. Preencha titulo, concessionaria, estado, tipo, versao e selecione um PDF de
   ate 50 MB.
5. Confirme o sucesso pela mensagem com ID do documento e, se necessario, pelo
   Supabase Storage/Prisma Studio.

O bucket permanece privado: a aplicacao nao gera URL publica e nao exibe
`storagePath` para o usuario comum.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run prisma:generate
npm run prisma:validate
npm run prisma:format
npm run prisma:migrate:dev
npm run prisma:db:push
npm run prisma:studio
npm run prisma:check
npm run seed:plans
```

## Modelagem de dados

O schema Prisma esta em `prisma/schema.prisma` e foi desenhado para suportar
RAG tecnico com rastreabilidade completa.

### Multiempresa e usuarios

- `User`: usuario da plataforma, preparado para vinculo futuro com Supabase Auth.
- `Company`: empresa cliente, com plano, estados atendidos e metadados.
- `CompanyMember`: vinculo entre usuario e empresa, com papeis como owner,
  admin, engineer, analyst e viewer.

### Normas tecnicas

- `TechnicalDocument`: documento tecnico principal. Pode pertencer a uma empresa
  ou ser uma base global/publica por meio de `scope`.
- `DocumentVersion`: versao processavel do documento, com nome de arquivo,
  status, storage futuro, checksum e informacoes de processamento.
- `DocumentPage`: texto extraido por pagina.
- `DocumentChunk`: trecho indexavel do documento, com texto, pagina, indice,
  metadados JSON e campo `embedding` preparado para pgvector.

Cada documento suporta:

- multiplas concessionarias pelo campo `concessionaire`;
- multiplos estados por `stateCodes`;
- diferentes tipos de norma por `documentType`;
- tags e metadados flexiveis em JSON.

Campos adicionais preparam classificacao normativa:

- `DocumentAudience`: cliente comum, tecnico ou ambos.
- `DocumentCategory`: baixa tensao, media tensao, subestacao, rede aerea,
  rede subterranea, EPD, EPE, tabela tecnica, abaco e outras categorias.

### Classificacao de perguntas e paywall

Os servicos em `src/features/rag/lib` fazem uma classificacao inicial simples,
sem IA:

- `classifyUserQuestion(question)`: retorna audiencia, complexidade, tipo de
  consulta, topicos detectados, tensao/estado/concessionaria quando possivel,
  se exige pagamento e contexto faltante.
- `detectMissingContext(classification)`: lista variaveis obrigatorias para
  consultas tecnicas, como concessionaria, estado, tensao, potencia/demanda,
  tipo de entrada, padrao aereo/subterraneo, vao, cabo/material e norma.
- `evaluateQueryAccess(params)`: aplica regras de acesso gratuito, credito
  avulso, plano mensal/anual ou acesso interno.

A classificacao atual usa palavras-chave. A assinatura das funcoes foi mantida
simples para permitir substituicao futura por IA ou classificador treinado.

### Tabelas, abacos e regras tecnicas

O schema possui estruturas preparadas para extracao supervisionada:

- `TechnicalTable`: tabela extraida de uma versao/pagina de documento.
- `TechnicalTableRow`: linhas normalizadas em JSON para consultas futuras.
- `TechnicalAbacus`: abacos e referencias graficas/textuais extraidas.
- `TechnicalRule`: regra tecnica estruturada, com condicoes e resultados em
  JSON, fonte normativa e status de validacao.

Essas tabelas foram criadas para perguntas como cabo de subestacao de 300 kVA,
estrutura para angulo e cabo especifico, material padronizado e criterio de
tabela por concessionaria/estado.

### RAG e citacoes

- `RagQuestion`: pergunta feita por usuario, empresa e, opcionalmente, documento.
- `RagAnswer`: resposta gerada, com modelo, tokens e latencia futuros.
- `RagAnswerSource`: fontes usadas na resposta. Guarda chunk, pagina, indice,
titulo do documento, trecho citado e score de relevancia.

Essa estrutura permite auditar exatamente quais chunks sustentaram cada resposta.

`NormativeAnswerPayload` em `src/features/rag/lib/answer-types.ts` define o
contrato futuro da resposta rastreavel, incluindo fontes usadas, calculos,
tabelas, abacos, contexto faltante, limitacoes, disclaimer e confianca.

### Feedback supervisionado

- `AnswerFeedback`: nota, tipo de feedback, comentario e correcao sugerida.
- `ValidatedAnswer`: resposta validada por especialista, com padrao de pergunta,
  payload JSON e fontes.

O sistema nao deve aprender automaticamente com qualquer usuario. A evolucao da
base deve passar por revisao e validacao supervisionada.

### Planos e auditoria

- `PlanUsage`: contabiliza metricas por empresa, plano e periodo, como perguntas
  RAG, uploads, paginas, chunks, storage e tokens.
- `AuditLog`: registra acoes importantes por usuario, empresa, entidade e
  metadados de contexto.

## pgvector

O campo vetorial esta preparado assim:

```prisma
embedding Unsupported("vector(1536)")?
```

Na etapa de banco real, habilite a extensao no PostgreSQL/Supabase:

```sql
create extension if not exists vector;
```

Depois, crie indices vetoriais em migration SQL conforme a estrategia escolhida,
por exemplo `ivfflat` ou `hnsw`.

Leia `prisma/SETUP_SUPABASE.md` para configurar `DATABASE_URL`, `DIRECT_URL`,
pooler da Supabase, Vercel e migrations com seguranca.

## Geracao de PDF da resposta RAG

A base da funcionalidade de PDF esta preparada em `src/features/rag-pdf`.
Nesta etapa o projeto renderiza previas HTML/React, sem gerar arquivo PDF real e
sem usar IA ou imagens.

Rotas de previa:

```bash
/pdf-preview/technical
/pdf-preview/client
```

Tambem existe uma rota server-side preparada:

```bash
POST /api/rag-pdf
```

Ela recebe `question`, `answer`, `kind` e `sources`, monta o payload
estruturado e retorna status `preview-only`. A renderizacao real podera ser
conectada depois com Playwright ou Puppeteer no servidor.

Modulos principais:

- `types.ts`: contratos `RagPdfKind`, `RagPdfSource`, `RagPdfSection`,
  `RagPdfPayload` e `RagPdfGenerationResult`.
- `classifier.ts`: sugestao simples por palavras-chave entre PDF tecnico e PDF
  para cliente.
- `build-payload.ts`: estrutura a resposta, fontes, secoes, checklist e
  disclaimers.
- `generate-pdf.ts`: abstracao para geracao futura.
- `future-integration.ts`: stubs para `RagAnswer`, `RagAnswerSource`,
  `DocumentChunk`, `AuditLog` e `PlanUsage`.

Disclaimers obrigatorios sao exibidos em todos os templates. A interface deixa
claro que os dados atuais sao demonstrativos enquanto o RAG real nao estiver
conectado.

## Regras anti-alucinacao

As regras futuras estao em
`src/features/rag/rules/normative-answer-rules.ts`:

- nunca inventar cabo, estrutura, item, tabela, pagina ou valor;
- se nao houver fonte suficiente, dizer que a base documental e insuficiente;
- sempre citar documento, pagina e trecho em respostas tecnicas;
- diferenciar resposta para leigo e resposta tecnica;
- perguntar contexto faltante quando necessario;
- nao definir cabo, estrutura ou material apenas por calculo isolado;
- cruzar calculos com tabela normativa, abaco ou regra tecnica estruturada.

Exemplo: para subestacao de 300 kVA, o sistema pode calcular corrente por
`I = S / (raiz(3) x V)`, mas nunca deve definir cabo apenas por esse calculo.
Deve cruzar com tabela normativa. Se a tabela nao existir na base, deve informar
que a base e insuficiente.

## Fluxo futuro de RAG normativo

1. Upload do PDF.
2. Extracao de texto por pagina.
3. Deteccao de sumario, itens, tabelas e abacos.
4. Geracao de `DocumentPage`.
5. Geracao de `DocumentChunk`.
6. Extracao de `TechnicalTable`.
7. Extracao de `TechnicalTableRow`.
8. Extracao de `TechnicalAbacus`.
9. Criacao supervisionada de `TechnicalRule`.
10. Geracao de embeddings.
11. Busca hibrida: semantica, keyword, metadados, tabela e regra tecnica.
12. Resposta com fontes.
13. Feedback do usuario.
14. Validacao por especialista.
15. Base de respostas validadas.

## Seeds de planos

Apos aplicar a migration que cria `ProductPlan`, execute:

```bash
npm run seed:plans
```

O seed insere/atualiza `FREE_BT`, `TECHNICAL_SINGLE_QUERY`,
`TECHNICAL_MONTHLY` e `TECHNICAL_ANNUAL`.

## Proximos passos sugeridos

1. Conectar Supabase Auth.
2. Aplicar migrations Prisma em PostgreSQL/Supabase.
3. Criar migrations SQL especificas para pgvector e indices vetoriais.
4. Implementar upload de PDF para storage.
5. Criar pipeline de extracao, chunking e embeddings.
6. Implementar respostas RAG com fonte, pagina e trecho utilizado.
