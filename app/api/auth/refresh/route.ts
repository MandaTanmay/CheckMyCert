import { type NextRequest, NextResponse } from "next/server"
import { DJANGO_REFRESH_COOKIE, clearAuthCookies, djangoRequest, setAuthCookies } from "@/lib/proxy"

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
  const refreshToken = request.cookies.get(DJANGO_REFRESH_COOKIE)?.value
  if (!refreshToken) {
    return NextResponse.json({ error: "Refresh token missing" }, { status: 401 })
  }

  try {
    const response = await djangoRequest("/api/auth/refresh/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    const payload = await parseResponsePayload(response)
    if (!response.ok || !(payload as any)?.access) {
      const errorResponse = NextResponse.json(payload, { status: response.status || 401 })
      clearAuthCookies(errorResponse)
      return errorResponse
    }

    const result = NextResponse.json(payload, { status: 200 })
    setAuthCookies(result, (payload as any).access, refreshToken)
    return result
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to refresh Django token",
        details: error instanceof Error ? error.message : "Unknown network error",
      },
      { status: 502 },
    )
  }
}
