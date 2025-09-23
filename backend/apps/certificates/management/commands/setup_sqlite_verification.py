"""
Django management command to setup SQLite verification database
Usage: python manage.py setup_sqlite_verification
"""

from django.core.management.base import BaseCommand
from django.conf import settings
import os
import sys

# Add the backend directory to Python path to import our SQLite setup
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
sys.path.append(backend_dir)

from sqlite_setup import CertificateDatabase

class Command(BaseCommand):
    help = 'Setup SQLite database for certificate verification testing'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--db-path',
            type=str,
            default='certificate_verification.db',
            help='Path to SQLite database file'
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset database (delete existing file)'
        )
    
    def handle(self, *args, **options):
        db_path = options['db_path']
        
        # Make path relative to backend directory
        if not os.path.isabs(db_path):
            db_path = os.path.join(backend_dir, db_path)
        
        self.stdout.write(f"Setting up SQLite database at: {db_path}")
        
        # Reset database if requested
        if options['reset'] and os.path.exists(db_path):
            os.remove(db_path)
            self.stdout.write(self.style.WARNING(f"Deleted existing database: {db_path}"))
        
        try:
            # Initialize database
            db = CertificateDatabase(db_path)
            
            # Get statistics
            stats = db.get_verification_stats()
            
            self.stdout.write(self.style.SUCCESS("✅ SQLite database setup completed!"))
            self.stdout.write(f"📊 Database Statistics:")
            self.stdout.write(f"   Verified Institutions: {stats['verified_institutions']}")
            self.stdout.write(f"   Active Certificates: {stats['active_certificates']}")
            self.stdout.write(f"   Total Verifications: {stats['total_verifications']}")
            
            db.close()
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Failed to setup database: {str(e)}")
            )