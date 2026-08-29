from rest_framework import serializers


class DatabaseVerifyRequestSerializer(serializers.Serializer):
    student_name = serializers.CharField(required=False, allow_blank=True)
    certificate_type = serializers.CharField(required=False, allow_blank=True)
    institution_name = serializers.CharField(required=False, allow_blank=True)
    graduation_date = serializers.CharField(required=False, allow_blank=True)
    certificate_number = serializers.CharField(required=False, allow_blank=True)
    extracted_text = serializers.CharField(required=False, allow_blank=True)
    extractedFields = serializers.DictField(required=False)


class TokenVerificationRequestSerializer(serializers.Serializer):
    verificationToken = serializers.CharField(required=True)
    checksum = serializers.CharField(required=False, allow_blank=True)
