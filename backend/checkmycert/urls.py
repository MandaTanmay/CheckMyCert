from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
import importlib


def module_exists(module_name):
    try:
        importlib.import_module(module_name)
        return True
    except ModuleNotFoundError:
        return False

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/certificates/', include('apps.certificates.urls')),
]

if module_exists('apps.institutions.urls'):
    urlpatterns.append(path('api/institutions/', include('apps.institutions.urls')))

if module_exists('apps.verification.urls'):
    urlpatterns.append(path('api/verification/', include('apps.verification.urls')))

if module_exists('apps.verification.public_urls'):
    urlpatterns.append(path('api/verify/', include('apps.verification.public_urls')))

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
