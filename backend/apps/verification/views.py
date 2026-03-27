from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.certificates.models import Certificate, VerificationResult
from apps.certificates.tasks import process_certificate_verification
from apps.institutions.models import InstitutionDatabase

from .serializers import DatabaseVerifyRequestSerializer, TokenVerificationRequestSerializer
from .services.pipeline import VerificationPipeline


class DatabaseVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DatabaseVerifyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        extracted_fields = serializer.validated_data.get('extractedFields') or {
            'student_name': {'value': serializer.validated_data.get('student_name', '')},
            'degree': {'value': serializer.validated_data.get('certificate_type', '')},
            'institution': {'value': serializer.validated_data.get('institution_name', '')},
            'graduation_date': {'value': serializer.validated_data.get('graduation_date', '')},
            'certificate_number': {'value': serializer.validated_data.get('certificate_number', '')},
        }

        pipeline = VerificationPipeline()
        result = pipeline.run_from_fields(extracted_fields)
        return Response(result, status=status.HTTP_200_OK)


class TriggerCertificateVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, certificate_id):
        certificate = Certificate.objects.filter(id=certificate_id, user=request.user).first()
        if not certificate:
            return Response({'error': 'Certificate not found'}, status=status.HTTP_404_NOT_FOUND)

        task = process_certificate_verification.delay(str(certificate.id))
        certificate.celery_task_id = task.id
        certificate.status = 'processing'
        certificate.save(update_fields=['celery_task_id', 'status'])

        return Response({'task_id': task.id, 'job_id': str(certificate.id), 'status': 'processing'})


class CertificateTokenVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = TokenVerificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['verificationToken']
        result = VerificationResult.objects.filter(qr_token=token).select_related('certificate').first()

        if not result:
            return Response({'verified': False, 'status': 'INVALID', 'error': 'Certificate not found'}, status=status.HTTP_404_NOT_FOUND)

        certificate = result.certificate
        return Response(
            {
                'verified': result.status == 'valid',
                'status': result.status.upper(),
                'certificate': {
                    'certificateId': str(certificate.id),
                    'filename': certificate.original_filename,
                    'uploadedAt': certificate.uploaded_at,
                },
                'verificationDetails': {
                    'verifiedAt': result.created_at,
                    'confidence': result.overall_confidence,
                    'databaseMatch': result.database_match,
                    'signatureValid': result.signature_valid,
                },
            },
            status=status.HTTP_200_OK,
        )

    def get(self, request):
        token = request.query_params.get('token')
        if not token:
            return Response({'error': 'Verification token is required'}, status=status.HTTP_400_BAD_REQUEST)

        result = VerificationResult.objects.filter(qr_token=token).select_related('certificate').first()
        if not result:
            return Response({'verified': False, 'error': 'Certificate not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'verified': result.status == 'valid', 'certificate_id': str(result.certificate.id), 'status': result.status})


class PublicQRVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        result = VerificationResult.objects.filter(qr_token=token).select_related('certificate', 'matched_institution').first()

        if not result:
            db_record = InstitutionDatabase.objects.filter(certificate_number=token).select_related('institution').first()

            if not db_record:
                return Response({'error': 'Invalid QR token'}, status=status.HTTP_404_NOT_FOUND)

            return Response(
                {
                    'status': 'valid',
                    'certificate_data': {
                        'certificate_id': None,
                        'filename': f"generated_{db_record.certificate_number}.pdf",
                        'institution': db_record.institution.name,
                        'student_name': db_record.student_name,
                        'degree': db_record.certificate_type,
                        'graduation_date': db_record.graduation_date,
                    },
                    'public_info': {
                        'institution_verified': True,
                        'digital_signature': False,
                        'tamper_detected': bool(db_record.is_revoked),
                    },
                    'verification_date': None,
                    'qr_token': token,
                }
            )

        cert = result.certificate
        institution_name = result.matched_institution.name if result.matched_institution else None

        return Response(
            {
                'status': result.status,
                'certificate_data': {
                    'certificate_id': str(cert.id),
                    'filename': cert.original_filename,
                    'institution': institution_name,
                },
                'public_info': {
                    'institution_verified': bool(result.database_match),
                    'digital_signature': bool(result.signature_valid),
                    'tamper_detected': bool(result.tamper_detected),
                },
                'verification_date': result.created_at,
                'qr_token': token,
            }
        )
