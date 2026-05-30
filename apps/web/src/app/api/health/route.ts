import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({
    service: "ids-web",
    status: "ok",
    mode: "development",
  });
}
