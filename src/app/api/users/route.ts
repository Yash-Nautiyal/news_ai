import { NextResponse } from "next/server";
import { getUsersFromSupabase } from "@/lib/supabase/reference";
import type { User } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getUsersFromSupabase();
    const users: User[] = rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role as User["role"],
      is_active: r.is_active,
    }));
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load users." },
      { status: 500 },
    );
  }
}
