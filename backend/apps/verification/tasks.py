from celery import shared_task
from django.db import transaction

from apps.certificates.models import Certificate, VerificationResult
from .services.pipeline import VerificationPipeline


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_backoff_max=300, retry_jitter=True, max_retries=4)
def run_verification_pipeline(self, certificate_id):
    certificate = Certificate.objects.get(id=certificate_id)

    pipeline = VerificationPipeline()
    output = pipeline.run(
        file_path=certificate.file.path,
        language=certificate.ocr_language,
        translate=certificate.translate_enabled,
    )

    with transaction.atomic():
        result, _ = VerificationResult.objects.update_or_create(
            certificate=certificate,
            defaults={
                'status': output.verdict,
                'overall_confidence': output.overall_confidence,
                'extracted_text': output.extracted_text,
                'extracted_fields': output.extracted_fields,
                'ocr_confidence': output.ocr_confidence,
                'tamper_detected': output.tamper_detected,
                'tamper_confidence': output.tamper_confidence,
                'tamper_issues': output.tamper_issues,
                'database_match': output.database_match,
                'signature_valid': output.signature_valid,
                'signature_details': output.signature_details,
                'qr_token': f'qr_{certificate.id}',
                'verification_hash': f'hash_{certificate.id}',
            },
        )
        certificate.status = 'completed'
        certificate.save(update_fields=['status'])

    return {'result_id': str(result.id), 'verdict': output.verdict, 'confidence': output.overall_confidence}


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_backoff_max=300, retry_jitter=True, max_retries=3)
def run_bulk_verification_pipeline(self, certificate_ids):
    processed = []
    for cert_id in certificate_ids:
        processed.append(run_verification_pipeline.delay(cert_id).id)
    return {'task_ids': processed, 'count': len(processed)}
