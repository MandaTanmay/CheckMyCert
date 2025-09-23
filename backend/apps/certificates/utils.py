from .models import AuditLog, VerificationResult
import hashlib
import hmac
from django.conf import settings
import uuid

def create_audit_log(user=None, action=None, certificate=None, verification_result=None, 
                    bulk_job=None, ip_address=None, user_agent=None, details=None):
    """
    Create an audit log entry with immutable hash
    """
    if details is None:
        details = {}
    
    # Create audit log entry
    audit_log = AuditLog(
        user=user,
        action=action,
        certificate=certificate,
        verification_result=verification_result,
        bulk_job=bulk_job,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details
    )
    
    # Generate immutable hash
    audit_data = f"{user.id if user else 'anonymous'}:{action}:{certificate.id if certificate else ''}:{verification_result.id if verification_result else ''}:{details}"
    audit_log.audit_hash = hmac.new(
        settings.SECRET_KEY.encode(),
        audit_data.encode(),
        hashlib.sha256
    ).hexdigest()
    
    audit_log.save()
    return audit_log

def create_demo_result(certificate):
    """
    Create demo verification result for testing
    """
    # Create mock verification result
    result = VerificationResult.objects.create(
        certificate=certificate,
        status='valid',
        overall_confidence=94.5,
        extracted_text='Sample certificate text...',
        extracted_fields={
            'student_name': {
                'value': 'John Michael Smith',
                'confidence': 98,
                'coordinates': {'x': 150, 'y': 200, 'width': 200, 'height': 25}
            },
            'degree': {
                'value': 'Bachelor of Science in Computer Science',
                'confidence': 96,
                'coordinates': {'x': 120, 'y': 280, 'width': 350, 'height': 30}
            },
            'institution': {
                'value': 'Stanford University',
                'confidence': 99,
                'coordinates': {'x': 180, 'y': 120, 'width': 180, 'height': 35}
            },
            'graduation_date': {
                'value': 'June 15, 2023',
                'confidence': 92,
                'coordinates': {'x': 200, 'y': 350, 'width': 120, 'height': 20}
            }
        },
        ocr_confidence=95.2,
        tamper_detected=False,
        tamper_confidence=15.0,
        tamper_issues=[
            {
                'type': 'Font Inconsistency',
                'severity': 'low',
                'description': 'Minor font variation detected in date field',
                'coordinates': {'x': 200, 'y': 350, 'width': 120, 'height': 20}
            }
        ],
        database_match=True,
        signature_valid=True,
        signature_details={'signer': 'Stanford University', 'valid': True},
        qr_token=f"qr_{uuid.uuid4().hex}",
        verification_hash=hashlib.sha256(f"{certificate.id}:demo".encode()).hexdigest()
    )
    
    certificate.status = 'completed'
    certificate.save()
    
    return result
