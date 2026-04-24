# Setup Supabase, PostgreSQL e pgvector

Este guia prepara o banco real para o PCM Normas RAG. Nesta etapa o app ainda
nao implementa IA, upload real ou chat RAG funcional.

## 1. Variaveis de ambiente

Copie `.env.example` para `.env` e preencha apenas com chaves reais no ambiente
local ou no painel da Vercel. Nunca commite `.env`.

Variaveis principais:

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave anon/publica para uso com RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: chave privilegiada apenas para servidor.
- `DATABASE_URL`: URL usada pelo Prisma Client em runtime.
- `DIRECT_URL`: URL direta usada por migrations e operacoes administrativas.
- `SHADOW_DATABASE_URL`: banco shadow para `prisma migrate dev`, quando usado.

## 2. Onde pegar a DATABASE_URL no Supabase

No painel do Supabase:

1. Abra o projeto.
2. Entre em Project Settings.
3. Abra Database.
4. Veja Connection string.
5. Escolha a string PostgreSQL adequada e substitua a senha.

O formato direto costuma ser:

```text
postgresql://postgres:[SENHA]@db.[PROJECT_REF].supabase.co:5432/postgres?schema=public
```

O formato pooler costuma usar o host do pooler e uma porta diferente:

```text
postgresql://postgres.[PROJECT_REF]:[SENHA]@[POOLER_HOST]:6543/postgres?pgbouncer=true&connection_limit=1&schema=public
```

Use os valores exibidos no seu painel, nao estes placeholders.

## 3. Connection string direta vs pooler

Connection string direta:

- Melhor para desenvolvimento local.
- Melhor para migrations.
- Necessaria para algumas operacoes administrativas.
- Deve ficar em `DIRECT_URL`.

Pooler:

- Melhor para ambientes serverless como Vercel.
- Reduz risco de excesso de conexoes simultaneas.
- Deve ficar em `DATABASE_URL` na Vercel.
- Nao e a opcao ideal para migrations.

Recomendacao:

- Local: `DATABASE_URL` e `DIRECT_URL` podem apontar para a URL direta.
- Vercel runtime: `DATABASE_URL` deve usar o pooler.
- CI/migrations: use URL direta em `DIRECT_URL` ou rode migrations localmente
  com a connection string direta.

## 4. Ativar pgvector no Supabase

No SQL Editor do Supabase, rode:

```sql
create extension if not exists vector;
```

Tambem existe a area Database > Extensions em muitos projetos Supabase. Ative a
extensao `vector` por la se preferir.

O projeto inclui a migration:

```text
prisma/migrations/000001_enable_pgvector/migration.sql
```

Ela roda o mesmo `create extension if not exists vector;` antes das tabelas que
usarao `vector(1536)`.

## 5. Limite atual do Prisma com pgvector

O Prisma ainda nao modela pgvector como tipo escalar completo. Por isso o campo
de embedding esta assim:

```prisma
embedding Unsupported("vector(1536)")?
```

Essa e a abordagem correta para manter o schema Prisma valido e permitir que o
PostgreSQL crie a coluna vetorial. Consultas de similaridade e indices vetoriais
deverao ser criados com SQL manual ou queries raw quando a etapa RAG for
implementada.

Indice vetorial futuro, exemplo:

```sql
create index document_chunks_embedding_hnsw_idx
on document_chunks
using hnsw (embedding vector_cosine_ops);
```

Crie esse indice apenas depois de confirmar volume de dados, dimensao do modelo
de embedding e estrategia de busca.

## 6. Rodar migrations

Antes de rodar migrations:

1. Confirme que `.env` existe.
2. Confirme que `DATABASE_URL` aponta para o banco correto.
3. Confirme que `DIRECT_URL` aponta para a URL direta, se usada no processo.
4. Confirme que nao ha segredos reais em arquivos versionados.

Comandos:

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:dev
```

Se voce ainda nao quiser criar migration versionada e estiver em um banco de
desenvolvimento descartavel, pode usar:

```bash
npm run prisma:db:push
```

Para este projeto, prefira migrations quando o banco for persistente.

## 7. Teste de conexao

Depois de preencher `.env`, rode:

```bash
npm run prisma:check
```

O script executa `select current_database()`, `current_schema()` e verifica se a
extensao `vector` esta ativa. Ele nao depende de dados reais e nao cria tabelas.
