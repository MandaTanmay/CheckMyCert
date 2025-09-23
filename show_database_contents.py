#!/usr/bin/env python3
"""
Show Database Contents
Display the current state of the SQLite verification database
"""

import sqlite3
import json
from datetime import datetime

def show_database_contents():
    """Display all data in the verification database"""
    
    print("📊 Certificate Verification Database Contents")
    print("=" * 60)
    
    try:
        # Connect to database
        conn = sqlite3.connect('backend/certificate_verification.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Show institutions
        print("\n🏛️  INSTITUTIONS")
        print("-" * 40)
        cursor.execute("SELECT * FROM institutions ORDER BY name")
        institutions = cursor.fetchall()
        
        for inst in institutions:
            print(f"📍 {inst['name']} ({inst['short_name']})")
            print(f"   Type: {inst['institution_type']}")
            print(f"   Location: {inst['city']}, {inst['state_province']}, {inst['country']}")
            print(f"   Verified: {'✅' if inst['is_verified'] else '❌'}")
            print(f"   Website: {inst['website']}")
            print()
        
        # Show certificates
        print("\n📜 INSTITUTIONAL CERTIFICATES")
        print("-" * 40)
        cursor.execute("""
            SELECT ic.*, i.name as institution_name 
            FROM institution_certificates ic
            JOIN institutions i ON ic.institution_id = i.id
            ORDER BY ic.certificate_issued_date DESC
        """)
        certificates = cursor.fetchall()
        
        for cert in certificates:
            print(f"🎓 {cert['student_name']}")
            print(f"   Institution: {cert['institution_name']}")
            print(f"   Degree: {cert['certificate_type']} in {cert['degree_program']}")
            if cert['major']:
                print(f"   Major: {cert['major']}")
            if cert['gpa']:
                print(f"   GPA: {cert['gpa']}")
            print(f"   Graduation: {cert['graduation_date']}")
            print(f"   Certificate #: {cert['certificate_number']}")
            print(f"   Status: {'❌ Revoked' if cert['is_revoked'] else '✅ Active'}")
            print()
        
        # Show verification results
        print("\n🔍 VERIFICATION RESULTS")
        print("-" * 40)
        cursor.execute("""
            SELECT vr.*, i.name as matched_institution_name,
                   ic.student_name as matched_student_name
            FROM verification_results vr
            LEFT JOIN institutions i ON vr.matched_institution_id = i.id
            LEFT JOIN institution_certificates ic ON vr.matched_record_id = ic.id
            ORDER BY vr.created_at DESC
            LIMIT 10
        """)
        verifications = cursor.fetchall()
        
        if verifications:
            for ver in verifications:
                print(f"🔍 Verification ID: {ver['id'][:20]}...")
                print(f"   Status: {ver['status'].upper()}")
                print(f"   Confidence: {ver['overall_confidence']:.1f}%")
                print(f"   Database Match: {'✅' if ver['database_match'] else '❌'}")
                
                if ver['matched_institution_name']:
                    print(f"   Matched Institution: {ver['matched_institution_name']}")
                if ver['matched_student_name']:
                    print(f"   Matched Student: {ver['matched_student_name']}")
                
                print(f"   QR Token: {ver['qr_token']}")
                print(f"   Created: {ver['created_at']}")
                
                # Show extracted fields if available
                if ver['extracted_fields']:
                    try:
                        fields = json.loads(ver['extracted_fields'])
                        print(f"   Extracted Data:")
                        for key, value in fields.items():
                            if value:
                                print(f"     {key}: {value}")
                    except:
                        pass
                print()
        else:
            print("   No verification results found")
        
        # Show comparison details
        print("\n📊 RECENT COMPARISONS")
        print("-" * 40)
        cursor.execute("""
            SELECT vc.*, vr.status as verification_status
            FROM verification_comparisons vc
            JOIN verification_results vr ON vc.verification_id = vr.id
            ORDER BY vc.created_at DESC
            LIMIT 15
        """)
        comparisons = cursor.fetchall()
        
        if comparisons:
            current_verification = None
            for comp in comparisons:
                if comp['verification_id'] != current_verification:
                    current_verification = comp['verification_id']
                    print(f"\n🔍 Verification: {current_verification[:20]}... ({comp['verification_status']})")
                
                status = "✅" if comp['is_match'] else "❌"
                print(f"   {status} {comp['comparison_type']}: {comp['match_confidence']:.1f}%")
                if not comp['is_match']:
                    print(f"      Extracted: '{comp['extracted_value']}'")
                    print(f"      Database:  '{comp['database_value']}'")
        else:
            print("   No comparison details found")
        
        # Show statistics
        print(f"\n📈 DATABASE STATISTICS")
        print("-" * 40)
        
        cursor.execute("SELECT COUNT(*) FROM institutions WHERE is_verified = 1")
        verified_institutions = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM institution_certificates WHERE is_revoked = 0")
        active_certificates = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM verification_results")
        total_verifications = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM verification_results WHERE database_match = 1")
        successful_matches = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM verification_results WHERE status = 'valid'")
        valid_certificates = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM verification_results WHERE status = 'tampered'")
        tampered_certificates = cursor.fetchone()[0]
        
        print(f"🏛️  Verified Institutions: {verified_institutions}")
        print(f"📜 Active Certificates: {active_certificates}")
        print(f"🔍 Total Verifications: {total_verifications}")
        print(f"✅ Successful Matches: {successful_matches}")
        print(f"🎉 Valid Certificates: {valid_certificates}")
        print(f"🚨 Tampered Certificates: {tampered_certificates}")
        
        if total_verifications > 0:
            match_rate = (successful_matches / total_verifications) * 100
            print(f"📊 Match Rate: {match_rate:.1f}%")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    except FileNotFoundError:
        print("❌ Database file not found. Run 'python backend/sqlite_setup.py' first.")

if __name__ == "__main__":
    show_database_contents()