import { type NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    {
      error: "Local image snapshots have been removed. Load artifact data from Django-managed storage.",
      id: params.id,
    },
    { status: 410 },
  )
}