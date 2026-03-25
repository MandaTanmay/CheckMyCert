import { type NextRequest } from "next/server"
import { proxyToDjango } from "@/lib/proxy"

export async function GET(request: NextRequest) {
  return proxyToDjango(request, {
    djangoPath: "/api/certificates/dashboard/stats/",
    method: "GET",
    requireAuth: true,
  })
}
