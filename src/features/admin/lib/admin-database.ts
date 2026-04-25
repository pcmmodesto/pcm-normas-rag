import { prisma } from "@/lib/prisma";

export type AdminQueryResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      data: T;
      errorCode: string;
      errorName: string;
    };

export async function adminQuery<T>(
  label: string,
  operation: () => Promise<T>,
  fallback: T,
): Promise<AdminQueryResult<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    console.error("[admin-db]", {
      label,
      errorCode: getErrorCode(error),
      errorName: error instanceof Error ? error.name : typeof error,
    });

    return {
      ok: false,
      data: fallback,
      errorCode: getErrorCode(error),
      errorName: error instanceof Error ? error.name : typeof error,
    };
  }
}

export async function countTable(tableName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number | string }>>(
    `select count(*)::bigint as count from ${tableName}`,
  );

  return Number(rows[0]?.count ?? 0);
}

function getErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return "UNKNOWN";
}
