/**
 * Frontend Integration Example
 * Shows how to enhance your verification results page with database comparison
 * 
 * Add this to your app/verification/results/[id]/page.tsx
 */

import { useState, useEffect } from "react"
import { CheckCircle, XCircle, AlertTriangle, Database, Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Enhanced verification result interface
interface EnhancedVerificationResult extends VerificationResult {
  // New fields from database verification
  database_verification?: {
    database_match: boolean
    confidence_score: number
    verification_status: string
    matched_institution?: any
    matched_record?: any
    comparison_details: Array<{
      field: string
      extracted_value: string
      database_value: string
      confidence: number
      is_match: boolean
    }>
  }
  verification_status_enhanced?: string
  centralized_match?: boolean
  match_confidence?: number
}

// Add this function to enhance verification results
const enhanceWithDatabase = async (verificationResult: VerificationResult): Promise<EnhancedVerificationResult> => {
  try {
    const response = await fetch('/api/certificates/verify-with-database/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` // If using JWT
      },
      body: JSON.stringify(verificationResult)
    });
    
    if (response.ok) {
      const enhanced = await response.json();
      return enhanced.data;
    } else {
      console.error('Database verification failed:', response.statusText);
      return verificationResult;
    }
  } catch (error) {
    console.error('Database verification error:', error);
    return verificationResult;
  }
};

// Enhanced status component
const EnhancedStatusBadge = ({ result }: { result: EnhancedVerificationResult }) => {
  const getEnhancedStatus = () => {
    switch (result.verification_status_enhanced) {
      case 'verified_authentic':
        return { 
          color: 'bg-green-500 text-white', 
          icon: <Shield className="h-4 w-4" />,
          text: 'AUTHENTIC - Certificate Verified' 
        };
      case 'verified_with_concerns':
        return { 
          color: 'bg-yellow-500 text-white', 
          icon: <AlertTriangle className="h-4 w-4" />,
          text: 'VERIFIED - Minor Discrepancies' 
        };
      case 'unverified_no_database_record':
        return { 
          color: 'bg-orange-500 text-white', 
          icon: <Database className="h-4 w-4" />,
          text: 'UNVERIFIED - No Database Record' 
        };
      case 'tampered_detected':
        return { 
          color: 'bg-red-500 text-white', 
          icon: <XCircle className="h-4 w-4" />,
          text: 'TAMPERED - Invalid Certificate' 
        };
      default:
        return { 
          color: 'bg-gray-500 text-white', 
          icon: <AlertTriangle className="h-4 w-4" />,
          text: 'UNVERIFIED' 
        };
    }
  };

  const status = getEnhancedStatus();
  
  return (
    <Badge className={`${status.color} flex items-center gap-2`}>
      {status.icon}
      {status.text}
    </Badge>
  );
};

// Database comparison component
const DatabaseComparison = ({ result }: { result: EnhancedVerificationResult }) => {
  if (!result.database_verification?.comparison_details) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Verification
        </CardTitle>
        <CardDescription>
          Comparison with centralized institutional records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall match status */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="font-medium">Database Match</span>
          <div className="flex items-center gap-2">
            {result.centralized_match ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-medium">
              {result.centralized_match ? 'Found' : 'Not Found'}
            </span>
          </div>
        </div>

        {/* Match confidence */}
        {result.match_confidence !== undefined && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="font-medium">Match Confidence</span>
            <span className={`font-bold ${
              result.match_confidence >= 90 ? 'text-green-600' :
              result.match_confidence >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {result.match_confidence.toFixed(1)}%
            </span>
          </div>
        )}

        {/* Matched institution info */}
        {result.database_verification.matched_institution && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Matched Institution</h4>
            <p className="text-blue-800">
              {result.database_verification.matched_institution.name}
            </p>
          </div>
        )}

        {/* Field-by-field comparison */}
        <div className="space-y-2">
          <h4 className="font-medium">Field Comparison</h4>
          {result.database_verification.comparison_details.map((comp, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                comp.is_match 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium capitalize">
                  {comp.field.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-2">
                  {comp.is_match ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    comp.confidence >= 80 ? 'text-green-600' :
                    comp.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {comp.confidence.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {!comp.is_match && comp.extracted_value && comp.database_value && (
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-gray-600">OCR Result:</span>
                    <span className="ml-2 font-mono">{comp.extracted_value}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Database:</span>
                    <span className="ml-2 font-mono">{comp.database_value}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Certificate authenticity alert
const AuthenticityAlert = ({ result }: { result: EnhancedVerificationResult }) => {
  const getAlertProps = () => {
    switch (result.verification_status_enhanced) {
      case 'verified_authentic':
        return {
          variant: 'default' as const,
          className: 'border-green-500 bg-green-50',
          icon: <Shield className="h-4 w-4 text-green-600" />,
          title: 'Certificate is Authentic',
          message: 'This certificate has been verified against institutional records. The person IS issued this certificate.'
        };
      case 'verified_with_concerns':
        return {
          variant: 'default' as const,
          className: 'border-yellow-500 bg-yellow-50',
          icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
          title: 'Certificate Verified with Concerns',
          message: 'The certificate matches database records but has minor discrepancies. Manual review recommended.'
        };
      case 'unverified_no_database_record':
        return {
          variant: 'default' as const,
          className: 'border-orange-500 bg-orange-50',
          icon: <Database className="h-4 w-4 text-orange-600" />,
          title: 'No Database Record Found',
          message: 'Certificate appears valid but no matching record found. Institution may not be in verification network.'
        };
      case 'tampered_detected':
        return {
          variant: 'destructive' as const,
          className: 'border-red-500 bg-red-50',
          icon: <XCircle className="h-4 w-4 text-red-600" />,
          title: 'Certificate Tampering Detected',
          message: 'This certificate shows signs of modification. The person may NOT be issued this certificate.'
        };
      default:
        return {
          variant: 'default' as const,
          className: 'border-gray-500 bg-gray-50',
          icon: <AlertTriangle className="h-4 w-4 text-gray-600" />,
          title: 'Certificate Unverified',
          message: 'Unable to verify certificate authenticity against database records.'
        };
    }
  };

  const alertProps = getAlertProps();

  return (
    <Alert className={alertProps.className}>
      {alertProps.icon}
      <div>
        <h4 className="font-medium mb-1">{alertProps.title}</h4>
        <AlertDescription>{alertProps.message}</AlertDescription>
      </div>
    </Alert>
  );
};

// Modified VerificationResultsPage component
export default function EnhancedVerificationResultsPage({ params }: { params: { id: string } }) {
  const [result, setResult] = useState<EnhancedVerificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [enhancing, setEnhancing] = useState(false)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Fetch original verification result
        const response = await fetch(`/api/verification/results/${params.id}`)
        if (response.ok) {
          const originalResult = await response.json()
          setResult(originalResult)
          
          // Enhance with database verification
          setEnhancing(true)
          const enhancedResult = await enhanceWithDatabase(originalResult)
          setResult(enhancedResult)
          setEnhancing(false)
        } else {
          console.error("Failed to fetch results:", response.statusText)
          setResult(null)
        }
      } catch (error) {
        console.error("Error fetching results:", error)
        setResult(null)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Processing verification results...</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-foreground font-medium">Verification results not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Your existing header */}
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Enhanced Status Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Enhanced Verification Results</h1>
              <p className="text-muted-foreground">Certificate ID: {result.id}</p>
            </div>
            <div className="ml-auto flex gap-2">
              {/* Original status */}
              <Badge className={getStatusColor()}>{result.status.toUpperCase()}</Badge>
              {/* Enhanced status */}
              <EnhancedStatusBadge result={result} />
            </div>
          </div>

          {/* Database enhancement indicator */}
          {enhancing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Enhancing with database verification...
            </div>
          )}

          {/* Authenticity Alert */}
          {result.verification_status_enhanced && (
            <div className="mb-6">
              <AuthenticityAlert result={result} />
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Your existing certificate preview */}
          <div className="lg:col-span-2">
            {/* ... existing certificate display code ... */}
          </div>

          {/* Enhanced Details Panel */}
          <div className="space-y-6">
            {/* Database Comparison - NEW */}
            <DatabaseComparison result={result} />
            
            {/* Your existing tabs */}
            <Tabs defaultValue="fields" className="w-full">
              {/* ... existing tabs content ... */}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * INTEGRATION STEPS:
 * 
 * 1. Replace your existing VerificationResultsPage with this enhanced version
 * 2. Add the new API endpoints to your Django backend
 * 3. Setup the SQLite database: python backend/manage.py setup_sqlite_verification
 * 4. Test with: python test_integration_demo.py
 * 
 * The enhanced page will now show:
 * - Original OCR verification status
 * - Enhanced database verification status  
 * - Field-by-field comparison with institutional records
 * - Clear indication if the person is issued the certificate
 * - Match confidence scores
 * - Detailed comparison results
 */