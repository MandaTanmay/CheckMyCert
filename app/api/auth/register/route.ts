import { type NextRequest, NextResponse } from "next/server"
import { djangoRequest, setAuthCookies } from "@/lib/proxy"

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || ""
  const text = await response.text()

  if (!text) {
    return {}
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text)
    } catch {
      return { error: "Invalid JSON from Django backend", raw: text }
    }
  }

  return { error: "Non-JSON response from Django backend", raw: text }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const response = await djangoRequest("/api/auth/register/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
    })

    const payload = await parseResponsePayload(response)
    if (!response.ok) {
      return NextResponse.json(payload, { status: response.status })
    }

    const access = (payload as any)?.tokens?.access
    const refresh = (payload as any)?.tokens?.refresh
    if (!access || !refresh) {
      return NextResponse.json({ error: "Django register response missing tokens" }, { status: 502 })
    }

    const result = NextResponse.json(payload, { status: response.status })
    setAuthCookies(result, access, refresh)
    return result
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to reach Django backend",
        details: error instanceof Error ? error.message : "Unknown network error",
      },
      { status: 502 },
    )
  }
}
