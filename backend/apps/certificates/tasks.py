from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.core.files.base import ContentFile
import os
import uuid
import hashlib
import hmac
import json
from datetime import datetime, timedelta

from .models import Certificate, VerificationResult, BulkVerificationJob
from .ocr_processor import OCRProcessor
from .tamper_detector import TamperDetector
from .signature_validator import SignatureValidator
from .database_matcher import DatabaseMatcher
from .utils import create_audit_log

@shared_task(bind=True)
def process_certificate_verification(self, certificate_id):
    """
    Main task for processing certificate verification
    """
    try:
        certificate = Certificate.objects.get(id=certificate_id)
        certificate.status = 'processing'
        certificate.save()
        
        # Initialize processors
        ocr_processor = OCRProcessor()
        tamper_detector = TamperDetector()
        signature_validator = SignatureValidator()
        database_matcher = DatabaseMatcher()
        
        # Step 1: OCR Processing
        self.update_state(state='PROGRESS', meta={'step': 'ocr', 'progress': 20})
        ocr_result = ocr_processor.process_certificate(
            certificate.file.path,
            language=certificate.ocr_language,
            translate=certificate.translate_enabled
        )
        
        # Step 2: Tamper Detection
        self.update_state(state='PROGRESS', meta={'step': 'tamper_detection', 'progress': 40})
        tamper_result = tamper_detector.analyze_document(certificate.file.path)
        
        # Step 3: Digital Signature Validation
        self.update_state(state='PROGRESS', meta={'step': 'signature_validation', 'progress': 60})
        signature_result = signature_validator.validate_signature(certificate.file.path)
        
        # Step 4: Database Matching
        self.update_state(state='PROGRESS', meta={'step': 'database_matching', 'progress': 80})
        database_result = database_matcher.find_matches(ocr_result['extracted_fields'])

        extracted_fields_payload = dict(ocr_result.get('extracted_fields') or {})
        word_coordinates = ocr_result.get('word_coordinates') or []
        line_coordinates = ocr_result.get('line_coordinates') or []
        if word_coordinates:
            extracted_fields_payload['_word_coordinates'] = word_coordinates
        if line_coordinates:
            extracted_fields_payload['_line_coordinates'] = line_coordinates
        
        # Step 5: Generate Overall Result
        self.update_state(state='PROGRESS', meta={'step': 'finalizing', 'progress': 90})
        overall_status, overall_confidence = calculate_overall_result(
            ocr_result, tamper_result, signature_result, database_result
        )
        
        # Create verification result
        verification_result = VerificationResult.objects.create(
            certificate=certificate,
            status=overall_status,
            overall_confidence=overall_confidence,
            extracted_text=ocr_result['raw_text'],
            extracted_fields=extracted_fields_payload,
            ocr_confidence=ocr_result['confidence'],
            tamper_detected=tamper_result['tamper_detected'],
            tamper_confidence=tamper_result['confidence'],
            tamper_issues=tamper_result['issues'],
            database_match=database_result['match_found'],
            matched_institution=database_result.get('institution'),
            matched_record=database_result.get('record'),
            signature_valid=signature_result['valid'],
            signature_details=signature_result['details'],
            qr_token=f"qr_{uuid.uuid4().hex}",
            qr_expires_at=timezone.now() + timedelta(days=30),
            verification_hash=generate_verification_hash(certificate, overall_status)
        )
        
        # Save tamper heatmap if available
        if tamper_result.get('heatmap_data'):
            heatmap_file = ContentFile(
                tamper_result['heatmap_data'],
                name=f"heatmap_{certificate.id}.png"
            )
            verification_result.tamper_heatmap.save(
                f"heatmap_{certificate.id}.png",
                heatmap_file
            )
        
        # Update certificate status
        certificate.status = 'completed'
        certificate.processed_at = timezone.now()
        certificate.save()
        
        # Create audit log
        create_audit_log(
            user=certificate.user,
            action='verify',
            certificate=certificate,
            verification_result=verification_result,
            details={'processing_time': (timezone.now() - certificate.uploaded_at).total_seconds()}
        )
        
        return {
            'status': 'success',
            'result_id': str(verification_result.id),
            'overall_status': overall_status,
            'confidence': overall_confidence
        }
        
    except Exception as exc:
        certificate.status = 'failed'
        certificate.save()
        
        create_audit_log(
            user=certificate.user,
            action='verify',
            certificate=certificate,
            details={'error': str(exc), 'status': 'failed'}
        )
        
        raise self.retry(exc=exc, countdown=60, max_retries=3)

@shared_task(bind=True)
def process_bulk_verification(self, bulk_job_id):
    """
    Process bulk verification job
    """
    try:
        bulk_job = BulkVerificationJob.objects.get(id=bulk_job_id)
        bulk_job.status = 'processing'
        bulk_job.started_at = timezone.now()
        bulk_job.save()
        
        # Parse input file (CSV or ZIP)
        certificates_data = parse_bulk_input_file(bulk_job.input_file.path)
        bulk_job.total_certificates = len(certificates_data)
        bulk_job.save()
        
        results = []
        
        for i, cert_data in enumerate(certificates_data):
            try:
                # Create temporary certificate record
                temp_cert = create_temp_certificate(bulk_job.user, cert_data)
                
                # Process verification
                result = process_single_bulk_certificate(temp_cert)
                results.append(result)
                
                bulk_job.processed_certificates += 1
                if result['status'] == 'valid':
                    bulk_job.successful_verifications += 1
                else:
                    bulk_job.failed_verifications += 1
                
                # Update progress
                progress = int((i + 1) / len(certificates_data) * 100)
                self.update_state(
                    state='PROGRESS',
                    meta={'progress': progress, 'processed': i + 1, 'total': len(certificates_data)}
                )
                
                bulk_job.save()
                
            except Exception as e:
                bulk_job.failed_verifications += 1
                bulk_job.processed_certificates += 1
                results.append({
                    'certificate_data': cert_data,
                    'status': 'error',
                    'error': str(e)
                })
                bulk_job.save()
        
        # Generate output report
        output_file_path = generate_bulk_report(bulk_job, results)
        bulk_job.output_file.name = output_file_path
        bulk_job.status = 'completed'
        bulk_job.completed_at = timezone.now()
        bulk_job.save()
        
        return {
            'status': 'success',
            'processed': bulk_job.processed_certificates,
            'successful': bulk_job.successful_verifications,
            'failed': bulk_job.failed_verifications
        }
        
    except Exception as exc:
        bulk_job.status = 'failed'
        bulk_job.save()
        raise self.retry(exc=exc, countdown=60, max_retries=2)

def calculate_overall_result(ocr_result, tamper_result, signature_result, database_result):
    """Calculate overall verification status and confidence"""
    confidence_scores = []
    
    # OCR confidence (weight: 0.2)
    if ocr_result['confidence']:
        confidence_scores.append(ocr_result['confidence'] * 0.2)
    
    # Tamper detection (weight: 0.4)
    if tamper_result['tamper_detected']:
        confidence_scores.append((100 - tamper_result['confidence']) * 0.4)
    else:
        confidence_scores.append(tamper_result['confidence'] * 0.4)
    
    # Database match (weight: 0.3)
    if database_result['match_found']:
        confidence_scores.append(database_result['confidence'] * 0.3)
    else:
        confidence_scores.append(0)
    
    # Digital signature (weight: 0.1)
    if signature_result['valid']:
        confidence_scores.append(100 * 0.1)
    else:
        confidence_scores.append(0)
    
    overall_confidence = sum(confidence_scores)
    
    # Determine status
    if tamper_result['tamper_detected'] and tamper_result['confidence'] > 70:
        status = 'tampered'
    elif overall_confidence >= 80:
        status = 'valid'
    else:
        status = 'unverified'
    
    return status, round(overall_confidence, 2)

def generate_verification_hash(certificate, status):
    """Generate immutable hash for audit trail"""
    data = f"{certificate.id}:{certificate.user.id}:{status}:{timezone.now().isoformat()}"
    return hashlib.sha256(data.encode()).hexdigest()

def parse_bulk_input_file(file_path):
    """Parse CSV or ZIP file for bulk processing"""
    # Implementation would handle CSV parsing or ZIP extraction
    # For now, return mock data
    return [
        {'filename': 'cert1.pdf', 'student_name': 'John Doe'},
        {'filename': 'cert2.pdf', 'student_name': 'Jane Smith'},
    ]

def create_temp_certificate(user, cert_data):
    """Create temporary certificate for bulk processing"""
    # Implementation would create temporary certificate records
    pass

def process_single_bulk_certificate(certificate):
    """Process a single certificate in bulk job"""
    # Implementation would process individual certificate
    return {'status': 'valid', 'confidence': 95}

def generate_bulk_report(bulk_job, results):
    """Generate CSV report for bulk verification results"""
    # Implementation would generate comprehensive CSV report
    return f"bulk_reports/report_{bulk_job.id}.csv"
