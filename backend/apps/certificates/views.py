from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.conf import settings
from celery.result import AsyncResult
import uuid

from .models import Certificate, VerificationResult, BulkVerificationJob
from .serializers import (
    CertificateUploadSerializer, CertificateSerializer,
    VerificationResultSerializer, BulkVerificationJobSerializer
)
from .tasks import process_certificate_verification, process_bulk_verification

class CertificateUploadView(generics.CreateAPIView):
    serializer_class = CertificateUploadSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        certificate = serializer.save()
        
        # Start background processing
        if not settings.DEMO_MODE:
            task = process_certificate_verification.delay(str(certificate.id))
            certificate.celery_task_id = task.id
            certificate.status = 'processing'
            certificate.save()
        else:
            # Demo mode - create mock result immediately
            from .utils import create_demo_result
            create_demo_result(certificate)
        
        return Response({
            'job_id': str(certificate.id),
            'status': certificate.status,
            'message': 'Certificate uploaded successfully'
        }, status=status.HTTP_201_CREATED)

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
        return get_object_or_404(
            VerificationResult,
            id=result_id,
            certificate__user=self.request.user
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
        
        # Start background processing
        if not settings.DEMO_MODE:
            task = process_bulk_verification.delay(str(bulk_job.id))
            bulk_job.celery_task_id = task.id
            bulk_job.status = 'processing'
            bulk_job.save()
        
        return Response({
            'batch_id': str(bulk_job.id),
            'status': bulk_job.status,
            'message': 'Bulk verification job created successfully'
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
