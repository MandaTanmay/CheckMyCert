from django.urls import path

from .views import recent_verifications, stats

urlpatterns = [
    path('stats/', stats, name='dashboard-stats'),
    path('recent-verifications/', recent_verifications, name='dashboard-recent'),
]
