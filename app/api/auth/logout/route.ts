import { type NextRequest, NextResponse } from "next/server"
import { clearAuthCookies } from "@/lib/proxy"

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: "Logged out" }, { status: 200 })
  clearAuthCookies(response)
  return response
}
