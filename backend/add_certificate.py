#!/usr/bin/env python3
"""Add or update a certificate record using Django ORM (db.sqlite3)."""

import os
import sys
from datetime import date


def setup_django():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "checkmycert.settings")

    import django

    django.setup()


def add_new_certificate():
    from apps.institutions.models import Institution, InstitutionDatabase

    institution_data = {
        "name": "Board of Secondary",
        "short_name": "BSE",
        "institution_type": "other",
        "country": "India",
        "state_province": "Andhra Pradesh",
        "city": "Amaravati",
        "website": None,
        "email": None,
        "is_verified": True,
    }

    institution, created_institution = Institution.objects.get_or_create(
        name=institution_data["name"],
        defaults=institution_data,
    )

    if created_institution:
        print(f"Added institution: {institution.name}")
    else:
        print(f"Institution already exists: {institution.name}")

    # Mapped from extracted OCR fields.
    certificate_data = {
        "institution": institution,
        "student_name": "MANDA TANMAY VENKATA SAI LALA GUPTA",
        "student_id": "2110110462",  # roll_number
        "student_email": "",
        "certificate_type": "SSC Examination",  # degree
        "degree_program": "SSC",
        "major": "General",
        "gpa": None,
        "enrollment_date": None,
        "graduation_date": date(2021, 8, 6),
        "certificate_issued_date": date(2021, 8, 6),
        "certificate_number": "PC/10/09091/141502/M2",  # registration/id
        "additional_data": {
            "source": "manual_insert_from_extracted_fields",
            "roll_number": "2110110462",
            "institution_raw": "Board of Secondary",
        },
    }

    record, created_record = InstitutionDatabase.objects.update_or_create(
        certificate_number=certificate_data["certificate_number"],
        defaults=certificate_data,
    )

    if created_record:
        print(f"Added certificate record for: {record.student_name}")
    else:
        print(f"Updated certificate record for: {record.student_name}")

    print(f"  Institution: {institution.name}")
    print(f"  Certificate Number: {record.certificate_number}")
    print(f"  Student ID: {record.student_id}")
    print(f"  Graduation Date: {record.graduation_date}")

    verified_institutions = Institution.objects.filter(is_verified=True).count()
    active_certificates = InstitutionDatabase.objects.filter(is_revoked=False).count()

    print("\nUpdated Database Statistics:")
    print(f"  Verified Institutions: {verified_institutions}")
    print(f"  Active Certificates: {active_certificates}")


if __name__ == "__main__":
    print("Adding certificate to Django database...")
    print("=" * 50)
    setup_django()
    add_new_certificate()
    print("Done.")