import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// IMPORTANT — Vercel / Supabase connection pool:
// DATABASE_URL must use the Supabase Transaction-mode pooler (port 6543) for serverless.
// Example: postgresql://postgres.xxx:password@aws-0-xx.pooler.supabase.com:6543/postgres?pgbouncer=true
// Do NOT use the direct connection (port 5432) at runtime — it causes MaxClientsInSessionMode.
// DIRECT_URL (port 5432) should only be set for "prisma migrate" — not for runtime.

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString = process.env.DATABASE_URL;

function createPrismaClient() {
  if (!connectionString) {
    return createUnavailablePrismaClient(
      "DATABASE_URL is required to initialize Prisma.",
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
  });
}

function createUnavailablePrismaClient(message: string) {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(message);
      },
    },
  ) as PrismaClient;
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
