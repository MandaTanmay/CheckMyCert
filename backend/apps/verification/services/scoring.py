from django.conf import settings


class ScoreCalculator:
    def __init__(self):
        self.w_ocr = float(getattr(settings, 'CONFIDENCE_WEIGHT_OCR', 0.2))
        self.w_tamper = float(getattr(settings, 'CONFIDENCE_WEIGHT_TAMPER', 0.4))
        self.w_db = float(getattr(settings, 'CONFIDENCE_WEIGHT_DB_MATCH', 0.3))
        self.w_signature = float(getattr(settings, 'CONFIDENCE_WEIGHT_SIGNATURE', 0.1))
        self.threshold_valid = float(getattr(settings, 'VERDICT_THRESHOLD_VALID', 80))
        self.threshold_tampered = float(getattr(settings, 'VERDICT_THRESHOLD_TAMPERED', 70))

    def calculate(self, ocr_confidence, tamper_detected, tamper_confidence, db_match, db_confidence, signature_valid):
        ocr_score = max(0.0, min(100.0, float(ocr_confidence))) * self.w_ocr
        tamper_component = (100.0 - float(tamper_confidence)) if tamper_detected else float(tamper_confidence)
        tamper_score = max(0.0, min(100.0, tamper_component)) * self.w_tamper
        db_score = max(0.0, min(100.0, float(db_confidence if db_match else 0))) * self.w_db
        signature_score = (100.0 if signature_valid else 0.0) * self.w_signature

        overall = round(ocr_score + tamper_score + db_score + signature_score, 2)

        if tamper_detected and float(tamper_confidence) >= self.threshold_tampered:
            verdict = 'tampered'
        elif overall >= self.threshold_valid and db_match:
            verdict = 'valid'
        else:
            verdict = 'unverified'

        return overall, verdict
