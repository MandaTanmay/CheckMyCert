#!/usr/bin/env python3
"""
Test Database Verification for UI Integration
Demonstrates how the verification results are generated after checking with the database
and shows the extracted data from the database for the particular student
"""

import json
import uuid
from datetime import datetime
import sys
import os

# Add backend to path
sys.path.append('backend')
from backend.certificate_verifier import CertificateVerifier

def simulate_verification_page_data():
    """
    Simulate the data that comes from your verification results page
    This represents what your OCR and tamper detection produces
    """
    
    # This is what your app/verification/results/[id]/page.tsx would have
    verification_page_result = {
        "id": "cert_889889889",
        "status": "valid",
        "overallConfidence": 95.0,
        "extractedFields": [
            {"field": "Student Name", "value": "John Michael Smith", "confidence": 95.2},
            {"field": "Institution", "value": "Stanford University", "confidence": 98.7},
            {"field": "Degree", "value": "Bachelor of Science", "confidence": 92.1},
            {"field": "Major", "value": "Computer Science", "confidence": 89.5},
            {"field": "Graduation Date", "value": "2023-06-15", "confidence": 87.3},
            {"field": "Certificate Number", "value": "STAN-CS-2023-001234", "confidence": 96.8}
        ],
        "extractedText": """CERTIFICATE OF COMPLETION This is to certify that manoj has successfully completed the course btech
ex sriv Date of Graduation: 24/9/2025 Grade: 5 Certificate No: 889889889 issued by: manoj""",
        "tamperIssues": [],
        "signatureValid": True,
        "databaseMatch": False,  # This will be enhanced by our system
        "qrToken": "qr_cert_889889889_20241223",
        "processedAt": datetime.now().isoformat(),
        "certificateImage": None,
        "certificateFilename": "certificate_889889889.pdf",
        "certificateMimetype": "application/pdf"
    }
    
    return verification_page_result

def test_database_verification_flow():
    """
    Test the complete flow: OCR results → Database verification → UI display data
    """
    
    print("🎓 Testing Database Verification for UI Integration")
    print("=" * 70)
    
    # Step 1: Get OCR results (simulated from your verification page)
    ocr_result = simulate_verification_page_data()
    
    print("📄 STEP 1: OCR Results from Verification Page")
    print("-" * 50)
    print(f"Certificate ID: {ocr_result['id']}")
    print(f"OCR Status: {ocr_result['status']}")
    print(f"OCR Confidence: {ocr_result['overallConfidence']}%")
    print(f"Original Database Match: {ocr_result['databaseMatch']}")
    
    print("\n🔍 Extracted Fields from OCR:")
    for field in ocr_result['extractedFields']:
        print(f"   {field['field']}: {field['value']} ({field['confidence']}%)")
    
    print(f"\n📝 Raw Extracted Text:")
    print(f"   {ocr_result['extractedText']}")
    
    # Step 2: Enhance with database verification
    print(f"\n" + "=" * 70)
    print("📊 STEP 2: Database Verification Enhancement")
    print("-" * 50)
    
    verifier = CertificateVerifier()
    enhanced_result = verifier.process_verification_result(ocr_result)
    
    # Step 3: Show what the Database tab should display
    print(f"\n" + "=" * 70)
    print("🗄️  STEP 3: Database Tab Display Data")
    print("-" * 50)
    
    print("Database Verification")
    print("Institution record matching")
    print()
    
    if enhanced_result['centralized_match']:
        print("✅ Record Found")
        print("   Verified against Stanford University database")
        print()
        
        # This is what should appear in the Database section
        matched_record = enhanced_result['matched_certificate_info']
        matched_institution = enhanced_result['matched_institution_info']
        
        print("📋 Student Information from Database:")
        print(f"   👤 Student: {matched_record['student_name']}")
        print(f"   🎓 Degree: {matched_record['certificate_type']} {matched_record['degree_program']}")
        print(f"   📅 Graduated: {matched_record['graduation_date']}")
        print(f"   🏛️  Institution: {matched_institution['name']}")
        print(f"   📧 Email: {matched_record['student_email']}")
        print(f"   🆔 Student ID: {matched_record['student_id']}")
        print(f"   📊 GPA: {matched_record['gpa']}")
        print(f"   📜 Certificate #: {matched_record['certificate_number']}")
        print(f"   📆 Issued: {matched_record['certificate_issued_date']}")
        
        if matched_record['major']:
            print(f"   📚 Major: {matched_record['major']}")
        if matched_record['minor']:
            print(f"   📖 Minor: {matched_record['minor']}")
            
    else:
        print("❌ No Record Found")
        print("   No matching record in institutional databases")
    
    # Step 4: Show field-by-field comparison
    print(f"\n📊 Field-by-Field Comparison:")
    for comp in enhanced_result['comparison_details']:
        status = "✅" if comp['is_match'] else "❌"
        print(f"   {status} {comp['field'].replace('_', ' ').title()}: {comp['confidence']:.1f}%")
        if not comp['is_match']:
            print(f"      OCR: '{comp['extracted_value']}'")
            print(f"      DB:  '{comp['database_value']}'")
    
    # Step 5: Final verification result
    print(f"\n" + "=" * 70)
    print("🎯 STEP 4: Final Verification Result")
    print("-" * 50)
    
    final_status = enhanced_result['verification_status_enhanced']
    confidence = enhanced_result['match_confidence']
    
    print(f"Enhanced Status: {final_status.upper()}")
    print(f"Database Match: {'✅ YES' if enhanced_result['centralized_match'] else '❌ NO'}")
    print(f"Match Confidence: {confidence:.1f}%")
    
    if final_status == 'verified_authentic':
        print(f"\n🎉 CERTIFICATE IS AUTHENTIC!")
        print(f"✅ The person IS issued this certificate by the institution.")
        print(f"✅ All details match the centralized database records.")
        
    elif final_status == 'verified_with_concerns':
        print(f"\n⚠️  CERTIFICATE VERIFIED WITH CONCERNS")
        print(f"✅ The certificate matches database records.")
        print(f"⚠️  Some minor discrepancies found - manual review recommended.")
        
    else:
        print(f"\n❌ CERTIFICATE VERIFICATION FAILED")
        print(f"❌ Unable to verify certificate authenticity.")
    
    verifier.close()
    return enhanced_result

def generate_ui_json_data():
    """
    Generate the JSON data structure that your frontend would receive
    """
    
    print(f"\n" + "=" * 70)
    print("📱 STEP 5: Frontend JSON Data Structure")
    print("-" * 50)
    
    verifier = CertificateVerifier()
    ocr_result = simulate_verification_page_data()
    enhanced_result = verifier.process_verification_result(ocr_result)
    
    # This is what your API would return to the frontend
    ui_data = {
        "success": True,
        "message": "Certificate verification completed with database comparison",
        "data": {
            # Original OCR data
            "id": enhanced_result['id'],
            "status": enhanced_result['status'],
            "overallConfidence": enhanced_result['overallConfidence'],
            "extractedFields": enhanced_result['extractedFields'],
            "extractedText": enhanced_result['extractedText'],
            
            # Enhanced database verification
            "database_verification": {
                "record_found": enhanced_result['centralized_match'],
                "match_confidence": enhanced_result['match_confidence'],
                "verification_status": enhanced_result['verification_status_enhanced'],
                
                # Student data from database (for Database tab)
                "matched_student": enhanced_result['matched_certificate_info'] if enhanced_result['matched_certificate_info'] else None,
                "matched_institution": enhanced_result['matched_institution_info'] if enhanced_result['matched_institution_info'] else None,
                
                # Field comparisons
                "field_comparisons": enhanced_result['comparison_details']
            },
            
            # UI display helpers
            "ui_status": {
                "color": "green" if enhanced_result['verification_status_enhanced'] == 'verified_authentic' else 
                        "yellow" if enhanced_result['verification_status_enhanced'] == 'verified_with_concerns' else "red",
                "text": "AUTHENTIC - Certificate Verified" if enhanced_result['verification_status_enhanced'] == 'verified_authentic' else
                       "VERIFIED - Minor Discrepancies" if enhanced_result['verification_status_enhanced'] == 'verified_with_concerns' else
                       "UNVERIFIED - Check Required",
                "is_issued": enhanced_result['verification_status_enhanced'] in ['verified_authentic', 'verified_with_concerns']
            }
        }
    }
    
    print("📄 JSON Response for Frontend:")
    print(json.dumps(ui_data, indent=2, default=str))
    
    verifier.close()
    return ui_data

def test_different_scenarios():
    """
    Test different verification scenarios to show various database responses
    """
    
    print(f"\n" + "=" * 70)
    print("🧪 TESTING DIFFERENT SCENARIOS")
    print("=" * 70)
    
    scenarios = [
        {
            "name": "Perfect Match - John Smith",
            "data": {
                "student_name": "John Michael Smith",
                "certificate_number": "STAN-CS-2023-001234",
                "institution": "Stanford University",
                "degree": "Bachelor of Science Computer Science",
                "graduation_date": "2023-06-15"
            }
        },
        {
            "name": "Partial Match - Sarah Johnson (no cert number)",
            "data": {
                "student_name": "Sarah Johnson",
                "certificate_number": "",
                "institution": "Massachusetts Institute of Technology",
                "degree": "Master of Science Electrical Engineering",
                "graduation_date": "2023-05-25"
            }
        },
        {
            "name": "No Match - Fake Student",
            "data": {
                "student_name": "Fake Student",
                "certificate_number": "FAKE-123-456",
                "institution": "Fake University",
                "degree": "Bachelor of Fake Studies",
                "graduation_date": "2024-01-01"
            }
        }
    ]
    
    verifier = CertificateVerifier()
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n📋 Scenario {i}: {scenario['name']}")
        print("-" * 50)
        
        # Perform database verification
        db_result = verifier.db.verify_certificate(scenario['data'])
        
        print(f"Database Match: {'✅ YES' if db_result['database_match'] else '❌ NO'}")
        print(f"Confidence: {db_result['confidence_score']:.1f}%")
        print(f"Status: {db_result['verification_status'].upper()}")
        
        if db_result['matched_record']:
            record = db_result['matched_record']
            print(f"\n📊 Database Record Found:")
            print(f"   Student: {record['student_name']}")
            print(f"   Degree: {record['certificate_type']} in {record['degree_program']}")
            print(f"   Institution: {db_result['matched_institution']['name']}")
            print(f"   Certificate #: {record['certificate_number']}")
            print(f"   Graduation: {record['graduation_date']}")
        else:
            print(f"\n❌ No database record found")
    
    verifier.close()

if __name__ == "__main__":
    # Run the complete test
    enhanced_result = test_database_verification_flow()
    
    # Generate UI data structure
    ui_data = generate_ui_json_data()
    
    # Test different scenarios
    test_different_scenarios()
    
    print(f"\n" + "=" * 70)
    print("✅ DATABASE VERIFICATION TESTING COMPLETED")
    print("=" * 70)
    print("📋 Summary:")
    print("   ✅ OCR results successfully enhanced with database verification")
    print("   ✅ Student information extracted from database")
    print("   ✅ Field-by-field comparison completed")
    print("   ✅ UI data structure generated")
    print("   ✅ Multiple scenarios tested")
    print()
    print("🎯 The Database tab in your verification results page should now show:")
    print("   📊 Database match status")
    print("   👤 Complete student information from institutional records")
    print("   🔍 Field-by-field comparison results")
    print("   ✅ Clear indication if the person is issued the certificate")