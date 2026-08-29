from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import get_valid_filename
import uuid
import os

User = get_user_model()

def certificate_upload_path(instance, filename):
    """Generate upload path for certificate files"""
    base_name, extension = os.path.splitext(filename)
    safe_base_name = get_valid_filename(base_name)[:40] or "certificate"
    safe_extension = extension[:10].lower()
    file_name = f"{uuid.uuid4().hex[:12]}_{safe_base_name}{safe_extension}"
    user_segment = str(instance.user.id)[:8]
    return f"certificates/{user_segment}/{file_name}"

def result_upload_path(instance, filename):
    """Generate upload path for result files"""
    return f'results/{instance.certificate.user.id}/{instance.id}/{filename}'

class Certificate(models.Model):
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='certificates')
    
    # File Information
    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to=certificate_upload_path, max_length=255)
    file_size = models.PositiveIntegerField()
    file_type = models.CharField(max_length=50)
    
    # Processing Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    celery_task_id = models.CharField(max_length=255, blank=True, null=True)
    
    # OCR Settings
    ocr_language = models.CharField(max_length=10, default='auto')
    translate_enabled = models.BooleanField(default=False)
    
    # Metadata
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'certificates'
        ordering = ['-uploaded_at']
        
    def __str__(self):
        return f"{self.original_filename} - {self.user.email}"
    
    def delete(self, *args, **kwargs):
        # Delete file when model is deleted
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs)

class VerificationResult(models.Model):
    VERIFICATION_STATUS = [
        ('valid', 'Valid'),
        ('tampered', 'Tampered'),
        ('unverified', 'Unverified'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    certificate = models.OneToOneField(Certificate, on_delete=models.CASCADE, related_name='result')
    
    # Overall Results
    status = models.CharField(max_length=20, choices=VERIFICATION_STATUS)
    overall_confidence = models.FloatField()
    
    # OCR Results
    extracted_text = models.TextField(blank=True, null=True)
    extracted_fields = models.JSONField(default=dict)
    ocr_confidence = models.FloatField(blank=True, null=True)
    
    # Tamper Detection
    tamper_detected = models.BooleanField(default=False)
    tamper_confidence = models.FloatField(blank=True, null=True)
    tamper_issues = models.JSONField(default=list)
    tamper_heatmap = models.ImageField(upload_to=result_upload_path, blank=True, null=True)
    
    # Database Verification
    database_match = models.BooleanField(default=False)
    matched_institution = models.ForeignKey(
        'institutions.Institution', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True
    )
    matched_record = models.ForeignKey(
        'institutions.InstitutionDatabase',
        on_delete=models.SET_NULL,
        blank=True,
        null=True
    )
    
    # Digital Signature
    signature_valid = models.BooleanField(default=False)
    signature_details = models.JSONField(default=dict)
    
    # QR Code for Public Verification
    qr_token = models.CharField(max_length=255, unique=True)
    qr_expires_at = models.DateTimeField(blank=True, null=True)
    
    # Audit Trail
    verification_hash = models.CharField(max_length=64)  # SHA-256 hash
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'verification_results'
        
    def __str__(self):
        return f"Result for {self.certificate.original_filename} - {self.status}"

class BulkVerificationJob(models.Model):
    JOB_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bulk_jobs')
    
    # Job Information
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=JOB_STATUS, default='pending')
    
    # Files
    input_file = models.FileField(upload_to='bulk_jobs/input/')
    output_file = models.FileField(upload_to='bulk_jobs/output/', blank=True, null=True)
    
    # Progress Tracking
    total_certificates = models.PositiveIntegerField(default=0)
    processed_certificates = models.PositiveIntegerField(default=0)
    successful_verifications = models.PositiveIntegerField(default=0)
    failed_verifications = models.PositiveIntegerField(default=0)
    
    # Celery Task
    celery_task_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'bulk_verification_jobs'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Bulk Job: {self.name} - {self.status}"

class AuditLog(models.Model):
    ACTION_TYPES = [
        ('upload', 'Certificate Upload'),
        ('verify', 'Verification'),
        ('download', 'Download Result'),
        ('share', 'Share Result'),
        ('qr_access', 'QR Code Access'),
        ('bulk_upload', 'Bulk Upload'),
        ('admin_action', 'Admin Action'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    
    # Related Objects
    certificate = models.ForeignKey(Certificate, on_delete=models.SET_NULL, blank=True, null=True)
    verification_result = models.ForeignKey(VerificationResult, on_delete=models.SET_NULL, blank=True, null=True)
    bulk_job = models.ForeignKey(BulkVerificationJob, on_delete=models.SET_NULL, blank=True, null=True)
    
    # Request Information
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    
    # Additional Data
    details = models.JSONField(default=dict)
    
    # Immutable Hash
    audit_hash = models.CharField(max_length=64)  # HMAC-SHA256
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.action} by {self.user} at {self.created_at}"
