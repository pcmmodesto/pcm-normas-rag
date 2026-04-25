const requiredRuntimeEnv = [
  "DATABASE_URL",
  "DIRECT_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DOCUMENTS_BUCKET",
] as const;

export type RuntimeEnvDiagnostics = {
  variables: Record<(typeof requiredRuntimeEnv)[number], "present" | "missing">;
  databaseProjectRef?: string;
  supabaseProjectRef?: string;
  bucket?: string;
  sameProjectHint: boolean | null;
};

export function getRuntimeEnvDiagnostics(): RuntimeEnvDiagnostics {
  const variables = Object.fromEntries(
    requiredRuntimeEnv.map((key) => [
      key,
      process.env[key] ? "present" : "missing",
    ]),
  ) as RuntimeEnvDiagnostics["variables"];

  const databaseProjectRef = getDatabaseProjectRef(process.env.DATABASE_URL);
  const supabaseProjectRef = getSupabaseProjectRef(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const sameProjectHint =
    databaseProjectRef && supabaseProjectRef
      ? databaseProjectRef === supabaseProjectRef
      : null;

  return {
    variables,
    databaseProjectRef,
    supabaseProjectRef,
    bucket: process.env.SUPABASE_DOCUMENTS_BUCKET,
    sameProjectHint,
  };
}

export function logRuntimeEnvDiagnostics(scope: string) {
  const diagnostics = getRuntimeEnvDiagnostics();

  console.info("[runtime-diagnostics]", {
    scope,
    variables: diagnostics.variables,
    databaseProjectRef: diagnostics.databaseProjectRef ?? "unknown",
    supabaseProjectRef: diagnostics.supabaseProjectRef ?? "unknown",
    bucket: diagnostics.bucket ? "present" : "missing",
    sameProjectHint: diagnostics.sameProjectHint,
  });

  return diagnostics;
}

function getSupabaseProjectRef(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const hostname = new URL(value).hostname;
    const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

function getDatabaseProjectRef(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    const poolerUserMatch = decodeURIComponent(url.username).match(
      /^postgres\.([a-z0-9]+)$/i,
    );

    if (poolerUserMatch?.[1]) {
      return poolerUserMatch[1].toLowerCase();
    }

    const directHostMatch = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (directHostMatch?.[1]) {
      return directHostMatch[1].toLowerCase();
    }

    return undefined;
  } catch {
    return undefined;
  }
}
