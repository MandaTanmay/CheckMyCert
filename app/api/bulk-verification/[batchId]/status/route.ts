import { type NextRequest } from "next/server"
import { proxyToDjango } from "@/lib/proxy"

export async function GET(request: NextRequest, { params }: { params: { batchId: string } }) {
  return proxyToDjango(request, {
    djangoPath: `/api/certificates/bulk/status/${params.batchId}/`,
    method: "GET",
    requireAuth: true,
  })
}
