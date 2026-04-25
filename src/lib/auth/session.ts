import type { User as SupabaseUser } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isConfiguredAdminEmail } from "./admin-emails";

export type AppUserRole = "ADMIN" | "CUSTOMER";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: AppUserRole;
  supabaseUser: SupabaseUser;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  return syncUserFromSupabase(user);
}

export async function getCurrentUserRole() {
  const currentUser = await getCurrentUser();
  return currentUser?.role ?? null;
}

export async function requireAuth() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return currentUser;
}

export async function requireAdmin() {
  const currentUser = await requireAuth();

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return currentUser;
}

export async function requireCustomer() {
  return requireAuth();
}

export async function syncUserFromSupabase(
  supabaseUser: SupabaseUser,
): Promise<CurrentUser | null> {
  if (!supabaseUser.email) {
    return null;
  }

  const email = supabaseUser.email.toLowerCase();
  const isAdmin = isConfiguredAdminEmail(email);
  const role = isAdmin ? "ADMIN" : "MEMBER";
  const name =
    typeof supabaseUser.user_metadata?.name === "string"
      ? supabaseUser.user_metadata.name
      : null;

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        externalAuthId: supabaseUser.id,
        role,
        name,
        isActive: true,
        lastLoginAt: new Date(),
      },
      create: {
        email,
        externalAuthId: supabaseUser.id,
        role,
        name,
        isActive: true,
        lastLoginAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role === "ADMIN" ? "ADMIN" : "CUSTOMER",
      supabaseUser,
    };
  } catch (error) {
    console.error("[auth] User sync failed; continuing with Supabase session.", {
      email,
      errorName: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      id: supabaseUser.id,
      email,
      name,
      role: isAdmin ? "ADMIN" : "CUSTOMER",
      supabaseUser,
    };
  }
}
