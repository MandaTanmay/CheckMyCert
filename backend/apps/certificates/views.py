from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
from celery.result import AsyncResult
from datetime import datetime
import logging
import uuid
import hashlib

from .models import Certificate, VerificationResult, BulkVerificationJob
from apps.institutions.models import Institution, InstitutionDatabase
from .serializers import (
    CertificateUploadSerializer, CertificateSerializer,
    VerificationResultSerializer, BulkVerificationJobSerializer
)
from .tasks import process_certificate_verification, process_bulk_verification

logger = logging.getLogger(__name__)

class CertificateUploadView(generics.CreateAPIView):
    serializer_class = CertificateUploadSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        certificate = serializer.save()
        response_message = 'Certificate uploaded successfully'
        
        # Start background processing
        if not settings.DEMO_MODE:
            try:
                task = process_certificate_verification.delay(str(certificate.id))
                certificate.celery_task_id = task.id
                certificate.status = 'processing'
                certificate.save()
            except Exception as exc:
                # Keep upload successful even when Redis/RabbitMQ is unavailable.
                logger.warning("Unable to queue certificate verification task: %s", exc)
                self._ensure_fallback_result(certificate)
                certificate.status = 'uploaded'
                certificate.celery_task_id = None
                certificate.save(update_fields=['status', 'celery_task_id'])
                response_message = 'Certificate uploaded; background queue unavailable, generated a fallback verification result'
        else:
            # Demo mode - create mock result immediately
            from .utils import create_demo_result
            create_demo_result(certificate)
        
        return Response({
            'job_id': str(certificate.id),
            'status': certificate.status,
            'message': response_message
        }, status=status.HTTP_201_CREATED)

    def _ensure_fallback_result(self, certificate):
        """Create a synchronous fallback result so results page can load without Celery workers."""
        existing = VerificationResult.objects.filter(certificate=certificate).first()
        if existing:
            return existing

        extracted_text = ''
        extracted_fields = {}
        word_coordinates = []
        line_coordinates = []
        ocr_confidence = 0
        database_match = False
        matched_institution = None
        matched_record = None
        database_confidence = 0
        fallback_issues = [
            {
                'type': 'processing_unavailable',
                'severity': 'medium',
                'description': 'Background workers are unavailable. Showing synchronous fallback extraction.',
                'coordinates': {'x': 0, 'y': 0, 'width': 0, 'height': 0},
            }
        ]

        # Attempt OCR synchronously so users still get extracted values.
        try:
            from .ocr_processor import OCRProcessor

            ocr_output = OCRProcessor().process_certificate(
                certificate.file.path,
                language=certificate.ocr_language,
                translate=certificate.translate_enabled,
            )

            extracted_text = ocr_output.get('raw_text', '') or ''
            extracted_fields = ocr_output.get('extracted_fields', {}) or {}
            word_coordinates = ocr_output.get('word_coordinates', []) or []
            line_coordinates = ocr_output.get('line_coordinates', []) or []
            ocr_confidence = float(ocr_output.get('confidence', 0) or 0)

            if ocr_output.get('error'):
                fallback_issues.append(
                    {
                        'type': 'ocr_error',
                        'severity': 'high',
                        'description': str(ocr_output.get('error')),
                        'coordinates': {'x': 0, 'y': 0, 'width': 0, 'height': 0},
                    }
                )
        except Exception as exc:
            logger.warning("Fallback OCR extraction failed: %s", exc)
            fallback_issues.append(
                {
                    'type': 'ocr_unavailable',
                    'severity': 'high',
                    'description': f'Synchronous OCR failed: {exc}',
                    'coordinates': {'x': 0, 'y': 0, 'width': 0, 'height': 0},
                }
            )

        if word_coordinates:
            extracted_fields['_word_coordinates'] = word_coordinates
        if line_coordinates:
            extracted_fields['_line_coordinates'] = line_coordinates

        # Run database matching synchronously in fallback mode as well.
        try:
            from .database_matcher import DatabaseMatcher

            db_result = DatabaseMatcher().find_matches(extracted_fields)
            database_match = bool(db_result.get('match_found', False))
            matched_institution = db_result.get('institution')
            matched_record = db_result.get('record')
            database_confidence = float(db_result.get('confidence', 0) or 0)
        except Exception as exc:
            logger.warning("Fallback database matching failed: %s", exc)
            fallback_issues.append(
                {
                    'type': 'database_match_unavailable',
                    'severity': 'medium',
                    'description': f'Synchronous database matching failed: {exc}',
                    'coordinates': {'x': 0, 'y': 0, 'width': 0, 'height': 0},
                }
            )

        # Calculate overall status and confidence based on results
        overall_status, overall_confidence = self._calculate_fallback_result(
            ocr_confidence, database_match, database_confidence
        )

        fallback_hash = hashlib.sha256(
            f"fallback:{certificate.id}:{certificate.user_id}:{timezone.now().isoformat()}".encode()
        ).hexdigest()

        return VerificationResult.objects.create(
            certificate=certificate,
            status=overall_status,
            overall_confidence=overall_confidence,
            extracted_text=extracted_text,
            extracted_fields=extracted_fields,
            ocr_confidence=ocr_confidence,
            tamper_detected=False,
            tamper_confidence=0,
            tamper_issues=fallback_issues,
            database_match=database_match,
            matched_institution=matched_institution,
            matched_record=matched_record,
            signature_valid=False,
            signature_details={'reason': 'background_workers_unavailable'},
            qr_token=f"qr_{uuid.uuid4().hex}",
            verification_hash=fallback_hash,
        )

    def _calculate_fallback_result(self, ocr_confidence, database_match, database_confidence):
        """Calculate overall status and confidence for fallback verification"""
        # Weight scores: OCR (20%), Database Match (80% for verification)
        confidence_scores = []

        # OCR confidence (weight: 0.2)
        confidence_scores.append(ocr_confidence * 0.2)

        # Database match (weight: 0.8)
        if database_match:
            confidence_scores.append(database_confidence * 0.8)
        else:
            confidence_scores.append(0)

        overall_confidence = sum(confidence_scores)

        # Determine status
        if database_match and database_confidence >= 80:
            status = 'valid'
        elif overall_confidence >= 60:
            status = 'valid'
        else:
            status = 'unverified'

        return status, round(min(overall_confidence, 100), 2)

class CertificateStatusView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, job_id):
        certificate = get_object_or_404(
            Certificate, 
            id=job_id, 
            user=request.user
        )
        
        # Check Celery task status if not demo mode
        if certificate.celery_task_id and not settings.DEMO_MODE:
            task_result = AsyncResult(certificate.celery_task_id)
            if task_result.state == 'SUCCESS':
                certificate.status = 'completed'
                certificate.save()
            elif task_result.state == 'FAILURE':
                certificate.status = 'failed'
                certificate.save()
        
        serializer = CertificateSerializer(certificate)
        return Response(serializer.data)

class VerificationResultView(generics.RetrieveAPIView):
    serializer_class = VerificationResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        result_id = self.kwargs['result_id']
        result = VerificationResult.objects.filter(id=result_id).first()
        if result and result.certificate.user_id == self.request.user.id:
            return result

        # Fallback: allow callers that pass a certificate/job id instead of a result id.
        result = VerificationResult.objects.filter(
            certificate_id=result_id,
            certificate__user=self.request.user,
        ).first()

        if result:
            return result

        return get_object_or_404(
            VerificationResult,
            id=result_id,
            certificate__user=self.request.user,
        )

class BulkVerificationView(generics.CreateAPIView):
    serializer_class = BulkVerificationJobSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        # Check if user has HR role
        if request.user.role not in ['hr', 'admin']:
            return Response(
                {'error': 'Bulk verification requires HR or Admin role'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bulk_job = serializer.save(user=request.user)
        response_message = 'Bulk verification job created successfully'
        
        # Start background processing
        if not settings.DEMO_MODE:
            try:
                task = process_bulk_verification.delay(str(bulk_job.id))
                bulk_job.celery_task_id = task.id
                bulk_job.status = 'processing'
                bulk_job.save()
            except Exception as exc:
                logger.warning("Unable to queue bulk verification task: %s", exc)
                bulk_job.status = 'pending'
                bulk_job.celery_task_id = None
                bulk_job.save(update_fields=['status', 'celery_task_id'])
                response_message = 'Bulk job created, but background processing queue is unavailable'
        
        return Response({
            'batch_id': str(bulk_job.id),
            'status': bulk_job.status,
            'message': response_message
        }, status=status.HTTP_201_CREATED)

class BulkVerificationStatusView(generics.RetrieveAPIView):
    serializer_class = BulkVerificationJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        batch_id = self.kwargs['batch_id']
        return get_object_or_404(
            BulkVerificationJob,
            id=batch_id,
            user=self.request.user
        )


class BulkVerificationResultsView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, batch_id):
        bulk_job = get_object_or_404(BulkVerificationJob, id=batch_id, user=request.user)

        return Response(
            {
                'batch_id': str(bulk_job.id),
                'status': bulk_job.status,
                'summary': {
                    'total': bulk_job.total_certificates,
                    'processed': bulk_job.processed_certificates,
                    'successful': bulk_job.successful_verifications,
                    'failed': bulk_job.failed_verifications,
                },
                'results': [],
                'output_file': bulk_job.output_file.url if bulk_job.output_file else None,
            }
        )

class UserCertificatesView(generics.ListAPIView):
    serializer_class = CertificateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Certificate.objects.filter(user=self.request.user)

class UserVerificationResultsView(generics.ListAPIView):
    serializer_class = VerificationResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return VerificationResult.objects.filter(
            certificate__user=self.request.user
        ).select_related('certificate', 'matched_institution', 'matched_record').order_by('-created_at')


def _parse_generated_date(value):
    if not value:
        return None

    date_str = str(value).strip()
    if not date_str:
        return None

    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue

    return None


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def store_generated_certificate_record(request):
    """Persist generated certificate form data into institutional records."""
    payload = request.data or {}

    student_name = str(payload.get('student_name') or payload.get('studentName') or '').strip()
    degree = str(payload.get('degree') or payload.get('course') or '').strip()
    institution_name = str(payload.get('institution') or payload.get('institution_name') or '').strip()
    certificate_number = str(payload.get('certificate_number') or payload.get('certificateNumber') or '').strip()

    if not all([student_name, degree, institution_name, certificate_number]):
        return Response(
            {
                'error': 'student_name, degree, institution, and certificate_number are required',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    graduation_date = _parse_generated_date(payload.get('graduation_date') or payload.get('graduationDate'))
    issued_date = graduation_date or timezone.now().date()

    institution, _ = Institution.objects.get_or_create(
        name=institution_name,
        defaults={
            'institution_type': 'college',
            'country': 'Unknown',
            'city': 'Unknown',
            'is_verified': True,
        },
    )

    record_defaults = {
        'institution': institution,
        'student_name': student_name,
        'student_id': str(payload.get('created_by') or request.user.id),
        'certificate_type': degree,
        'degree_program': degree,
        'major': str(payload.get('major') or '').strip() or None,
        'gpa': str(payload.get('grade') or '').strip() or None,
        'graduation_date': graduation_date,
        'certificate_issued_date': issued_date,
        'additional_data': {
            'issued_by': payload.get('issued_by') or payload.get('issuedBy') or '',
            'additional_notes': payload.get('additional_notes') or payload.get('additionalNotes') or '',
            'created_by_user_id': str(request.user.id),
            'created_by_email': getattr(request.user, 'email', ''),
        },
    }

    record, created = InstitutionDatabase.objects.update_or_create(
        certificate_number=certificate_number,
        defaults=record_defaults,
    )

    return Response(
        {
            'success': True,
            'created': created,
            'record_id': record.id,
            'institution_id': str(institution.id),
            'certificate_number': record.certificate_number,
        },
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics for the user"""
    user = request.user
    
    total_certificates = Certificate.objects.filter(user=user).count()
    completed_verifications = VerificationResult.objects.filter(
        certificate__user=user
    ).count()
    valid_certificates = VerificationResult.objects.filter(
        certificate__user=user,
        status='valid'
    ).count()
    tampered_certificates = VerificationResult.objects.filter(
        certificate__user=user,
        status='tampered'
    ).count()
    
    return Response({
        'total_certificates': total_certificates,
        'completed_verifications': completed_verifications,
        'valid_certificates': valid_certificates,
        'tampered_certificates': tampered_certificates,
        'success_rate': round(
            (valid_certificates / completed_verifications * 100) if completed_verifications > 0 else 0,
            2
        )
    })


@api_view(['POST', 'GET'])
@permission_classes([permissions.AllowAny])
def verify_certificate_token(request):
    token = request.data.get('verificationToken') if request.method == 'POST' else request.query_params.get('token')

    if not token:
        return Response({'error': 'Verification token is required'}, status=status.HTTP_400_BAD_REQUEST)

    result = VerificationResult.objects.filter(qr_token=token).select_related('certificate').first()
    if not result:
        return Response({'verified': False, 'status': 'INVALID', 'error': 'Certificate not found'}, status=status.HTTP_404_NOT_FOUND)

    cert = result.certificate
    return Response(
        {
            'verified': result.status == 'valid',
            'status': result.status.upper(),
            'certificate': {
                'certificateId': str(cert.id),
                'filename': cert.original_filename,
                'uploadedAt': cert.uploaded_at,
            },
            'verificationDetails': {
                'verifiedAt': result.created_at,
                'confidence': result.overall_confidence,
                'databaseMatch': result.database_match,
                'signatureValid': result.signature_valid,
            },
        }
    )
