import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: "Local verification snapshot storage has been removed. Query Django verification endpoints instead.",
    },
    { status: 410 },
  )
}