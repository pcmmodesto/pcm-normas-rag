import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        redirectTo: "/login",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
    },
    redirectTo: currentUser.role === "ADMIN" ? "/admin" : "/dashboard",
  });
}
