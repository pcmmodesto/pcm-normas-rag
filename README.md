# PCM Normas RAG

Base inicial em Next.js para um aplicativo RAG de consulta inteligente de normas técnicas de concessionárias de energia.

O produto é uma ferramenta independente. Não é oficial, afiliado ou endossado pela Equatorial ou por qualquer concessionária.

## Stack inicial

- Next.js com App Router
- TypeScript
- Tailwind CSS
- ESLint
- Estrutura `src/`
- Preparação futura para Supabase, Prisma, PostgreSQL com pgvector e OpenAI

## Escopo desta etapa

Implementado:

- Página inicial profissional
- Página de login visual
- Painel administrativo visual
- Página de upload de normas visual
- Página de chat técnico visual
- Layout com navegação
- `.env.example`
- Diretório `prisma/` reservado

Ainda não implementado:

- Banco de dados
- Autenticação real
- IA ou embeddings
- Upload real de PDFs
- Processamento de documentos

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
```

## Próximos passos sugeridos

1. Conectar Supabase Auth.
2. Criar schema Prisma para normas, páginas, chunks e citações.
3. Habilitar PostgreSQL com pgvector.
4. Implementar upload de PDF para storage.
5. Criar pipeline de extração, chunking e embeddings.
6. Implementar respostas RAG com fonte, página e trecho utilizado.
