# Prisma e pgvector

Este diretorio contem a modelagem de dados planejada para PostgreSQL/Supabase.

Nesta etapa nao ha conexao ativa com Supabase, migrations aplicadas ou pipeline
de IA. O schema apenas prepara as entidades e relacionamentos que o RAG usara.

## pgvector

O campo `DocumentChunk.embedding` esta modelado como:

```prisma
embedding Unsupported("vector(1536)")?
```

Isso permite gerar migrations para PostgreSQL com a extensao `pgvector`, mantendo
o Prisma Client protegido enquanto a camada de busca vetorial ainda nao existe.
Quando o banco for conectado, sera necessario habilitar a extensao no Supabase.
O projeto ja inclui uma migration manual inicial em
`prisma/migrations/000001_enable_pgvector/migration.sql`:

```sql
create extension if not exists vector;
```

Tambem sera recomendado criar indice vetorial manualmente em migration SQL,
por exemplo com `ivfflat` ou `hnsw`, conforme o volume de chunks.

Leia `prisma/SETUP_SUPABASE.md` antes de aplicar migrations em um banco real.
