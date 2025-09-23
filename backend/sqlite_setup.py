#!/usr/bin/env python3
"""
SQLite Database Setup for Certificate Verification
Creates a duplicate database in SQLite for testing and comparison
"""

import sqlite3
import json
import hashlib
from datetime import datetime, date
from pathlib import Path
import uuid

class CertificateDatabase:
    def __init__(self, db_path="certificate_verification.db"):
        self.db_path = db_path
        self.conn = None
        self.setup_database()
    
    def setup_database(self):
        """Initialize SQLite database with certificate verification tables"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row  # Enable dict-like access
        
        # Create tables
        self.create_tables()
        self.populate_sample_data()
        
    def create_tables(self):
        """Create all necessary tables for certificate verification"""
        cursor = self.conn.cursor()
        
        # Institutions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS institutions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                short_name TEXT,
                institution_type TEXT NOT NULL,
                country TEXT NOT NULL,
                state_province TEXT,
                city TEXT NOT NULL,
                website TEXT,
                email TEXT,
                phone TEXT,
                is_verified BOOLEAN DEFAULT 0,
                api_key TEXT,
                webhook_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Institution certificates (centralized database)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS institution_certificates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                institution_id TEXT NOT NULL,
                student_name TEXT NOT NULL,
                student_id TEXT,
                student_email TEXT,
                certificate_type TEXT NOT NULL,
                degree_program TEXT,
                major TEXT,
                minor TEXT,
                gpa REAL,
                enrollment_date DATE,
                graduation_date DATE,
                certificate_issued_date DATE NOT NULL,
                certificate_number TEXT UNIQUE NOT NULL,
                is_revoked BOOLEAN DEFAULT 0,
                revocation_reason TEXT,
                additional_data TEXT, -- JSON string
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (institution_id) REFERENCES institutions (id)
            )
        ''')
        
        # Verification results table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS verification_results (
                id TEXT PRIMARY KEY,
                certificate_id TEXT,
                status TEXT NOT NULL, -- valid, tampered, unverified
                overall_confidence REAL NOT NULL,
                extracted_text TEXT,
                extracted_fields TEXT, -- JSON string
                ocr_confidence REAL,
                tamper_detected BOOLEAN DEFAULT 0,
                tamper_confidence REAL,
                tamper_issues TEXT, -- JSON string
                database_match BOOLEAN DEFAULT 0,
                matched_institution_id TEXT,
                matched_record_id INTEGER,
                signature_valid BOOLEAN DEFAULT 0,
                signature_details TEXT, -- JSON string
                qr_token TEXT UNIQUE,
                qr_expires_at TIMESTAMP,
                verification_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (matched_institution_id) REFERENCES institutions (id),
                FOREIGN KEY (matched_record_id) REFERENCES institution_certificates (id)
            )
        ''')
        
        # Verification comparison logs
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS verification_comparisons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                verification_id TEXT NOT NULL,
                comparison_type TEXT NOT NULL, -- name_match, certificate_number_match, etc.
                extracted_value TEXT,
                database_value TEXT,
                match_confidence REAL,
                is_match BOOLEAN,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (verification_id) REFERENCES verification_results (id)
            )
        ''')
        
        self.conn.commit()
        print("✅ Database tables created successfully")
    
    def populate_sample_data(self):
        """Add sample institutions and certificates for testing"""
        cursor = self.conn.cursor()
        
        # Check if data already exists
        cursor.execute("SELECT COUNT(*) FROM institutions")
        if cursor.fetchone()[0] > 0:
            print("📊 Sample data already exists")
            return
        
        # Sample institutions
        institutions = [
            {
                'id': str(uuid.uuid4()),
                'name': 'Stanford University',
                'short_name': 'Stanford',
                'institution_type': 'university',
                'country': 'United States',
                'state_province': 'California',
                'city': 'Stanford',
                'website': 'https://www.stanford.edu',
                'email': 'registrar@stanford.edu',
                'is_verified': 1
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'Massachusetts Institute of Technology',
                'short_name': 'MIT',
                'institution_type': 'university',
                'country': 'United States',
                'state_province': 'Massachusetts',
                'city': 'Cambridge',
                'website': 'https://www.mit.edu',
                'email': 'registrar@mit.edu',
                'is_verified': 1
            },
            {
                'id': str(uuid.uuid4()),
                'name': 'University of California, Berkeley',
                'short_name': 'UC Berkeley',
                'institution_type': 'university',
                'country': 'United States',
                'state_province': 'California',
                'city': 'Berkeley',
                'website': 'https://www.berkeley.edu',
                'email': 'registrar@berkeley.edu',
                'is_verified': 1
            }
        ]
        
        for inst in institutions:
            cursor.execute('''
                INSERT INTO institutions (id, name, short_name, institution_type, country, 
                                       state_province, city, website, email, is_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (inst['id'], inst['name'], inst['short_name'], inst['institution_type'],
                  inst['country'], inst['state_province'], inst['city'], inst['website'],
                  inst['email'], inst['is_verified']))
        
        # Sample certificates
        stanford_id = institutions[0]['id']
        mit_id = institutions[1]['id']
        berkeley_id = institutions[2]['id']
        
        certificates = [
            {
                'institution_id': stanford_id,
                'student_name': 'John Michael Smith',
                'student_id': 'STU123456',
                'student_email': 'john.smith@stanford.edu',
                'certificate_type': 'Bachelor of Science',
                'degree_program': 'Computer Science',
                'major': 'Computer Science',
                'gpa': 3.85,
                'enrollment_date': '2019-09-01',
                'graduation_date': '2023-06-15',
                'certificate_issued_date': '2023-06-20',
                'certificate_number': 'STAN-CS-2023-001234'
            },
            {
                'institution_id': mit_id,
                'student_name': 'Sarah Johnson',
                'student_id': 'MIT987654',
                'student_email': 'sarah.johnson@mit.edu',
                'certificate_type': 'Master of Science',
                'degree_program': 'Electrical Engineering',
                'major': 'Electrical Engineering',
                'gpa': 3.92,
                'enrollment_date': '2021-09-01',
                'graduation_date': '2023-05-25',
                'certificate_issued_date': '2023-06-01',
                'certificate_number': 'MIT-EE-2023-005678'
            },
            {
                'institution_id': berkeley_id,
                'student_name': 'Michael Chen',
                'student_id': 'UCB456789',
                'student_email': 'michael.chen@berkeley.edu',
                'certificate_type': 'Bachelor of Arts',
                'degree_program': 'Business Administration',
                'major': 'Business Administration',
                'minor': 'Economics',
                'gpa': 3.67,
                'enrollment_date': '2020-08-15',
                'graduation_date': '2024-05-10',
                'certificate_issued_date': '2024-05-15',
                'certificate_number': 'UCB-BA-2024-009876'
            },
            {
                'institution_id': stanford_id,
                'student_name': 'Emily Rodriguez',
                'student_id': 'STU789012',
                'student_email': 'emily.rodriguez@stanford.edu',
                'certificate_type': 'Master of Business Administration',
                'degree_program': 'Business Administration',
                'major': 'Business Administration',
                'gpa': 3.78,
                'enrollment_date': '2022-09-01',
                'graduation_date': '2024-06-15',
                'certificate_issued_date': '2024-06-20',
                'certificate_number': 'STAN-MBA-2024-002468'
            }
        ]
        
        for cert in certificates:
            cursor.execute('''
                INSERT INTO institution_certificates 
                (institution_id, student_name, student_id, student_email, certificate_type,
                 degree_program, major, minor, gpa, enrollment_date, graduation_date,
                 certificate_issued_date, certificate_number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (cert['institution_id'], cert['student_name'], cert['student_id'],
                  cert['student_email'], cert['certificate_type'], cert['degree_program'],
                  cert['major'], cert.get('minor'), cert['gpa'], cert['enrollment_date'],
                  cert['graduation_date'], cert['certificate_issued_date'], cert['certificate_number']))
        
        self.conn.commit()
        print("✅ Sample data populated successfully")
    
    def verify_certificate(self, extracted_data):
        """
        Compare extracted certificate data with centralized database
        
        Args:
            extracted_data (dict): Data extracted from certificate OCR
            
        Returns:
            dict: Verification result with match details
        """
        cursor = self.conn.cursor()
        
        # Extract key fields for comparison
        student_name = extracted_data.get('student_name', '').strip()
        certificate_number = extracted_data.get('certificate_number', '').strip()
        institution_name = extracted_data.get('institution', '').strip()
        degree = extracted_data.get('degree', '').strip()
        graduation_date = extracted_data.get('graduation_date', '').strip()
        
        verification_result = {
            'database_match': False,
            'matched_record': None,
            'matched_institution': None,
            'comparison_details': [],
            'confidence_score': 0.0,
            'verification_status': 'unverified'
        }
        
        # Try to find exact certificate number match first
        if certificate_number:
            cursor.execute('''
                SELECT ic.*, i.name as institution_name, i.short_name
                FROM institution_certificates ic
                JOIN institutions i ON ic.institution_id = i.id
                WHERE ic.certificate_number = ? AND ic.is_revoked = 0
            ''', (certificate_number,))
            
            exact_match = cursor.fetchone()
            if exact_match:
                verification_result['database_match'] = True
                verification_result['matched_record'] = dict(exact_match)
                verification_result['matched_institution'] = {
                    'id': exact_match['institution_id'],
                    'name': exact_match['institution_name'],
                    'short_name': exact_match['short_name']
                }
                
                # Compare all fields for confidence scoring
                comparisons = self._compare_fields(extracted_data, dict(exact_match))
                verification_result['comparison_details'] = comparisons
                
                # Calculate overall confidence
                total_score = sum(comp['confidence'] for comp in comparisons)
                verification_result['confidence_score'] = total_score / len(comparisons) if comparisons else 0
                
                # Determine verification status
                if verification_result['confidence_score'] >= 90:
                    verification_result['verification_status'] = 'valid'
                elif verification_result['confidence_score'] >= 70:
                    verification_result['verification_status'] = 'unverified'
                else:
                    verification_result['verification_status'] = 'tampered'
                
                return verification_result
        
        # If no exact certificate number match, try fuzzy matching
        if student_name and institution_name:
            cursor.execute('''
                SELECT ic.*, i.name as institution_name, i.short_name
                FROM institution_certificates ic
                JOIN institutions i ON ic.institution_id = i.id
                WHERE (LOWER(ic.student_name) LIKE LOWER(?) OR LOWER(i.name) LIKE LOWER(?))
                AND ic.is_revoked = 0
                ORDER BY 
                    CASE 
                        WHEN LOWER(ic.student_name) = LOWER(?) THEN 1
                        WHEN LOWER(i.name) = LOWER(?) THEN 2
                        ELSE 3
                    END
                LIMIT 5
            ''', (f'%{student_name}%', f'%{institution_name}%', student_name, institution_name))
            
            potential_matches = cursor.fetchall()
            
            best_match = None
            best_confidence = 0
            
            for match in potential_matches:
                comparisons = self._compare_fields(extracted_data, dict(match))
                confidence = sum(comp['confidence'] for comp in comparisons) / len(comparisons) if comparisons else 0
                
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_match = match
                    verification_result['comparison_details'] = comparisons
            
            if best_match and best_confidence >= 60:  # Minimum threshold for fuzzy match
                verification_result['database_match'] = True
                verification_result['matched_record'] = dict(best_match)
                verification_result['matched_institution'] = {
                    'id': best_match['institution_id'],
                    'name': best_match['institution_name'],
                    'short_name': best_match['short_name']
                }
                verification_result['confidence_score'] = best_confidence
                
                if best_confidence >= 85:
                    verification_result['verification_status'] = 'valid'
                elif best_confidence >= 60:
                    verification_result['verification_status'] = 'unverified'
                else:
                    verification_result['verification_status'] = 'tampered'
        
        return verification_result
    
    def _compare_fields(self, extracted_data, db_record):
        """Compare extracted fields with database record"""
        comparisons = []
        
        # Name comparison
        extracted_name = extracted_data.get('student_name', '').strip().lower()
        db_name = db_record.get('student_name', '').strip().lower()
        name_confidence = self._calculate_string_similarity(extracted_name, db_name)
        comparisons.append({
            'field': 'student_name',
            'extracted_value': extracted_name,
            'database_value': db_name,
            'confidence': name_confidence,
            'is_match': name_confidence >= 80
        })
        
        # Certificate number comparison
        extracted_cert_num = extracted_data.get('certificate_number', '').strip()
        db_cert_num = db_record.get('certificate_number', '').strip()
        cert_num_confidence = 100 if extracted_cert_num == db_cert_num else 0
        comparisons.append({
            'field': 'certificate_number',
            'extracted_value': extracted_cert_num,
            'database_value': db_cert_num,
            'confidence': cert_num_confidence,
            'is_match': cert_num_confidence == 100
        })
        
        # Degree comparison
        extracted_degree = extracted_data.get('degree', '').strip().lower()
        db_degree = f"{db_record.get('certificate_type', '')} {db_record.get('degree_program', '')}".strip().lower()
        degree_confidence = self._calculate_string_similarity(extracted_degree, db_degree)
        comparisons.append({
            'field': 'degree',
            'extracted_value': extracted_degree,
            'database_value': db_degree,
            'confidence': degree_confidence,
            'is_match': degree_confidence >= 70
        })
        
        # Institution comparison
        extracted_institution = extracted_data.get('institution', '').strip().lower()
        db_institution = db_record.get('institution_name', '').strip().lower()
        institution_confidence = self._calculate_string_similarity(extracted_institution, db_institution)
        comparisons.append({
            'field': 'institution',
            'extracted_value': extracted_institution,
            'database_value': db_institution,
            'confidence': institution_confidence,
            'is_match': institution_confidence >= 80
        })
        
        # Date comparison (if available)
        extracted_date = extracted_data.get('graduation_date', '').strip()
        db_date = str(db_record.get('graduation_date', '')).strip()
        if extracted_date and db_date:
            date_confidence = 100 if extracted_date == db_date else 0
            comparisons.append({
                'field': 'graduation_date',
                'extracted_value': extracted_date,
                'database_value': db_date,
                'confidence': date_confidence,
                'is_match': date_confidence == 100
            })
        
        return comparisons
    
    def _calculate_string_similarity(self, str1, str2):
        """Calculate similarity between two strings using simple algorithm"""
        if not str1 or not str2:
            return 0
        
        str1, str2 = str1.lower().strip(), str2.lower().strip()
        
        if str1 == str2:
            return 100
        
        # Simple word-based similarity
        words1 = set(str1.split())
        words2 = set(str2.split())
        
        if not words1 or not words2:
            return 0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        similarity = (len(intersection) / len(union)) * 100
        return round(similarity, 2)
    
    def save_verification_result(self, verification_id, extracted_data, verification_result):
        """Save verification result to database"""
        cursor = self.conn.cursor()
        
        # Create verification hash
        verification_hash = hashlib.sha256(
            f"{verification_id}{json.dumps(extracted_data, sort_keys=True)}".encode()
        ).hexdigest()
        
        # Generate unique QR token
        import time
        qr_token = f"qr_{verification_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{int(time.time() * 1000) % 10000}"
        
        cursor.execute('''
            INSERT INTO verification_results 
            (id, status, overall_confidence, extracted_fields, database_match,
             matched_institution_id, matched_record_id, verification_hash, qr_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            verification_id,
            verification_result['verification_status'],
            verification_result['confidence_score'],
            json.dumps(extracted_data),
            verification_result['database_match'],
            verification_result['matched_institution']['id'] if verification_result['matched_institution'] else None,
            verification_result['matched_record']['id'] if verification_result['matched_record'] else None,
            verification_hash,
            qr_token
        ))
        
        # Save comparison details
        for comparison in verification_result['comparison_details']:
            cursor.execute('''
                INSERT INTO verification_comparisons
                (verification_id, comparison_type, extracted_value, database_value,
                 match_confidence, is_match)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                verification_id,
                comparison['field'],
                comparison['extracted_value'],
                comparison['database_value'],
                comparison['confidence'],
                comparison['is_match']
            ))
        
        self.conn.commit()
        print(f"✅ Verification result saved for ID: {verification_id}")
    
    def get_verification_stats(self):
        """Get database statistics"""
        cursor = self.conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM institutions WHERE is_verified = 1")
        verified_institutions = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM institution_certificates WHERE is_revoked = 0")
        active_certificates = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM verification_results")
        total_verifications = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM verification_results WHERE database_match = 1")
        successful_matches = cursor.fetchone()[0]
        
        return {
            'verified_institutions': verified_institutions,
            'active_certificates': active_certificates,
            'total_verifications': total_verifications,
            'successful_matches': successful_matches,
            'match_rate': round((successful_matches / total_verifications * 100), 2) if total_verifications > 0 else 0
        }
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

if __name__ == "__main__":
    # Initialize database
    db = CertificateDatabase()
    
    # Display stats
    stats = db.get_verification_stats()
    print("\n📊 Database Statistics:")
    print(f"   Verified Institutions: {stats['verified_institutions']}")
    print(f"   Active Certificates: {stats['active_certificates']}")
    print(f"   Total Verifications: {stats['total_verifications']}")
    print(f"   Successful Matches: {stats['successful_matches']}")
    print(f"   Match Rate: {stats['match_rate']}%")
    
    db.close()