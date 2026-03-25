import { type NextRequest, NextResponse } from "next/server"
import { proxyToDjango } from "@/lib/proxy"

export async function GET(request: NextRequest) {
  return proxyToDjango(request, {
    djangoPath: "/api/auth/me/",
    method: "GET",
    requireAuth: true,
  })
}
