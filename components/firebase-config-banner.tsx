"use client"

import { AlertCircle, ExternalLink } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

export function FirebaseConfigBanner() {
  const { isFirebaseConfigured } = useAuth()

  if (isFirebaseConfigured) return null

  return (
    <Alert className="border-yellow-500/50 text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400 mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong>Firebase Configuration Required</strong>
          <br />
          <span className="text-xs">Add your Firebase environment variables to enable authentication features.</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-4 border-yellow-500 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900 bg-transparent"
          onClick={() => window.open("https://console.firebase.google.com/", "_blank")}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Firebase Console
        </Button>
      </AlertDescription>
    </Alert>
  )
}
