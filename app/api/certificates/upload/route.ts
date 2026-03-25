import { type NextRequest } from "next/server"
import { proxyToDjango } from "@/lib/proxy"

export async function POST(request: NextRequest) {
  const formData = await request.formData()

  return proxyToDjango(request, {
    djangoPath: "/api/certificates/upload/",
    method: "POST",
    body: formData,
    requireAuth: true,
  })
}
