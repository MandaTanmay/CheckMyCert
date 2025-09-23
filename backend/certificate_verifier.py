"""
Certificate Verification Integration
Connects the verification results from the frontend with SQLite database comparison
"""

import json
import uuid
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from sqlite_setup import CertificateDatabase

class CertificateVerifier:
    """
    Main class for certificate verification that integrates with the existing system
    """
    
    def __init__(self, db_path="certificate_verification.db"):
        """Initialize the verifier with SQLite database"""
        self.db_path = os.path.join(current_dir, db_path)
        self.db = CertificateDatabase(self.db_path)
    
    def process_verification_result(self, verification_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process verification result from the frontend and compare with database
        
        Args:
            verification_result: The result object from your verification results page
            
        Returns:
            Enhanced verification result with database comparison
        """
        
        # Extract data from the verification result
        extracted_data = self._extract_certificate_data(verification_result)
        
        # Perform database verification
        db_verification = self.db.verify_certificate(extracted_data)
        
        # Enhance the original result with database information
        enhanced_result = verification_result.copy()
        enhanced_result.update({
            'database_verification': db_verification,
            'centralized_match': db_verification['database_match'],
            'match_confidence': db_verification['confidence_score'],
            'verification_status_enhanced': self._determine_final_status(
                verification_result, db_verification
            ),
            'comparison_details': db_verification['comparison_details'],
            'matched_institution_info': db_verification['matched_institution'],
            'matched_certificate_info': db_verification['matched_record']
        })
        
        # Save the verification result (generate new ID to avoid conflicts)
        verification_id = f"{verification_result.get('id', str(uuid.uuid4()))}_{uuid.uuid4().hex[:8]}"
        self.db.save_verification_result(verification_id, extracted_data, db_verification)
        
        return enhanced_result
    
    def _extract_certificate_data(self, verification_result: Dict[str, Any]) -> Dict[str, str]:
        """
        Extract certificate data from verification result for database comparison
        """
        extracted_data = {}
        
        # Extract from extractedFields if available
        extracted_fields = verification_result.get('extractedFields', [])
        for field in extracted_fields:
            field_name = field.get('field', '').lower()
            field_value = field.get('value', '')
            
            if 'name' in field_name and 'student' in field_name:
                extracted_data['student_name'] = field_value
            elif 'name' in field_name:
                extracted_data['student_name'] = field_value
            elif 'institution' in field_name or 'university' in field_name or 'college' in field_name:
                extracted_data['institution'] = field_value
            elif 'degree' in field_name or 'program' in field_name:
                if 'degree' in extracted_data:
                    extracted_data['degree'] += f" {field_value}"
                else:
                    extracted_data['degree'] = field_value
            elif 'major' in field_name or 'subject' in field_name:
                if 'degree' in extracted_data:
                    extracted_data['degree'] += f" {field_value}"
                else:
                    extracted_data['degree'] = field_value
            elif 'date' in field_name and ('graduation' in field_name or 'completion' in field_name):
                extracted_data['graduation_date'] = field_value
            elif 'number' in field_name or 'certificate' in field_name:
                extracted_data['certificate_number'] = field_value
        
        # Also try to extract from raw text if fields are not available
        extracted_text = verification_result.get('extractedText', '')
        if extracted_text and not extracted_data:
            extracted_data = self._parse_text_for_certificate_data(extracted_text)
        
        return extracted_data
    
    def _parse_text_for_certificate_data(self, text: str) -> Dict[str, str]:
        """
        Parse raw extracted text to find certificate information
        """
        data = {}
        lines = text.split('\n')
        
        # Simple parsing logic - can be enhanced with regex or NLP
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Look for patterns
            if 'university' in line.lower() or 'college' in line.lower():
                data['institution'] = line
            elif 'bachelor' in line.lower() or 'master' in line.lower() or 'degree' in line.lower():
                data['degree'] = line
            elif any(month in line.lower() for month in ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']):
                data['graduation_date'] = line
            elif 'certificate number' in line.lower() or 'cert no' in line.lower():
                # Look for the number in this line or the next
                if ':' in line:
                    data['certificate_number'] = line.split(':')[-1].strip()
                elif i + 1 < len(lines):
                    data['certificate_number'] = lines[i + 1].strip()
        
        # Try to find student name (usually appears after "certify that" or similar)
        text_lower = text.lower()
        name_indicators = ['certify that', 'hereby certifies that', 'this certifies that']
        
        for indicator in name_indicators:
            if indicator in text_lower:
                start_idx = text_lower.find(indicator) + len(indicator)
                remaining_text = text[start_idx:start_idx + 200]  # Look in next 200 chars
                lines_after = remaining_text.split('\n')
                
                for line in lines_after:
                    line = line.strip()
                    if line and not any(word in line.lower() for word in ['has', 'successfully', 'completed', 'requirements']):
                        # This might be the name
                        if len(line.split()) >= 2:  # At least first and last name
                            data['student_name'] = line
                            break
                break
        
        return data
    
    def _determine_final_status(self, verification_result: Dict[str, Any], db_verification: Dict[str, Any]) -> str:
        """
        Determine final verification status combining OCR and database results
        """
        ocr_status = verification_result.get('status', 'unverified')
        db_status = db_verification.get('verification_status', 'unverified')
        db_match = db_verification.get('database_match', False)
        confidence = db_verification.get('confidence_score', 0)
        
        # If database has a high-confidence match and OCR is valid
        if db_match and confidence >= 90 and ocr_status == 'valid':
            return 'verified_authentic'
        
        # If database match but lower confidence
        elif db_match and confidence >= 70:
            return 'verified_with_concerns'
        
        # If no database match but OCR looks good
        elif not db_match and ocr_status == 'valid':
            return 'unverified_no_database_record'
        
        # If OCR detected tampering
        elif ocr_status == 'tampered':
            return 'tampered_detected'
        
        # Default case
        else:
            return 'unverified'
    
    def verify_certificate_by_id(self, certificate_id: str) -> Optional[Dict[str, Any]]:
        """
        Verify a certificate by its ID (for API endpoints)
        """
        # This would integrate with your existing Django models
        # For now, return a mock result
        
        mock_verification_result = {
            'id': certificate_id,
            'status': 'valid',
            'overallConfidence': 93.2,
            'extractedFields': [
                {'field': 'Student Name', 'value': 'John Michael Smith', 'confidence': 95.2},
                {'field': 'Institution', 'value': 'Stanford University', 'confidence': 98.7},
                {'field': 'Degree', 'value': 'Bachelor of Science Computer Science', 'confidence': 92.1},
                {'field': 'Graduation Date', 'value': 'June 15, 2023', 'confidence': 87.3},
                {'field': 'Certificate Number', 'value': 'STAN-CS-2023-001234', 'confidence': 96.8}
            ],
            'extractedText': 'STANFORD UNIVERSITY\n\nThis is to certify that\n\nJOHN MICHAEL SMITH\n\nhas successfully completed...',
            'tamperIssues': [],
            'signatureValid': True,
            'databaseMatch': False,  # This will be updated by our verification
            'processedAt': datetime.now().isoformat()
        }
        
        return self.process_verification_result(mock_verification_result)
    
    def get_verification_summary(self) -> Dict[str, Any]:
        """
        Get summary of all verifications performed
        """
        stats = self.db.get_verification_stats()
        
        return {
            'database_stats': stats,
            'verification_categories': {
                'verified_authentic': 'Certificate is valid and matches database records',
                'verified_with_concerns': 'Certificate matches database but with some discrepancies',
                'unverified_no_database_record': 'Certificate appears valid but no database record found',
                'tampered_detected': 'Certificate shows signs of tampering',
                'unverified': 'Certificate could not be verified'
            }
        }
    
    def close(self):
        """Close database connection"""
        if self.db:
            self.db.close()

# Example usage and testing
def test_integration():
    """Test the integration with sample data"""
    
    verifier = CertificateVerifier()
    
    # Sample verification result (as would come from your frontend)
    sample_result = {
        'id': str(uuid.uuid4()),
        'status': 'valid',
        'overallConfidence': 93.2,
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
        ''',
        'tamperIssues': [],
        'signatureValid': True,
        'databaseMatch': False,
        'processedAt': datetime.now().isoformat()
    }
    
    print("🔍 Testing Certificate Verification Integration")
    print("=" * 60)
    
    # Process the verification
    enhanced_result = verifier.process_verification_result(sample_result)
    
    print("📋 Original Verification Result:")
    print(f"   Status: {sample_result['status']}")
    print(f"   OCR Confidence: {sample_result['overallConfidence']}%")
    print(f"   Database Match: {sample_result['databaseMatch']}")
    
    print("\n🔍 Enhanced Verification Result:")
    print(f"   Final Status: {enhanced_result['verification_status_enhanced']}")
    print(f"   Centralized Match: {enhanced_result['centralized_match']}")
    print(f"   Match Confidence: {enhanced_result['match_confidence']:.1f}%")
    
    if enhanced_result['matched_institution_info']:
        print(f"   Matched Institution: {enhanced_result['matched_institution_info']['name']}")
    
    if enhanced_result['matched_certificate_info']:
        print(f"   Matched Student: {enhanced_result['matched_certificate_info']['student_name']}")
        print(f"   Certificate Number: {enhanced_result['matched_certificate_info']['certificate_number']}")
    
    print("\n📊 Field Comparisons:")
    for comp in enhanced_result['comparison_details']:
        status = "✓" if comp['is_match'] else "✗"
        print(f"   {status} {comp['field']}: {comp['confidence']:.1f}%")
    
    # Final determination
    final_status = enhanced_result['verification_status_enhanced']
    if final_status == 'verified_authentic':
        print(f"\n🎉 CERTIFICATE IS AUTHENTIC!")
        print(f"   ✅ The person IS issued this certificate by the institution.")
    elif final_status == 'verified_with_concerns':
        print(f"\n⚠️  CERTIFICATE VERIFIED WITH CONCERNS")
        print(f"   ⚠️  The certificate matches database records but has some discrepancies.")
    else:
        print(f"\n❌ CERTIFICATE VERIFICATION FAILED")
        print(f"   ❌ The person may NOT be issued this certificate.")
    
    # Get summary
    summary = verifier.get_verification_summary()
    print(f"\n📊 Verification System Summary:")
    print(f"   Total Institutions: {summary['database_stats']['verified_institutions']}")
    print(f"   Total Certificates: {summary['database_stats']['active_certificates']}")
    print(f"   Total Verifications: {summary['database_stats']['total_verifications']}")
    print(f"   Match Rate: {summary['database_stats']['match_rate']}%")
    
    verifier.close()

def main():
    """Main function to handle command line arguments"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Certificate Verification Tool')
    parser.add_argument('--verify', action='store_true', help='Perform verification')
    parser.add_argument('--data', type=str, help='JSON string of extracted certificate data')
    parser.add_argument('--job-id', type=str, help='Job ID for this verification')
    parser.add_argument('--db-path', type=str, default='certificate_verification.db', help='Database path')
    parser.add_argument('--test', action='store_true', help='Run test integration')
    
    args = parser.parse_args()
    
    if args.test:
        test_integration()
        return
    
    if args.verify:
        if not args.data or not args.job_id:
            print(json.dumps({
                "error": "Missing required arguments: --data and --job-id are required for verification"
            }))
            sys.exit(1)
        
        try:
            # Parse the input data
            extracted_data = json.loads(args.data)
            
            # Initialize verifier
            verifier = CertificateVerifier(args.db_path)
            
            # Perform database verification
            verification_result = verifier.db.verify_certificate(extracted_data)
            
            # Print result as JSON for the API to parse
            print(json.dumps(verification_result, default=str))
            
            verifier.close()
            
        except json.JSONDecodeError as e:
            print(json.dumps({
                "error": f"Invalid JSON data: {str(e)}"
            }))
            sys.exit(1)
        except Exception as e:
            print(json.dumps({
                "error": f"Verification failed: {str(e)}"
            }))
            sys.exit(1)
    else:
        # Default: show help
        parser.print_help()

if __name__ == "__main__":
    main()