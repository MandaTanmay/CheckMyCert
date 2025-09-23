# CheckMyCert API Documentation

## Overview

The CheckMyCert API provides endpoints for certificate verification, user management, and administrative functions. All API endpoints require authentication except for public demo endpoints.

## Base URL

\`\`\`
Production: https://api.checkmycert.com/v1
Development: http://localhost:8000/api/v1
\`\`\`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

### Obtain Token

\`\`\`http
POST /auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
\`\`\`

Response:
\`\`\`json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "student"
  }
}
\`\`\`

## Endpoints

### Certificate Verification

#### Upload Certificate

\`\`\`http
POST /certificates/upload/
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <certificate_file>
language: "en" (optional)
translate_to: "es" (optional)
\`\`\`

Response:
\`\`\`json
{
  "id": "cert_123456",
  "status": "processing",
  "estimated_completion": "2024-01-15T10:30:00Z"
}
\`\`\`

#### Get Verification Results

\`\`\`http
GET /certificates/{id}/results/
Authorization: Bearer <token>
\`\`\`

Response:
\`\`\`json
{
  "id": "cert_123456",
  "status": "completed",
  "verification_result": {
    "overall_status": "verified",
    "confidence_score": 98.5,
    "tamper_score": 1.2,
    "extracted_fields": {
      "name": "John Doe",
      "institution": "University of Example",
      "degree": "Bachelor of Science",
      "graduation_date": "2023-05-15"
    },
    "database_match": {
      "found": true,
      "institution_verified": true,
      "details_match": true
    },
    "tamper_analysis": {
      "font_consistency": 95.2,
      "layout_integrity": 98.1,
      "signature_valid": true
    }
  },
  "processing_time": 45.2,
  "created_at": "2024-01-15T10:00:00Z",
  "completed_at": "2024-01-15T10:00:45Z"
}
\`\`\`

### Bulk Verification

#### Upload Bulk Files

\`\`\`http
POST /certificates/bulk-upload/
Authorization: Bearer <token>
Content-Type: multipart/form-data

files: <multiple_certificate_files>
priority: "standard" | "high" | "urgent"
notification_method: "email" | "dashboard" | "both"
\`\`\`

#### Get Bulk Results

\`\`\`http
GET /certificates/bulk/{batch_id}/results/
Authorization: Bearer <token>
\`\`\`

### User Management

#### Register User

\`\`\`http
POST /auth/register/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "role": "student" | "hr" | "admin",
  "organization": "Company Name" (optional)
}
\`\`\`

#### Get User Profile

\`\`\`http
GET /auth/profile/
Authorization: Bearer <token>
\`\`\`

### Institution Management (Admin Only)

#### List Institutions

\`\`\`http
GET /institutions/
Authorization: Bearer <admin_token>
\`\`\`

#### Add Institution

\`\`\`http
POST /institutions/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "University of Example",
  "country": "US",
  "verification_endpoint": "https://university.edu/verify",
  "contact_email": "registrar@university.edu"
}
\`\`\`

## Error Responses

All endpoints return consistent error responses:

\`\`\`json
{
  "error": {
    "code": "INVALID_FILE_FORMAT",
    "message": "Unsupported file format. Please upload PDF, JPG, or PNG files.",
    "details": {
      "supported_formats": ["pdf", "jpg", "jpeg", "png"],
      "max_file_size": "10MB"
    }
  }
}
\`\`\`

## Rate Limits

- Free tier: 10 requests per hour
- Basic tier: 100 requests per hour  
- Premium tier: 1000 requests per hour
- Enterprise: Custom limits

## Webhooks

Configure webhooks to receive real-time updates:

\`\`\`http
POST /webhooks/configure/
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["verification.completed", "verification.failed"],
  "secret": "your_webhook_secret"
}
\`\`\`

Webhook payload example:
\`\`\`json
{
  "event": "verification.completed",
  "data": {
    "certificate_id": "cert_123456",
    "status": "verified",
    "confidence_score": 98.5
  },
  "timestamp": "2024-01-15T10:00:45Z"
}
