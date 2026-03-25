"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db, isFirebaseConfigured } from "@/lib/firebase"

export type UserRole = "user" | "hr" | "admin"

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: UserRole
  createdAt: Date
  lastLogin: Date
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>
  isFirebaseConfigured: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const toNameParts = (displayName: string) => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean)
    return {
      firstName: parts[0] || "User",
      lastName: parts.slice(1).join(" ") || "Account",
    }
  }

  const toUsername = (email: string) => {
    const normalized = email.trim().toLowerCase() || "user"
    // Use the full email (sanitized) to avoid collisions like john@gmail and john@yahoo.
    return normalized.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 150)
  }

  const extractFirstMessage = (value: unknown): string | null => {
    if (!value) return null
    if (typeof value === "string") return value

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = extractFirstMessage(item)
        if (nested) return nested
      }
      return null
    }

    if (typeof value === "object") {
      for (const nestedValue of Object.values(value as Record<string, unknown>)) {
        const nested = extractFirstMessage(nestedValue)
        if (nested) return nested
      }
      return null
    }

    return null
  }

  const formatBackendError = (payload: any, fallbackMessage: string) => {
    if (typeof payload === "string") {
      return payload
    }

    const preferred = payload?.detail || payload?.message || payload?.error
    if (preferred && typeof preferred === "string") {
      if (preferred.includes("Non-JSON response from Django backend") && typeof payload?.raw === "string") {
        return `${preferred}: ${payload.raw.slice(0, 300)}`
      }
      return preferred
    }

    if (typeof payload?.raw === "string") {
      return payload.raw.slice(0, 300)
    }

    const extracted = extractFirstMessage(payload)
    if (extracted) {
      return extracted
    }

    return fallbackMessage
  }

  const syncDjangoLogin = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(formatBackendError(payload, "Django login failed"))
    }
  }

  const syncDjangoRegister = async (email: string, password: string, displayName: string, role: UserRole) => {
    const { firstName, lastName } = toNameParts(displayName)
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        username: toUsername(email),
        first_name: firstName,
        last_name: lastName,
        password,
        password_confirm: password,
        role,
        organization: "",
      }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(formatBackendError(payload, "Django registration failed"))
    }
  }

  useEffect(() => {
    if (!isFirebaseConfigured) {
      console.warn("Firebase is not properly configured. Authentication features will be limited.")
      setLoading(false)
    }
  }, [])

  // Fetch user profile from Firestore
  const fetchUserProfile = async (user: User): Promise<UserProfile | null> => {
    if (!db || !isFirebaseConfigured) return null

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        return {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || data.displayName || "",
          role: data.role || "user",
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLogin: new Date(),
        }
      }
      return null
    } catch (error) {
      console.error("Error fetching user profile:", error)
      return null
    }
  }

  // Create user profile in Firestore
  const createUserProfile = async (user: User, displayName: string, role: UserRole = "user") => {
    if (!db || !isFirebaseConfigured) {
      throw new Error("Firebase is not configured")
    }

    try {
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || "",
        displayName,
        role,
        createdAt: new Date(),
        lastLogin: new Date(),
      }

      await setDoc(doc(db, "users", user.uid), {
        ...userProfile,
        createdAt: new Date(),
        lastLogin: new Date(),
      })

      return userProfile
    } catch (error) {
      console.error("Error creating user profile:", error)
      throw error
    }
  }

  // Sign in function
  const signIn = async (email: string, password: string) => {
    if (!auth || !isFirebaseConfigured) {
      throw new Error("Firebase is not configured. Please add your Firebase environment variables.")
    }

    try {
      setLoading(true)
      const result = await signInWithEmailAndPassword(auth, email, password)

      // Keep Django JWT cookies in sync with Firebase session.
      try {
        await syncDjangoLogin(email, password)
      } catch {
        await syncDjangoRegister(
          email,
          password,
          result.user.displayName || email.split("@")[0] || "User Account",
          "user",
        )
        await syncDjangoLogin(email, password)
      }

      // Update last login asynchronously (non-blocking)
      if (db) {
        setDoc(
          doc(db, "users", result.user.uid),
          {
            lastLogin: new Date(),
          },
          { merge: true },
        ).catch((error) => {
          console.error("Error updating last login (non-blocking):", error)
        })
      }

      // User can proceed immediately
      setLoading(false)
      
    } catch (error) {
      console.error("Sign in error:", error)
      await signOut(auth).catch(() => {
        // Ignore Firebase cleanup failure on sign-in error.
      })
      setLoading(false)
      throw error
    }
  }

  // Sign up function
  const signUp = async (email: string, password: string, displayName: string, role: UserRole = "user") => {
    if (!auth || !isFirebaseConfigured) {
      throw new Error("Firebase is not configured. Please add your Firebase environment variables.")
    }

    try {
      setLoading(true)
      
      // Create user account first (fastest operation)
      const result = await createUserWithEmailAndPassword(auth, email, password)

      // Update the user's display name immediately
      await updateProfile(result.user, { displayName })

      // Register the user in Django and set JWT cookies for BFF routes.
      await syncDjangoRegister(email, password, displayName, role)

      // Create user profile in Firestore asynchronously (don't wait for it)
      // This allows the user to proceed while the profile is being created in the background
      createUserProfile(result.user, displayName, role)
        .then((profile) => {
          setUserProfile(profile)
          console.log("User profile created successfully")
        })
        .catch((error) => {
          console.error("Error creating user profile (non-blocking):", error)
          // Profile creation failed, but user account exists - they can still use the app
          // We'll create a minimal profile in memory
          const minimalProfile: UserProfile = {
            uid: result.user.uid,
            email: result.user.email || "",
            displayName,
            role,
            createdAt: new Date(),
            lastLogin: new Date(),
          }
          setUserProfile(minimalProfile)
        })

      // User can proceed immediately without waiting for Firestore write
      setLoading(false)
      
    } catch (error) {
      console.error("Sign up error:", error)
      await signOut(auth).catch(() => {
        // Ignore Firebase cleanup failure on sign-up error.
      })
      setLoading(false)
      throw error
    }
  }

  // Logout function
  const logout = async () => {
    if (!auth) return

    try {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {
        // Ignore logout network errors and continue local sign-out.
      })
      await signOut(auth)
      setUser(null)
      setUserProfile(null)
    } catch (error) {
      console.error("Logout error:", error)
      throw error
    }
  }

  // Update user profile
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !userProfile || !db || !isFirebaseConfigured) return

    try {
      await setDoc(doc(db, "users", user.uid), updates, { merge: true })
      setUserProfile({ ...userProfile, ...updates })
    } catch (error) {
      console.error("Error updating user profile:", error)
      throw error
    }
  }

  // Listen for authentication state changes
  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        setLoading(false) // Set loading to false immediately when user is found
        
        // Fetch profile asynchronously without blocking the UI
        fetchUserProfile(user)
          .then((profile) => {
            setUserProfile(profile)
          })
          .catch((error) => {
            console.error("Error fetching user profile (non-blocking):", error)
            // Create minimal profile if Firestore fetch fails
            const minimalProfile: UserProfile = {
              uid: user.uid,
              email: user.email || "",
              displayName: user.displayName || "",
              role: "user",
              createdAt: new Date(),
              lastLogin: new Date(),
            }
            setUserProfile(minimalProfile)
          })
      } else {
        setUser(null)
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [isFirebaseConfigured])

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    logout,
    updateUserProfile,
    isFirebaseConfigured,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
