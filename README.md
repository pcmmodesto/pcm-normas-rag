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
- Pagina de upload de normas visual
- Pagina de chat tecnico visual
- Layout com navegacao
- Schema Prisma multiempresa e multiusuario
- Preparacao para chunks vetoriais com pgvector
- `.env.example`

Ainda nao implementado:

- Banco de dados conectado
- Autenticacao real
- IA, embeddings ou chamadas OpenAI
- Upload real de PDFs
- Processamento de documentos
- Migrations aplicadas em Supabase/PostgreSQL

## Como rodar

```bash
npm run dev
```

Acesse `http://localhost:3000`.

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
npm run prisma:studio
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

## Proximos passos sugeridos

1. Conectar Supabase Auth.
2. Aplicar migrations Prisma em PostgreSQL/Supabase.
3. Criar migrations SQL especificas para pgvector e indices vetoriais.
4. Implementar upload de PDF para storage.
5. Criar pipeline de extracao, chunking e embeddings.
6. Implementar respostas RAG com fonte, pagina e trecho utilizado.
