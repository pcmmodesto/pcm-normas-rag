export async function safePrisma<T>(
  operation: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isKnownPrismaRuntimeError(error)) {
      console.error("[safePrisma] Falling back after Prisma runtime error.", {
        code: (error as { code?: string }).code,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return fallback;
    }

    throw error;
  }
}

function isKnownPrismaRuntimeError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    ((error as { code: string }).code.startsWith("P") ||
      (error as { code: string }).code === "DRIVER_ADAPTER_ERROR")
  );
}
