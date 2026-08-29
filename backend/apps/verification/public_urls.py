from django.urls import path

from .views import PublicQRVerifyView

urlpatterns = [
    path('<str:token>/', PublicQRVerifyView.as_view(), name='public-qr-verify'),
]
