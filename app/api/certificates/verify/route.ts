import { type NextRequest } from "next/server"
import { proxyToDjango } from "@/lib/proxy"

const VERIFY_ENDPOINT = process.env.DJANGO_CERTIFICATE_VERIFY_ENDPOINT || "/api/certificates/verify/"

export async function POST(request: NextRequest) {
  const body = await request.text()
  return proxyToDjango(request, {
    djangoPath: VERIFY_ENDPOINT,
    method: "POST",
    body,
    requireAuth: false,
    headers: { "Content-Type": "application/json" },
  })
}

export async function GET(request: NextRequest) {
  const query = new URL(request.url).search
  return proxyToDjango(request, {
    djangoPath: `${VERIFY_ENDPOINT}${query}`,
    method: "GET",
    requireAuth: false,
  })
}