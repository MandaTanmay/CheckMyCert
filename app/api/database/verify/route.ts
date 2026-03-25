import { type NextRequest } from "next/server"
import { proxyToDjango } from "@/lib/proxy"

const DATABASE_VERIFY_ENDPOINT = process.env.DJANGO_DATABASE_VERIFY_ENDPOINT || "/api/verification/database/verify/"

export async function POST(request: NextRequest) {
  const body = await request.text()
  return proxyToDjango(request, {
    djangoPath: DATABASE_VERIFY_ENDPOINT,
    method: "POST",
    body,
    requireAuth: true,
    headers: { "Content-Type": "application/json" },
  })
}

export async function GET(request: NextRequest) {
  return proxyToDjango(request, {
    djangoPath: DATABASE_VERIFY_ENDPOINT,
    method: "GET",
    requireAuth: true,
  })
}
