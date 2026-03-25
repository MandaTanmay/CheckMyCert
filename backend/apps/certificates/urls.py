from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.CertificateUploadView.as_view(), name='certificate-upload'),
    path('verify/', views.verify_certificate_token, name='certificate-verify-token'),
    path('status/<uuid:job_id>/', views.CertificateStatusView.as_view(), name='certificate-status'),
    path('result/<uuid:result_id>/', views.VerificationResultView.as_view(), name='verification-result'),
    path('bulk/', views.BulkVerificationView.as_view(), name='bulk-verification'),
    path('bulk/status/<uuid:batch_id>/', views.BulkVerificationStatusView.as_view(), name='bulk-status'),
    path('bulk/results/<uuid:batch_id>/', views.BulkVerificationResultsView.as_view(), name='bulk-results'),
    path('list/', views.UserCertificatesView.as_view(), name='user-certificates'),
    path('results/', views.UserVerificationResultsView.as_view(), name='user-results'),
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
]
