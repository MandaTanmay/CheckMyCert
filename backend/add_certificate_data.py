#!/usr/bin/env python3
"""
Script to add new certificate data to the database
"""

import sqlite3
import uuid
from datetime import datetime, date

def add_srkr_institution():
    """Add SRKR Engineering College to institutions"""
    conn = sqlite3.connect('certificate_verification.db')
    cursor = conn.cursor()
    
    # Check if SRKR already exists
    cursor.execute("SELECT id FROM institutions WHERE short_name = 'SRKR'")
    if cursor.fetchone():
        print("SRKR institution already exists")
        return cursor.fetchone()[0] if cursor.fetchone() else 'srkr-001'
    
    institution_data = {
        'id': 'srkr-001',
        'name': 'SRKR Engineering College',
        'short_name': 'SRKR',
        'institution_type': 'college',
        'country': 'India',
        'state_province': 'Andhra Pradesh',
        'city': 'Bhimavaram',
        'website': 'https://www.srkr.ac.in',
        'email': 'info@srkr.ac.in',
        'is_verified': 1
    }
    
    cursor.execute('''
        INSERT INTO institutions (id, name, short_name, institution_type, country, 
                               state_province, city, website, email, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        institution_data['id'], institution_data['name'], institution_data['short_name'],
        institution_data['institution_type'], institution_data['country'], 
        institution_data['state_province'], institution_data['city'],
        institution_data['website'], institution_data['email'], institution_data['is_verified']
    ))
    
    conn.commit()
    conn.close()
    print("✅ SRKR Engineering College added successfully")
    return institution_data['id']

def add_certificate_data():
    """Add certificate data including Manoj's certificate"""
    conn = sqlite3.connect('certificate_verification.db')
    cursor = conn.cursor()
    
    # Ensure SRKR institution exists
    srkr_id = add_srkr_institution()
    
    certificates = [
        {
            'institution_id': srkr_id,
            'student_name': 'manoj',
            'student_id': 'SRKR2021001',
            'student_email': 'manoj@srkr.ac.in',
            'certificate_type': 'Bachelor of Technology',
            'degree_program': 'BTech',
            'major': 'Computer Science Engineering',
            'gpa': 8.5,
            'enrollment_date': '2021-07-15',
            'graduation_date': '2025-05-20',
            'certificate_issued_date': '2025-05-25',
            'certificate_number': '889889889'
        },
        {
            'institution_id': srkr_id,
            'student_name': 'Rajesh Kumar',
            'student_id': 'SRKR2021002',
            'student_email': 'rajesh@srkr.ac.in',
            'certificate_type': 'Bachelor of Technology',
            'degree_program': 'BTech',
            'major': 'Mechanical Engineering',
            'gpa': 7.8,
            'enrollment_date': '2021-07-15',
            'graduation_date': '2025-05-20',
            'certificate_issued_date': '2025-05-25',
            'certificate_number': 'SRKR-MECH-2025-002'
        },
        {
            'institution_id': srkr_id,
            'student_name': 'Priya Sharma',
            'student_id': 'SRKR2021003',
            'student_email': 'priya@srkr.ac.in',
            'certificate_type': 'Bachelor of Technology',
            'degree_program': 'BTech',
            'major': 'Electronics and Communication',
            'gpa': 8.9,
            'enrollment_date': '2021-07-15',
            'graduation_date': '2025-05-20',
            'certificate_issued_date': '2025-05-25',
            'certificate_number': 'SRKR-ECE-2025-003'
        },
        {
            'institution_id': srkr_id,
            'student_name': 'Ankit Reddy',
            'student_id': 'SRKR2021004',
            'student_email': 'ankit@srkr.ac.in',
            'certificate_type': 'Master of Technology',
            'degree_program': 'MTech',
            'major': 'Computer Science',
            'gpa': 9.2,
            'enrollment_date': '2023-07-10',
            'graduation_date': '2025-05-30',
            'certificate_issued_date': '2025-06-01',
            'certificate_number': 'SRKR-CS-MTECH-2025-004'
        }
    ]
    
    for cert in certificates:
        # Check if certificate already exists
        cursor.execute("SELECT id FROM institution_certificates WHERE certificate_number = ?", 
                      (cert['certificate_number'],))
        if cursor.fetchone():
            print(f"Certificate {cert['certificate_number']} already exists, skipping...")
            continue
            
        cursor.execute('''
            INSERT INTO institution_certificates 
            (institution_id, student_name, student_id, student_email, certificate_type,
             degree_program, major, gpa, enrollment_date, graduation_date,
             certificate_issued_date, certificate_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            cert['institution_id'], cert['student_name'], cert['student_id'],
            cert['student_email'], cert['certificate_type'], cert['degree_program'],
            cert['major'], cert['gpa'], cert['enrollment_date'],
            cert['graduation_date'], cert['certificate_issued_date'], 
            cert['certificate_number']
        ))
        
        print(f"✅ Added certificate for {cert['student_name']} - {cert['certificate_number']}")
    
    conn.commit()
    conn.close()
    print("✅ All certificate data added successfully")

def list_certificates():
    """List all certificates in the database"""
    conn = sqlite3.connect('certificate_verification.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT ic.student_name, ic.certificate_number, ic.certificate_type, 
               ic.degree_program, ic.graduation_date, i.name as institution_name
        FROM institution_certificates ic
        JOIN institutions i ON ic.institution_id = i.id
        ORDER BY ic.graduation_date DESC
    ''')
    
    certificates = cursor.fetchall()
    
    print("\n📜 All Certificates in Database:")
    print("-" * 80)
    for cert in certificates:
        print(f"Name: {cert[0]}")
        print(f"Certificate #: {cert[1]}")
        print(f"Degree: {cert[2]} in {cert[3]}")
        print(f"Institution: {cert[5]}")
        print(f"Graduation: {cert[4]}")
        print("-" * 40)
    
    conn.close()

if __name__ == "__main__":
    print("Adding certificate data to database...")
    add_certificate_data()
    print("\nCurrent certificates in database:")
    list_certificates()