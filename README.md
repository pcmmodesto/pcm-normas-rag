# PCM Normas RAG

Base inicial em Next.js para um aplicativo RAG de consulta inteligente de normas
tecnicas de concessionarias de energia.

O produto e uma ferramenta independente. Nao e oficial, afiliado ou endossado
pela Equatorial ou por qualquer concessionaria.

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

- Pagina inicial profissional
- Pagina de login visual
- Painel administrativo visual
- Upload real de PDFs para Supabase Storage privado
- Pagina de chat tecnico visual
- Layout com navegacao
- Schema Prisma multiempresa e multiusuario
- Preparacao para chunks vetoriais com pgvector
- Base de previa para PDF tecnico e PDF explicativo para cliente
- `.env.example`

Ainda nao implementado:

- Autenticacao real
- IA, embeddings ou chamadas OpenAI
- Renderizacao real/download de PDF
- Processamento de documentos, extracao de texto, chunks e embeddings

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

### RAG e citacoes

- `RagQuestion`: pergunta feita por usuario, empresa e, opcionalmente, documento.
- `RagAnswer`: resposta gerada, com modelo, tokens e latencia futuros.
- `RagAnswerSource`: fontes usadas na resposta. Guarda chunk, pagina, indice,
  titulo do documento, trecho citado e score de relevancia.

Essa estrutura permite auditar exatamente quais chunks sustentaram cada resposta.

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

## Proximos passos sugeridos

1. Conectar Supabase Auth.
2. Aplicar migrations Prisma em PostgreSQL/Supabase.
3. Criar migrations SQL especificas para pgvector e indices vetoriais.
4. Implementar upload de PDF para storage.
5. Criar pipeline de extracao, chunking e embeddings.
6. Implementar respostas RAG com fonte, pagina e trecho utilizado.
