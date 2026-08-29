import { type NextRequest } from "next/server"
import { proxyToDjango } from "@/lib/proxy"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return proxyToDjango(request, {
    djangoPath: `/api/certificates/result/${params.id}/`,
    method: "GET",
    requireAuth: true,
  })
}
