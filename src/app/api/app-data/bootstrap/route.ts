import { NextResponse } from "next/server";

import { getBootstrapData } from "@/lib/repositories/app-data.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getBootstrapData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar la informacion inicial.",
      },
      { status: 500 }
    );
  }
}
