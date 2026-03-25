from django.test import TestCase, override_settings

from apps.verification.services.scoring import ScoreCalculator


class ScoreCalculatorTests(TestCase):
    @override_settings(
        CONFIDENCE_WEIGHT_OCR=0.2,
        CONFIDENCE_WEIGHT_TAMPER=0.4,
        CONFIDENCE_WEIGHT_DB_MATCH=0.3,
        CONFIDENCE_WEIGHT_SIGNATURE=0.1,
        VERDICT_THRESHOLD_VALID=80,
        VERDICT_THRESHOLD_TAMPERED=70,
    )
    def test_valid_verdict_when_high_confidence_with_db_match(self):
        calc = ScoreCalculator()
        score, verdict = calc.calculate(
            ocr_confidence=95,
            tamper_detected=False,
            tamper_confidence=90,
            db_match=True,
            db_confidence=95,
            signature_valid=True,
        )
        self.assertGreaterEqual(score, 80)
        self.assertEqual(verdict, 'valid')

    @override_settings(VERDICT_THRESHOLD_TAMPERED=60)
    def test_tampered_verdict_when_tamper_high(self):
        calc = ScoreCalculator()
        score, verdict = calc.calculate(
            ocr_confidence=95,
            tamper_detected=True,
            tamper_confidence=80,
            db_match=True,
            db_confidence=95,
            signature_valid=True,
        )
        self.assertEqual(verdict, 'tampered')
