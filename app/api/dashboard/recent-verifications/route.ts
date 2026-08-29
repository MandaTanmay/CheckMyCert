import { type NextRequest } from "next/server"
import { proxyToDjango } from "@/lib/proxy"

export async function GET(request: NextRequest) {
  const query = new URL(request.url).search
  return proxyToDjango(request, {
    djangoPath: `/api/certificates/results/${query}`,
    method: "GET",
    requireAuth: true,
  })
}
