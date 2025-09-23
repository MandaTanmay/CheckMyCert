#!/usr/bin/env python3
"""
Integration Demo Script
Demonstrates how the verification results from your page integrate with SQLite database
"""

import json
from datetime import datetime

# Try to import requests, but don't fail if not available
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

def simulate_verification_page_result():
    """
    Simulate the verification result that would come from your 
    app/verification/results/[id]/page.tsx
    """
    
    # This is what your verification results page produces
    verification_result = {
        "id": "cert_12345",
        "status": "valid",
        "overallConfidence": 93.2,
        "extractedFields": [
            {"field": "Student Name", "value": "John Michael Smith", "confidence": 95.2},
            {"field": "Institution", "value": "Stanford University", "confidence": 98.7},
            {"field": "Degree", "value": "Bachelor of Science", "confidence": 92.1},
            {"field": "Major", "value": "Computer Science", "confidence": 89.5},
            {"field": "Graduation Date", "value": "2023-06-15", "confidence": 87.3},
            {"field": "Certificate Number", "value": "STAN-CS-2023-001234", "confidence": 96.8}
        ],
        "extractedText": """
        STANFORD UNIVERSITY
        
        This is to certify that
        
        JOHN MICHAEL SMITH
        
        has successfully completed the requirements for the degree of
        
        BACHELOR OF SCIENCE
        IN COMPUTER SCIENCE
        
        Conferred on June 15, 2023
        
        Certificate Number: STAN-CS-2023-001234
        
        [Signature]
        Registrar
        """,
        "tamperIssues": [],
        "signatureValid": True,
        "databaseMatch": False,  # This is what we're enhancing
        "qrToken": "qr_cert_12345_20241223",
        "processedAt": datetime.now().isoformat(),
        "certificateImage": None,
        "certificateFilename": "john_smith_degree.pdf",
        "certificateMimetype": "application/pdf"
    }
    
    return verification_result

def test_database_integration():
    """
    Test the database integration with the verification result
    """
    
    print("🎓 Certificate Verification Integration Demo")
    print("=" * 60)
    
    # Get simulated verification result from your page
    verification_result = simulate_verification_page_result()
    
    print("📋 Original Verification Result (from your page):")
    print(f"   Certificate ID: {verification_result['id']}")
    print(f"   OCR Status: {verification_result['status']}")
    print(f"   OCR Confidence: {verification_result['overallConfidence']}%")
    print(f"   Database Match: {verification_result['databaseMatch']}")
    print(f"   Filename: {verification_result['certificateFilename']}")
    
    print("\n🔍 Extracted Fields:")
    for field in verification_result['extractedFields']:
        print(f"   {field['field']}: {field['value']} ({field['confidence']}%)")
    
    # Now enhance with database verification
    print(f"\n🔍 Enhancing with Database Verification...")
    print("-" * 40)
    
    # Import our verification system
    import sys
    import os
    sys.path.append('backend')
    
    from backend.certificate_verifier import CertificateVerifier
    
    # Process with our enhanced verification
    verifier = CertificateVerifier()
    enhanced_result = verifier.process_verification_result(verification_result)
    verifier.close()
    
    print("✅ Enhanced Verification Result:")
    print(f"   Final Status: {enhanced_result['verification_status_enhanced']}")
    print(f"   Centralized Database Match: {enhanced_result['centralized_match']}")
    print(f"   Match Confidence: {enhanced_result['match_confidence']:.1f}%")
    
    if enhanced_result['matched_institution_info']:
        print(f"   Matched Institution: {enhanced_result['matched_institution_info']['name']}")
    
    if enhanced_result['matched_certificate_info']:
        print(f"   Matched Student: {enhanced_result['matched_certificate_info']['student_name']}")
        print(f"   Certificate Number: {enhanced_result['matched_certificate_info']['certificate_number']}")
        print(f"   Degree Program: {enhanced_result['matched_certificate_info']['degree_program']}")
        print(f"   Graduation Date: {enhanced_result['matched_certificate_info']['graduation_date']}")
    
    print(f"\n📊 Field-by-Field Comparison:")
    for comp in enhanced_result['comparison_details']:
        status = "✓" if comp['is_match'] else "✗"
        print(f"   {status} {comp['field']}: {comp['confidence']:.1f}%")
        if not comp['is_match'] and comp['extracted_value'] and comp['database_value']:
            print(f"      OCR Result: '{comp['extracted_value']}'")
            print(f"      Database:   '{comp['database_value']}'")
    
    # Final determination
    print(f"\n" + "=" * 60)
    print("FINAL VERIFICATION RESULT")
    print("=" * 60)
    
    final_status = enhanced_result['verification_status_enhanced']
    
    if final_status == 'verified_authentic':
        print(f"🎉 CERTIFICATE IS AUTHENTIC!")
        print(f"✅ The person IS issued this certificate by the institution.")
        print(f"✅ All details match the centralized database records.")
        
    elif final_status == 'verified_with_concerns':
        print(f"⚠️  CERTIFICATE VERIFIED WITH CONCERNS")
        print(f"✅ The certificate matches database records.")
        print(f"⚠️  Some minor discrepancies found - manual review recommended.")
        
    elif final_status == 'unverified_no_database_record':
        print(f"❓ CERTIFICATE UNVERIFIED")
        print(f"✅ OCR analysis shows certificate appears valid.")
        print(f"❌ No matching record found in centralized database.")
        print(f"📝 Institution may not be in our verification network.")
        
    elif final_status == 'tampered_detected':
        print(f"🚨 CERTIFICATE TAMPERING DETECTED!")
        print(f"❌ The certificate shows signs of modification.")
        print(f"❌ The person may NOT be issued this certificate.")
        
    else:
        print(f"❌ CERTIFICATE VERIFICATION FAILED")
        print(f"❌ Unable to verify certificate authenticity.")
        print(f"❌ The person may NOT be issued this certificate.")
    
    return enhanced_result

def test_api_integration():
    """
    Test the API integration (if Django server is running)
    """
    
    print(f"\n" + "=" * 60)
    print("API INTEGRATION TEST")
    print("=" * 60)
    
    # Test data for quick verification
    test_data = {
        "student_name": "John Michael Smith",
        "certificate_number": "STAN-CS-2023-001234",
        "institution": "Stanford University",
        "degree": "Bachelor of Science Computer Science",
        "graduation_date": "2023-06-15"
    }
    
    print("📡 Testing API endpoint (if Django server is running)...")
    print("   Endpoint: POST /api/certificates/quick-verify/")
    print("   Data:", json.dumps(test_data, indent=2))
    
    if not REQUESTS_AVAILABLE:
        print(f"⚠️  API test skipped - requests module not available")
        print(f"   Install with: pip install requests")
        return
        
    try:
        # This would work if your Django server is running
        response = requests.post(
            'http://localhost:8000/api/certificates/quick-verify/',
            json=test_data,
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ API Response:")
            print(f"   Certificate Issued: {result['is_certificate_issued']}")
            print(f"   Verification Status: {result['verification_status']}")
            print(f"   Confidence: {result['confidence_score']:.1f}%")
            print(f"   Message: {result['message']}")
        else:
            print(f"❌ API Error: {response.status_code}")
            
    except Exception as e:
        print(f"⚠️  API test skipped - Django server not running")
        print(f"   To test API: python backend/manage.py runserver")
        print(f"   Then run this script again")

def show_integration_instructions():
    """
    Show instructions for integrating with your existing system
    """
    
    print(f"\n" + "=" * 60)
    print("INTEGRATION INSTRUCTIONS")
    print("=" * 60)
    
    instructions = """
🔧 How to integrate with your verification results page:

1. BACKEND INTEGRATION:
   - Add the SQLite verification to your Django project
   - Include the new URLs in your main urls.py:
     
     from apps.certificates.urls_sqlite import urlpatterns as sqlite_urls
     urlpatterns += [path('api/certificates/', include(sqlite_urls))]

2. FRONTEND INTEGRATION (app/verification/results/[id]/page.tsx):
   
   // After getting your verification result, enhance it with database check
   const enhanceWithDatabase = async (verificationResult) => {
     try {
       const response = await fetch('/api/certificates/verify-with-database/', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(verificationResult)
       });
       
       const enhanced = await response.json();
       return enhanced.data;
     } catch (error) {
       console.error('Database verification failed:', error);
       return verificationResult;
     }
   };

3. UPDATE YOUR VERIFICATION RESULTS DISPLAY:
   
   // Add new status indicators
   const getEnhancedStatus = (result) => {
     switch (result.verification_status_enhanced) {
       case 'verified_authentic':
         return { color: 'green', text: 'AUTHENTIC - Certificate Verified' };
       case 'verified_with_concerns':
         return { color: 'yellow', text: 'VERIFIED - Minor Discrepancies' };
       case 'unverified_no_database_record':
         return { color: 'orange', text: 'UNVERIFIED - No Database Record' };
       case 'tampered_detected':
         return { color: 'red', text: 'TAMPERED - Invalid Certificate' };
       default:
         return { color: 'gray', text: 'UNVERIFIED' };
     }
   };

4. ADD DATABASE COMPARISON SECTION:
   
   // Show field-by-field comparison
   {result.comparison_details && (
     <Card>
       <CardHeader>
         <CardTitle>Database Comparison</CardTitle>
       </CardHeader>
       <CardContent>
         {result.comparison_details.map((comp, idx) => (
           <div key={idx} className={comp.is_match ? 'text-green-600' : 'text-red-600'}>
             {comp.is_match ? '✓' : '✗'} {comp.field}: {comp.confidence}%
           </div>
         ))}
       </CardContent>
     </Card>
   )}

5. SETUP DATABASE:
   
   cd backend
   python manage.py setup_sqlite_verification
   
   # Or manually:
   python sqlite_setup.py

6. TEST THE SYSTEM:
   
   python test_verification.py
   python certificate_verifier.py
   
🎯 RESULT: Your verification page will now show whether the person 
   is actually issued the certificate by comparing with centralized 
   institutional databases!
"""
    
    print(instructions)

if __name__ == "__main__":
    # Run the integration demo
    enhanced_result = test_database_integration()
    
    # Test API if available
    test_api_integration()
    
    # Show integration instructions
    show_integration_instructions()
    
    print(f"\n✅ Integration demo completed!")
    print(f"📁 Files created:")
    print(f"   - backend/sqlite_setup.py (Database setup)")
    print(f"   - backend/test_verification.py (Test scenarios)")
    print(f"   - backend/certificate_verifier.py (Main integration)")
    print(f"   - backend/apps/certificates/views_sqlite.py (API endpoints)")
    print(f"   - backend/certificate_verification.db (SQLite database)")