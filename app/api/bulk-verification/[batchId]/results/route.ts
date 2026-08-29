import { type NextRequest } from "next/server"
import { proxyToDjango } from "@/lib/proxy"

const BULK_RESULTS_ENDPOINT_PREFIX = process.env.DJANGO_BULK_RESULTS_ENDPOINT_PREFIX || "/api/certificates/bulk/results/"

export async function GET(request: NextRequest, { params }: { params: { batchId: string } }) {
  return proxyToDjango(request, {
    djangoPath: `${BULK_RESULTS_ENDPOINT_PREFIX}${params.batchId}/`,
    method: "GET",
    requireAuth: true,
  })
}
