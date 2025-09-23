#!/usr/bin/env python3
"""
Add new certificate record to the database
"""

import sqlite3
import uuid
from datetime import datetime
import os

# Get the path to the database
backend_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(backend_dir, 'certificate_verification.db')

def add_new_certificate():
    """Add the new certificate record to the database"""
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # First, add the new institution (SRKR)
    institution_data = {
        'id': str(uuid.uuid4()),
        'name': 'SRKR Engineering College',
        'short_name': 'SRKR',
        'institution_type': 'college',
        'country': 'India',
        'state_province': 'Andhra Pradesh',
        'city': 'Bhimavaram',
        'website': 'https://www.srkr.ac.in',
        'email': 'registrar@srkr.ac.in',
        'is_verified': 1
    }
    
    # Check if institution already exists
    cursor.execute("SELECT id FROM institutions WHERE name = ? OR short_name = ?", 
                   (institution_data['name'], institution_data['short_name']))
    existing_institution = cursor.fetchone()
    
    if existing_institution:
        institution_id = existing_institution['id']
        print(f"✓ Institution already exists: {institution_data['name']}")
    else:
        cursor.execute('''
            INSERT INTO institutions (id, name, short_name, institution_type, country, 
                                   state_province, city, website, email, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (institution_data['id'], institution_data['name'], institution_data['short_name'], 
              institution_data['institution_type'], institution_data['country'], 
              institution_data['state_province'], institution_data['city'], 
              institution_data['website'], institution_data['email'], institution_data['is_verified']))
        
        institution_id = institution_data['id']
        print(f"✓ Added new institution: {institution_data['name']}")
    
    # Now add the certificate record
    certificate_data = {
        'institution_id': institution_id,
        'student_name': 'manoj',
        'student_id': 'SRKR001',
        'student_email': 'manoj@srkr.ac.in',
        'certificate_type': 'Bachelor of Technology',
        'degree_program': 'BTech',
        'major': 'Engineering',
        'gpa': 5.0,  # Assuming 5 is the grade on a 10-point scale
        'enrollment_date': '2021-09-01',  # Estimated
        'graduation_date': '2025-09-24',
        'certificate_issued_date': '2025-09-24',
        'certificate_number': '889889889'
    }
    
    # Check if certificate already exists
    cursor.execute("SELECT id FROM institution_certificates WHERE certificate_number = ?", 
                   (certificate_data['certificate_number'],))
    existing_cert = cursor.fetchone()
    
    if existing_cert:
        print(f"⚠️  Certificate already exists with number: {certificate_data['certificate_number']}")
    else:
        cursor.execute('''
            INSERT INTO institution_certificates 
            (institution_id, student_name, student_id, student_email, certificate_type,
             degree_program, major, gpa, enrollment_date, graduation_date,
             certificate_issued_date, certificate_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (certificate_data['institution_id'], certificate_data['student_name'], 
              certificate_data['student_id'], certificate_data['student_email'], 
              certificate_data['certificate_type'], certificate_data['degree_program'],
              certificate_data['major'], certificate_data['gpa'], 
              certificate_data['enrollment_date'], certificate_data['graduation_date'],
              certificate_data['certificate_issued_date'], certificate_data['certificate_number']))
        
        print(f"✓ Added new certificate for: {certificate_data['student_name']}")
        print(f"  - Institution: {institution_data['name']}")
        print(f"  - Degree: {certificate_data['certificate_type']} in {certificate_data['degree_program']}")
        print(f"  - Certificate Number: {certificate_data['certificate_number']}")
        print(f"  - Graduation Date: {certificate_data['graduation_date']}")
        print(f"  - Grade: {certificate_data['gpa']}")
    
    conn.commit()
    
    # Display updated statistics
    cursor.execute("SELECT COUNT(*) FROM institutions WHERE is_verified = 1")
    verified_institutions = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM institution_certificates WHERE is_revoked = 0")
    active_certificates = cursor.fetchone()[0]
    
    print(f"\n📊 Updated Database Statistics:")
    print(f"   Verified Institutions: {verified_institutions}")
    print(f"   Active Certificates: {active_certificates}")
    
    conn.close()

if __name__ == "__main__":
    print("🎓 Adding new certificate to database...")
    print("=" * 50)
    add_new_certificate()
    print("✅ Certificate added successfully!")