"""
URL patterns for SQLite certificate verification
"""

from django.urls import path
from . import views_sqlite

urlpatterns = [
    # Enhanced verification with database comparison
    path('verify-with-database/', views_sqlite.verify_certificate_with_database, name='verify_with_database'),
    
    # Get verification by ID
    path('verification/<str:certificate_id>/', views_sqlite.get_verification_by_id, name='get_verification_by_id'),
    
    # Get verification statistics
    path('stats/', views_sqlite.get_verification_stats, name='verification_stats'),
    
    # Quick verification endpoint (for testing)
    path('quick-verify/', views_sqlite.quick_verify_certificate, name='quick_verify'),
]