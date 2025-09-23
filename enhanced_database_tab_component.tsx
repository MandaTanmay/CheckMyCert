/**
 * Enhanced Database Tab Component
 * Shows the complete student information from database verification
 * This is what should appear in the "Database" tab of your verification results page
 */

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, User, GraduationCap, Calendar, MapPin, Mail, Hash, Award, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DatabaseVerificationData {
  record_found: boolean;
  match_confidence: number;
  verification_status: string;
  matched_student?: {
    student_name: string;
    student_id: string;
    student_email: string;
    certificate_type: string;
    degree_program: string;
    major: string;
    minor?: string;
    gpa: number;
    enrollment_date: string;
    graduation_date: string;
    certificate_issued_date: string;
    certificate_number: string;
    is_revoked: boolean;
  };
  matched_institution?: {
    name: string;
    short_name: string;
  };
  field_comparisons: Array<{
    field: string;
    extracted_value: string;
    database_value: string;
    confidence: number;
    is_match: boolean;
  }>;
}

interface DatabaseTabProps {
  databaseVerification: DatabaseVerificationData;
}

const DatabaseTab: React.FC<DatabaseTabProps> = ({ databaseVerification }) => {
  const { record_found, match_confidence, matched_student, matched_institution, field_comparisons } = databaseVerification;

  return (
    <div className="space-y-6">
      {/* Database Match Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Database Verification
          </CardTitle>
          <CardDescription>Institution record matching</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <span className="font-medium">Record Status</span>
            <div className="flex items-center gap-2">
              {record_found ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-700">Record Found</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-700">No Record Found</span>
                </>
              )}
            </div>
          </div>

          {record_found && matched_institution && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ Verified against <strong>{matched_institution.name}</strong> database
              </p>
              <p className="text-xs text-green-600 mt-1">
                Match Confidence: {match_confidence.toFixed(1)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Information from Database */}
      {record_found && matched_student && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Student Information
            </CardTitle>
            <CardDescription>Complete record from institutional database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Student Identity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Student Name</p>
                  <p className="text-blue-800">{matched_student.student_name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Hash className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Student ID</p>
                  <p className="text-blue-800">{matched_student.student_id}</p>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <GraduationCap className="h-5 w-5 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-900">Degree</p>
                  <p className="text-purple-800">
                    {matched_student.certificate_type} in {matched_student.degree_program}
                  </p>
                </div>
              </div>

              {matched_student.major && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-900">Major</p>
                    <p className="text-purple-800">{matched_student.major}</p>
                  </div>
                </div>
              )}

              {matched_student.minor && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-900">Minor</p>
                    <p className="text-purple-800">{matched_student.minor}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Award className="h-5 w-5 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-900">GPA</p>
                  <p className="text-purple-800">{matched_student.gpa}</p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Graduation Date</p>
                  <p className="text-green-800">{matched_student.graduation_date}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Certificate Issued</p>
                  <p className="text-green-800">{matched_student.certificate_issued_date}</p>
                </div>
              </div>
            </div>

            {/* Institution and Contact */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <MapPin className="h-5 w-5 text-orange-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900">Institution</p>
                  <p className="text-orange-800">{matched_institution?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Mail className="h-5 w-5 text-orange-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900">Student Email</p>
                  <p className="text-orange-800">{matched_student.student_email}</p>
                </div>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Certificate Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Certificate Number:</span>
                  <span className="font-mono font-medium">{matched_student.certificate_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={matched_student.is_revoked ? "destructive" : "default"}>
                    {matched_student.is_revoked ? "Revoked" : "Active"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Enrollment Date:</span>
                  <span>{matched_student.enrollment_date}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field Comparison Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Field Verification
          </CardTitle>
          <CardDescription>Comparison between OCR results and database records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {field_comparisons.map((comparison, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  comparison.is_match 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">
                    {comparison.field.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    {comparison.is_match ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      comparison.confidence >= 80 ? 'text-green-600' :
                      comparison.confidence >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {comparison.confidence.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                {!comparison.is_match && (
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-gray-600">OCR Result:</span>
                      <span className="ml-2 font-mono text-red-700">{comparison.extracted_value}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Database:</span>
                      <span className="ml-2 font-mono text-green-700">{comparison.database_value}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Final Verification Alert */}
      <Alert className={
        record_found && match_confidence >= 90 
          ? "border-green-500 bg-green-50" 
          : record_found && match_confidence >= 70
          ? "border-yellow-500 bg-yellow-50"
          : "border-red-500 bg-red-50"
      }>
        {record_found && match_confidence >= 90 ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : record_found && match_confidence >= 70 ? (
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <div>
          <h4 className="font-medium mb-1">
            {record_found && match_confidence >= 90 
              ? "Certificate Verified" 
              : record_found && match_confidence >= 70
              ? "Certificate Partially Verified"
              : "Certificate Not Verified"}
          </h4>
          <AlertDescription>
            {record_found && match_confidence >= 90 
              ? `✅ This certificate is authentic. ${matched_student?.student_name} IS issued this certificate by ${matched_institution?.name}.`
              : record_found && match_confidence >= 70
              ? `⚠️ Certificate matches database records but has some discrepancies. Manual review recommended.`
              : `❌ No matching record found in institutional databases. The person may NOT be issued this certificate.`}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
};

// Example usage in your verification results page
const ExampleUsage = () => {
  // This data would come from your API call to /api/certificates/verify-with-database/
  const sampleDatabaseVerification: DatabaseVerificationData = {
    record_found: true,
    match_confidence: 100.0,
    verification_status: "verified_authentic",
    matched_student: {
      student_name: "John Michael Smith",
      student_id: "STU123456",
      student_email: "john.smith@stanford.edu",
      certificate_type: "Bachelor of Science",
      degree_program: "Computer Science",
      major: "Computer Science",
      minor: null,
      gpa: 3.85,
      enrollment_date: "2019-09-01",
      graduation_date: "2023-06-15",
      certificate_issued_date: "2023-06-20",
      certificate_number: "STAN-CS-2023-001234",
      is_revoked: false
    },
    matched_institution: {
      name: "Stanford University",
      short_name: "Stanford"
    },
    field_comparisons: [
      {
        field: "student_name",
        extracted_value: "john michael smith",
        database_value: "john michael smith",
        confidence: 100,
        is_match: true
      },
      {
        field: "certificate_number",
        extracted_value: "STAN-CS-2023-001234",
        database_value: "STAN-CS-2023-001234",
        confidence: 100,
        is_match: true
      },
      {
        field: "degree",
        extracted_value: "bachelor of science computer science",
        database_value: "bachelor of science computer science",
        confidence: 100,
        is_match: true
      },
      {
        field: "institution",
        extracted_value: "stanford university",
        database_value: "stanford university",
        confidence: 100,
        is_match: true
      },
      {
        field: "graduation_date",
        extracted_value: "2023-06-15",
        database_value: "2023-06-15",
        confidence: 100,
        is_match: true
      }
    ]
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Certificate Verification Results</h1>
      
      {/* Your existing tabs */}
      <Tabs defaultValue="database" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="words">Words</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="tamper">Tamper</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        {/* ... other tab contents ... */}

        <TabsContent value="database">
          <DatabaseTab databaseVerification={sampleDatabaseVerification} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseTab;
export { ExampleUsage };

/**
 * INTEGRATION INSTRUCTIONS:
 * 
 * 1. Add this component to your verification results page
 * 2. Call your enhanced API endpoint:
 *    const enhanced = await fetch('/api/certificates/verify-with-database/', {
 *      method: 'POST',
 *      body: JSON.stringify(verificationResult)
 *    });
 * 3. Pass the database_verification data to this component
 * 4. The Database tab will show complete student information from institutional records
 * 
 * The component displays:
 * - ✅ Database match status
 * - 👤 Complete student information (name, ID, email, GPA, etc.)
 * - 🎓 Academic details (degree, major, minor, graduation date)
 * - 🏛️ Institution information
 * - 📊 Field-by-field comparison results
 * - ✅ Clear verification outcome
 */