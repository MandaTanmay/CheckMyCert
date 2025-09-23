#!/usr/bin/env python3
"""
Test Certificate Verification System
Simulates OCR results and tests database comparison
"""

import json
import uuid
from sqlite_setup import CertificateDatabase

def test_verification_scenarios():
    """Test various verification scenarios"""
    
    # Initialize database
    db = CertificateDatabase()
    
    print("🔍 Testing Certificate Verification System\n")
    
    # Test Case 1: Perfect Match (Exact certificate number)
    print("=" * 60)
    print("TEST CASE 1: Perfect Match - Exact Certificate Number")
    print("=" * 60)
    
    extracted_data_1 = {
        'student_name': 'John Michael Smith',
        'certificate_number': 'STAN-CS-2023-001234',
        'institution': 'Stanford University',
        'degree': 'Bachelor of Science Computer Science',
        'graduation_date': '2023-06-15'
    }
    
    result_1 = db.verify_certificate(extracted_data_1)
    print_verification_result("Perfect Match Test", extracted_data_1, result_1)
    
    # Save result
    verification_id_1 = str(uuid.uuid4())
    db.save_verification_result(verification_id_1, extracted_data_1, result_1)
    
    # Test Case 2: Partial Match (Name and institution match, no cert number)
    print("\n" + "=" * 60)
    print("TEST CASE 2: Partial Match - Name and Institution")
    print("=" * 60)
    
    extracted_data_2 = {
        'student_name': 'Sarah Johnson',
        'certificate_number': '',  # Missing certificate number
        'institution': 'Massachusetts Institute of Technology',
        'degree': 'Master of Science Electrical Engineering',
        'graduation_date': '2023-05-25'
    }
    
    result_2 = db.verify_certificate(extracted_data_2)
    print_verification_result("Partial Match Test", extracted_data_2, result_2)
    
    # Save result
    verification_id_2 = str(uuid.uuid4())
    db.save_verification_result(verification_id_2, extracted_data_2, result_2)
    
    # Test Case 3: Fuzzy Match (Slight name variation)
    print("\n" + "=" * 60)
    print("TEST CASE 3: Fuzzy Match - Name Variation")
    print("=" * 60)
    
    extracted_data_3 = {
        'student_name': 'Mike Chen',  # Variation of "Michael Chen"
        'certificate_number': 'UCB-BA-2024-009876',
        'institution': 'UC Berkeley',  # Short name variation
        'degree': 'Bachelor of Arts Business Administration',
        'graduation_date': '2024-05-10'
    }
    
    result_3 = db.verify_certificate(extracted_data_3)
    print_verification_result("Fuzzy Match Test", extracted_data_3, result_3)
    
    # Save result
    verification_id_3 = str(uuid.uuid4())
    db.save_verification_result(verification_id_3, extracted_data_3, result_3)
    
    # Test Case 4: No Match (Fake certificate)
    print("\n" + "=" * 60)
    print("TEST CASE 4: No Match - Fake Certificate")
    print("=" * 60)
    
    extracted_data_4 = {
        'student_name': 'Jane Doe',
        'certificate_number': 'FAKE-CERT-2024-999999',
        'institution': 'Fake University',
        'degree': 'Bachelor of Fake Studies',
        'graduation_date': '2024-12-31'
    }
    
    result_4 = db.verify_certificate(extracted_data_4)
    print_verification_result("No Match Test", extracted_data_4, result_4)
    
    # Save result
    verification_id_4 = str(uuid.uuid4())
    db.save_verification_result(verification_id_4, extracted_data_4, result_4)
    
    # Test Case 5: Tampered Certificate (Wrong details with valid cert number)
    print("\n" + "=" * 60)
    print("TEST CASE 5: Tampered Certificate - Wrong Details")
    print("=" * 60)
    
    extracted_data_5 = {
        'student_name': 'Hacker McHackface',  # Wrong name
        'certificate_number': 'STAN-MBA-2024-002468',  # Valid cert number
        'institution': 'Stanford University',
        'degree': 'Master of Hacking',  # Wrong degree
        'graduation_date': '2024-06-15'
    }
    
    result_5 = db.verify_certificate(extracted_data_5)
    print_verification_result("Tampered Certificate Test", extracted_data_5, result_5)
    
    # Save result
    verification_id_5 = str(uuid.uuid4())
    db.save_verification_result(verification_id_5, extracted_data_5, result_5)
    
    # Display final statistics
    print("\n" + "=" * 60)
    print("FINAL STATISTICS")
    print("=" * 60)
    
    stats = db.get_verification_stats()
    print(f"📊 Database Statistics:")
    print(f"   Verified Institutions: {stats['verified_institutions']}")
    print(f"   Active Certificates: {stats['active_certificates']}")
    print(f"   Total Verifications: {stats['total_verifications']}")
    print(f"   Successful Matches: {stats['successful_matches']}")
    print(f"   Match Rate: {stats['match_rate']}%")
    
    db.close()

def print_verification_result(test_name, extracted_data, result):
    """Print formatted verification result"""
    
    print(f"\n📋 {test_name}")
    print("-" * 40)
    
    # Input data
    print("🔍 Extracted Data:")
    for key, value in extracted_data.items():
        print(f"   {key}: {value}")
    
    print(f"\n✅ Verification Result:")
    print(f"   Status: {result['verification_status'].upper()}")
    print(f"   Database Match: {'✓' if result['database_match'] else '✗'}")
    print(f"   Confidence Score: {result['confidence_score']:.1f}%")
    
    if result['matched_institution']:
        print(f"   Matched Institution: {result['matched_institution']['name']}")
    
    if result['matched_record']:
        print(f"   Matched Student: {result['matched_record']['student_name']}")
        print(f"   Certificate Number: {result['matched_record']['certificate_number']}")
    
    # Detailed comparisons
    if result['comparison_details']:
        print(f"\n🔍 Field Comparisons:")
        for comp in result['comparison_details']:
            status = "✓" if comp['is_match'] else "✗"
            print(f"   {status} {comp['field']}: {comp['confidence']:.1f}%")
            if not comp['is_match'] and comp['extracted_value'] and comp['database_value']:
                print(f"      Extracted: '{comp['extracted_value']}'")
                print(f"      Database:  '{comp['database_value']}'")
    
    # Determine if certificate is valid
    if result['verification_status'] == 'valid':
        print(f"\n🎉 CERTIFICATE IS VALID - Person is issued this certificate!")
    elif result['verification_status'] == 'unverified':
        print(f"\n⚠️  CERTIFICATE UNVERIFIED - Partial match, needs manual review")
    else:
        print(f"\n❌ CERTIFICATE INVALID - Potential tampering detected!")

def simulate_ocr_extraction():
    """Simulate OCR extraction from a certificate image"""
    
    print("\n🤖 Simulating OCR Extraction Process...")
    print("-" * 40)
    
    # This would normally come from your OCR processing
    # Simulating what the verification results page would produce
    simulated_ocr_result = {
        'extractedFields': [
            {'field': 'Student Name', 'value': 'John Michael Smith', 'confidence': 95.2},
            {'field': 'Institution', 'value': 'Stanford University', 'confidence': 98.7},
            {'field': 'Degree', 'value': 'Bachelor of Science', 'confidence': 92.1},
            {'field': 'Major', 'value': 'Computer Science', 'confidence': 89.5},
            {'field': 'Graduation Date', 'value': 'June 15, 2023', 'confidence': 87.3},
            {'field': 'Certificate Number', 'value': 'STAN-CS-2023-001234', 'confidence': 96.8}
        ],
        'extractedText': '''
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
        ''',
        'overallConfidence': 93.2
    }
    
    # Convert OCR result to our verification format
    extracted_data = {}
    for field in simulated_ocr_result['extractedFields']:
        field_name = field['field'].lower().replace(' ', '_')
        if 'name' in field_name:
            extracted_data['student_name'] = field['value']
        elif 'institution' in field_name:
            extracted_data['institution'] = field['value']
        elif 'degree' in field_name or 'major' in field_name:
            degree_key = 'degree'
            if degree_key in extracted_data:
                extracted_data[degree_key] += f" {field['value']}"
            else:
                extracted_data[degree_key] = field['value']
        elif 'date' in field_name:
            extracted_data['graduation_date'] = field['value']
        elif 'number' in field_name:
            extracted_data['certificate_number'] = field['value']
    
    print("📄 OCR Extracted Fields:")
    for field in simulated_ocr_result['extractedFields']:
        print(f"   {field['field']}: {field['value']} ({field['confidence']}%)")
    
    print(f"\n📊 Overall OCR Confidence: {simulated_ocr_result['overallConfidence']}%")
    
    # Now verify against database
    db = CertificateDatabase()
    verification_result = db.verify_certificate(extracted_data)
    
    print(f"\n🔍 Database Verification Result:")
    print_verification_result("OCR Simulation", extracted_data, verification_result)
    
    db.close()
    
    return verification_result

if __name__ == "__main__":
    print("🎓 Certificate Verification System Test")
    print("=" * 60)
    
    # Run all test scenarios
    test_verification_scenarios()
    
    # Simulate OCR extraction and verification
    print("\n\n" + "=" * 60)
    print("OCR SIMULATION TEST")
    print("=" * 60)
    simulate_ocr_extraction()
    
    print("\n✅ All tests completed!")