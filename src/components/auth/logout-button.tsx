"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton({ variant = "light" }: { variant?: "light" | "dark" }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      className={
        variant === "dark"
          ? "rounded-xl border border-white/15 px-3 py-2.5 text-sm font-medium text-[#CBD5E1] transition hover:bg-white/10 hover:text-white"
          : "rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-[#E0F2FE] hover:text-[#0F172A]"
      }
      disabled={isLoggingOut}
      onClick={handleLogout}
      type="button"
    >
      {isLoggingOut ? "Saindo..." : "Sair"}
    </button>
  );
}
