from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.certificates.models import Certificate, VerificationResult

from .serializers import RecentVerificationSerializer


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def stats(request):
    user = request.user

    cert_qs = Certificate.objects.all() if user.role == 'admin' else Certificate.objects.filter(user=user)
    result_qs = VerificationResult.objects.all() if user.role == 'admin' else VerificationResult.objects.filter(certificate__user=user)

    total_certificates = cert_qs.count()
    completed = result_qs.count()
    valid = result_qs.filter(status='valid').count()
    tampered = result_qs.filter(status='tampered').count()

    return Response(
        {
            'total_certificates': total_certificates,
            'completed_verifications': completed,
            'valid_certificates': valid,
            'tampered_certificates': tampered,
            'success_rate': round((valid / completed * 100) if completed else 0, 2),
        }
    )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def recent_verifications(request):
    user = request.user
    qs = VerificationResult.objects.select_related('certificate').order_by('-created_at')
    if user.role != 'admin':
        qs = qs.filter(certificate__user=user)

    page_size = int(request.query_params.get('page_size', 10))
    data = RecentVerificationSerializer(qs[:page_size], many=True).data
    return Response({'results': data})
