import { NextResponse } from "next/server";

import { validateSupabaseConnection } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await validateSupabaseConnection();

  return NextResponse.json(result, { status: result.status });
}