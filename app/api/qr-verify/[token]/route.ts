import { type NextRequest } from "next/server"
import { proxyToDjango } from "@/lib/proxy"

const QR_VERIFY_ENDPOINT_PREFIX = process.env.DJANGO_QR_VERIFY_ENDPOINT_PREFIX || "/api/verify/"

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  return proxyToDjango(request, {
    djangoPath: `${QR_VERIFY_ENDPOINT_PREFIX}${params.token}/`,
    method: "GET",
    requireAuth: false,
  })
}
