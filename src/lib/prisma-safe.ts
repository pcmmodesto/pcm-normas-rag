export async function safePrisma<T>(
  operation: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error("[safePrisma] Falling back after database runtime error.", {
      code: getErrorCode(error),
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return fallback;
  }
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
