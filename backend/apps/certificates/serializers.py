from rest_framework import serializers
from .models import Certificate, VerificationResult, BulkVerificationJob, AuditLog

class CertificateUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = ['file', 'ocr_language', 'translate_enabled']
        
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['original_filename'] = validated_data['file'].name
        validated_data['file_size'] = validated_data['file'].size
        validated_data['file_type'] = validated_data['file'].content_type
        return super().create(validated_data)

class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = [
            'id', 'original_filename', 'file_size', 'file_type',
            'status', 'ocr_language', 'translate_enabled',
            'uploaded_at', 'processed_at'
        ]
        read_only_fields = ['id', 'uploaded_at', 'processed_at']

class VerificationResultSerializer(serializers.ModelSerializer):
    certificate = CertificateSerializer(read_only=True)
    
    class Meta:
        model = VerificationResult
        fields = [
            'id', 'certificate', 'status', 'overall_confidence',
            'extracted_text', 'extracted_fields', 'ocr_confidence',
            'tamper_detected', 'tamper_confidence', 'tamper_issues',
            'tamper_heatmap', 'database_match', 'matched_institution',
            'signature_valid', 'signature_details', 'qr_token',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class BulkVerificationJobSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = BulkVerificationJob
        fields = [
            'id', 'name', 'description', 'status', 'input_file',
            'output_file', 'total_certificates', 'processed_certificates',
            'successful_verifications', 'failed_verifications',
            'progress_percentage', 'created_at', 'started_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'status', 'output_file', 'total_certificates',
            'processed_certificates', 'successful_verifications',
            'failed_verifications', 'created_at', 'started_at', 'completed_at'
        ]
    
    def get_progress_percentage(self, obj):
        if obj.total_certificates == 0:
            return 0
        return round((obj.processed_certificates / obj.total_certificates) * 100, 2)

class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_email', 'action', 'ip_address',
            'details', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
