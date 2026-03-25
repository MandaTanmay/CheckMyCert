from rest_framework import serializers

from apps.certificates.models import VerificationResult


class RecentVerificationSerializer(serializers.ModelSerializer):
    filename = serializers.CharField(source='certificate.original_filename', read_only=True)
    uploaded_at = serializers.DateTimeField(source='certificate.uploaded_at', read_only=True)

    class Meta:
        model = VerificationResult
        fields = ['id', 'status', 'overall_confidence', 'filename', 'uploaded_at', 'created_at']
