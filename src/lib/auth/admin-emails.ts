export function getConfiguredAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isConfiguredAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getConfiguredAdminEmails().has(email.toLowerCase());
}
