import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined. Create a local .env first.");
  }

  const [databaseCheck] = await prisma.$queryRaw`
    select
      current_database() as database_name,
      current_schema() as schema_name,
      version() as postgres_version
  `;

  const [vectorCheck] = await prisma.$queryRaw`
    select exists (
      select 1
      from pg_extension
      where extname = 'vector'
    ) as vector_enabled
  `;

  console.log("Prisma connection OK");
  console.table({
    database: databaseCheck.database_name,
    schema: databaseCheck.schema_name,
    vectorEnabled: Boolean(vectorCheck.vector_enabled),
  });
}

main()
  .catch((error) => {
    console.error("Prisma connection check failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
