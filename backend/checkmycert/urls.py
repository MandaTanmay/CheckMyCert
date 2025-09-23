from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/certificates/', include('apps.certificates.urls')),
    path('api/institutions/', include('apps.institutions.urls')),
    path('api/verification/', include('apps.verification.urls')),
    path('api/verify/', include('apps.verification.public_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
