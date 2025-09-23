import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // In a real implementation, you would:
    // 1. Verify JWT token
    // 2. Decode user information
    // 3. Query database for user details

    // Mock user data based on token
    const mockUsers = {
      admin_token: {
        id: "1",
        email: "admin@checkmycert.com",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        organization: "CheckMyCert",
        isVerified: true,
      },
      hr_token: {
        id: "2",
        email: "hr@company.com",
        firstName: "HR",
        lastName: "Manager",
        role: "hr",
        organization: "Company Inc",
        isVerified: true,
      },
      user_token: {
        id: "3",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "user",
        organization: null,
        isVerified: true,
      },
    }

    const user = mockUsers[token as keyof typeof mockUsers] || mockUsers.user_token

    return NextResponse.json(user)
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
  }
}
