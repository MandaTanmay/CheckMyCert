import { type NextRequest, NextResponse } from "next/server"

export const DJANGO_ACCESS_COOKIE = "django_access_token"
export const DJANGO_REFRESH_COOKIE = "django_refresh_token"

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7

interface ProxyOptions {
  djangoPath: string
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: BodyInit | null
  requireAuth?: boolean
  headers?: Record<string, string>
}

interface DjangoErrorPayload {
  message: string
  status: number
  body: unknown
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "")
}

function getDjangoBaseUrls(): string[] {
  const configured = [process.env.DJANGO_BASE_URL, process.env.NEXT_PUBLIC_API_URL]
    .filter((value): value is string => Boolean(value))
    .map(normalizeUrl)

  const fallbacks = ["http://localhost:8000", "http://127.0.0.1:8000", "http://backend:8000"]
  const all = [...configured, ...fallbacks]

  return all.filter((url, index) => all.indexOf(url) === index)
}

export async function djangoRequest(path: string, init?: RequestInit): Promise<Response> {
  const baseUrls = getDjangoBaseUrls()
  let lastError: unknown = null

  for (const baseUrl of baseUrls) {
    const djangoUrl = `${baseUrl}${path}`
    try {
      return await fetch(djangoUrl, {
        ...init,
        cache: "no-store",
      })
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(
    `Failed to reach Django backend using URLs: ${baseUrls.join(", ")}. Last error: ${lastError instanceof Error ? lastError.message : "Unknown network error"}`,
  )
}

function getBearerTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }
  return authHeader.slice(7)
}

function setTokenCookies(response: NextResponse, access: string, refresh?: string) {
  const secure = process.env.NODE_ENV === "production"

  response.cookies.set(DJANGO_ACCESS_COOKIE, access, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  })

  if (refresh) {
    response.cookies.set(DJANGO_REFRESH_COOKIE, refresh, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
    })
  }
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(DJANGO_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  })
  response.cookies.set(DJANGO_REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  })
}

async function responseToNext(response: Response): Promise<NextResponse> {
  const contentType = response.headers.get("content-type") || ""
  const text = await response.text()

  if (!text) {
    return new NextResponse(null, { status: response.status })
  }

  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(text)
      return NextResponse.json(parsed, { status: response.status })
    } catch {
      return new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": contentType || "text/plain" },
      })
    }
  }

  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": contentType || "text/plain" },
  })
}

async function refreshAccessToken(request: NextRequest, refreshToken: string, staleAccessToken: string | null): Promise<string | null> {
  const response = await djangoRequest("/api/auth/refresh/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${staleAccessToken || refreshToken}`,
    },
    body: JSON.stringify({ refresh: refreshToken }),
  })

  if (!response.ok) {
    return null
  }

  const body = (await response.json()) as { access?: string }
  return body.access || null
}

function buildDjangoHeaders(request: NextRequest, accessToken: string | null, body: BodyInit | null | undefined, extraHeaders?: Record<string, string>): Headers {
  const headers = new Headers()

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`)
  }

  const accept = request.headers.get("accept")
  if (accept) {
    headers.set("Accept", accept)
  } else {
    headers.set("Accept", "application/json")
  }

  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  if (extraHeaders) {
    Object.entries(extraHeaders).forEach(([key, value]) => {
      headers.set(key, value)
    })
  }

  return headers
}

async function parseDjangoError(response: Response): Promise<DjangoErrorPayload> {
  const contentType = response.headers.get("content-type") || ""
  const rawText = await response.text()

  let body: unknown = rawText
  if (contentType.includes("application/json") && rawText) {
    try {
      body = JSON.parse(rawText)
    } catch {
      body = rawText
    }
  }

  return {
    message: "Django request failed",
    status: response.status,
    body,
  }
}

export async function proxyToDjango(request: NextRequest, options: ProxyOptions): Promise<NextResponse> {
  const { djangoPath, method = "GET", body = null, requireAuth = true, headers: extraHeaders } = options

  const cookieAccessToken = request.cookies.get(DJANGO_ACCESS_COOKIE)?.value || null
  const headerAccessToken = getBearerTokenFromHeader(request)
  let accessToken = cookieAccessToken || headerAccessToken
  const refreshToken = request.cookies.get(DJANGO_REFRESH_COOKIE)?.value || null

  if (requireAuth && !accessToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  try {
    let djangoResponse = await djangoRequest(djangoPath, {
      method,
      headers: buildDjangoHeaders(request, accessToken, body, extraHeaders),
      body,
    })

    let refreshedAccessToken: string | null = null

    if (djangoResponse.status === 401 && refreshToken) {
      refreshedAccessToken = await refreshAccessToken(request, refreshToken, accessToken)
      if (refreshedAccessToken) {
        accessToken = refreshedAccessToken
        djangoResponse = await djangoRequest(djangoPath, {
          method,
          headers: buildDjangoHeaders(request, accessToken, body, extraHeaders),
          body,
        })
      }
    }

    if (!djangoResponse.ok) {
      const djangoError = await parseDjangoError(djangoResponse)
      const errorResponse = NextResponse.json(djangoError.body, { status: djangoError.status })

      if (djangoError.status === 401 && refreshToken) {
        clearAuthCookies(errorResponse)
      }

      return errorResponse
    }

    const response = await responseToNext(djangoResponse)

    if (refreshedAccessToken) {
      setTokenCookies(response, refreshedAccessToken)
    } else if (headerAccessToken && !cookieAccessToken) {
      setTokenCookies(response, headerAccessToken)
    }

    return response
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

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  setTokenCookies(response, accessToken, refreshToken)
}
