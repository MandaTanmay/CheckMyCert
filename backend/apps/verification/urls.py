from django.urls import path

from .views import (
    CertificateTokenVerifyView,
    DatabaseVerifyView,
    TriggerCertificateVerificationView,
)

urlpatterns = [
    path('database/verify/', DatabaseVerifyView.as_view(), name='verification-database-verify'),
    path('certificates/verify/', CertificateTokenVerifyView.as_view(), name='verification-cert-verify'),
    path('pipeline/<uuid:certificate_id>/run/', TriggerCertificateVerificationView.as_view(), name='verification-trigger'),
]
