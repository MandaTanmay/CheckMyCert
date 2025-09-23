import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Mock stats based on user role
    const adminStats = {
      totalCertificates: 2847,
      validCertificates: 2542,
      tamperedCertificates: 203,
      pendingVerifications: 102,
      successRate: 89.3,
      totalUsers: 1234,
      totalInstitutions: 89,
      systemHealth: 98.5,
      dailyVerifications: 456,
    }

    const userStats = {
      totalCertificates: 47,
      validCertificates: 42,
      tamperedCertificates: 3,
      pendingVerifications: 2,
      successRate: 89.4,
    }

    const hrStats = {
      totalCertificates: 156,
      validCertificates: 142,
      tamperedCertificates: 8,
      pendingVerifications: 6,
      successRate: 91.0,
    }

    // Return stats based on token (simplified)
    if (token === "admin_token") {
      return NextResponse.json(adminStats)
    } else if (token === "hr_token") {
      return NextResponse.json(hrStats)
    } else {
      return NextResponse.json(userStats)
    }
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
