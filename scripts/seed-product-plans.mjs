import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const plans = [
  {
    code: "FREE_BT",
    name: "Consultas basicas gratuitas",
    description: "Perguntas basicas de baixa tensao, atendimento e ligacao nova.",
    billingProduct: "FREE_BT",
    priceCents: 0,
    currency: "BRL",
    interval: "NONE",
    queryLimitMonthly: null,
  },
  {
    code: "TECHNICAL_SINGLE_QUERY",
    name: "Consulta tecnica avulsa",
    description: "Uma consulta tecnica avancada com rastreabilidade normativa.",
    billingProduct: "TECHNICAL_SINGLE_QUERY",
    priceCents: 1000,
    currency: "BRL",
    interval: "SINGLE",
    queryLimitMonthly: 1,
  },
  {
    code: "TECHNICAL_MONTHLY",
    name: "Plano tecnico mensal",
    description: "Assinatura mensal para consultas tecnicas dentro dos limites do plano.",
    billingProduct: "TECHNICAL_MONTHLY",
    priceCents: 3000,
    currency: "BRL",
    interval: "MONTH",
    queryLimitMonthly: 100,
  },
  {
    code: "TECHNICAL_ANNUAL",
    name: "Plano tecnico anual",
    description: "Assinatura anual com 15% de desconto sobre o plano mensal anualizado.",
    billingProduct: "TECHNICAL_ANNUAL",
    priceCents: 30600,
    currency: "BRL",
    interval: "YEAR",
    queryLimitMonthly: 100,
  },
];

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed product plans.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

for (const plan of plans) {
  await prisma.productPlan.upsert({
    where: { code: plan.code },
    create: {
      ...plan,
      isActive: true,
      metadata: {
        seededBy: "seed-product-plans",
      },
    },
    update: {
      name: plan.name,
      description: plan.description,
      billingProduct: plan.billingProduct,
      priceCents: plan.priceCents,
      currency: plan.currency,
      interval: plan.interval,
      queryLimitMonthly: plan.queryLimitMonthly,
      isActive: true,
    },
  });
}

await prisma.$disconnect();

console.log("Product plans seeded.");
