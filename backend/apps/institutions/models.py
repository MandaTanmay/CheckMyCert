from django.db import models
import uuid

class Institution(models.Model):
    INSTITUTION_TYPES = [
        ('university', 'University'),
        ('college', 'College'),
        ('school', 'School'),
        ('training', 'Training Center'),
        ('certification', 'Certification Body'),
        ('government', 'Government Agency'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    short_name = models.CharField(max_length=50, blank=True, null=True)
    institution_type = models.CharField(max_length=20, choices=INSTITUTION_TYPES)
    country = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100)
    
    # Contact Information
    website = models.URLField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Verification Settings
    is_verified = models.BooleanField(default=False)
    api_key = models.CharField(max_length=255, blank=True, null=True)
    webhook_url = models.URLField(blank=True, null=True)
    
    # Metadata
    logo = models.ImageField(upload_to='institutions/logos/', blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'institutions'
        ordering = ['name']
        
    def __str__(self):
        return self.name

class InstitutionDatabase(models.Model):
    """Stores certificate records from institutions for verification"""
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name='certificates')
    
    # Student Information
    student_name = models.CharField(max_length=255)
    student_id = models.CharField(max_length=100, blank=True, null=True)
    student_email = models.EmailField(blank=True, null=True)
    
    # Certificate Information
    certificate_type = models.CharField(max_length=100)
    degree_program = models.CharField(max_length=255, blank=True, null=True)
    major = models.CharField(max_length=255, blank=True, null=True)
    minor = models.CharField(max_length=255, blank=True, null=True)
    gpa = models.DecimalField(max_digits=4, decimal_places=2, blank=True, null=True)
    
    # Dates
    enrollment_date = models.DateField(blank=True, null=True)
    graduation_date = models.DateField(blank=True, null=True)
    certificate_issued_date = models.DateField()
    
    # Verification
    certificate_number = models.CharField(max_length=100, unique=True)
    is_revoked = models.BooleanField(default=False)
    revocation_reason = models.TextField(blank=True, null=True)
    
    # Metadata
    additional_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'institution_certificates'
        unique_together = ['institution', 'certificate_number']
        
    def __str__(self):
        return f"{self.student_name} - {self.certificate_type} ({self.institution.name})"
