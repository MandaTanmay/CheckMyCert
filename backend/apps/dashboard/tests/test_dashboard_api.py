from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User


class DashboardAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='user@test.com',
            username='user_test',
            first_name='User',
            last_name='Test',
            password='Passw0rd!123',
            role='user',
        )
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')

    def test_dashboard_stats_endpoint_responds(self):
        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('total_certificates', response.data)

    def test_dashboard_recent_endpoint_responds(self):
        response = self.client.get('/api/dashboard/recent-verifications/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
