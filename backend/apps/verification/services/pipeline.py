from typing import Any, Dict

from apps.certificates.database_matcher import DatabaseMatcher
from apps.certificates.ocr_processor import OCRProcessor
from apps.certificates.signature_validator import SignatureValidator
from apps.certificates.tamper_detector import TamperDetector

from .field_parser import FieldParser
from .scoring import ScoreCalculator
from .types import PipelineOutput, StageDiagnostics


class VerificationPipeline:
    def __init__(self):
        self.ocr = OCRProcessor()
        self.tamper = TamperDetector()
        self.signature = SignatureValidator()
        self.matcher = DatabaseMatcher()
        self.parser = FieldParser()
        self.scoring = ScoreCalculator()

    def run(self, file_path: str, language: str = 'auto', translate: bool = False) -> PipelineOutput:
        diagnostics = []

        ocr_result = self.ocr.process_certificate(file_path, language=language, translate=translate)
        diagnostics.append(StageDiagnostics(stage='ocr', ok='error' not in ocr_result, meta={'confidence': ocr_result.get('confidence', 0)}))

        fields = self.parser.normalize(ocr_result.get('extracted_fields', {}))
        diagnostics.append(StageDiagnostics(stage='field_parse', ok=True, meta={'fields': list(fields.keys())}))

        tamper_result = self.tamper.analyze_document(file_path)
        diagnostics.append(StageDiagnostics(stage='tamper', ok='error' not in tamper_result, meta={'confidence': tamper_result.get('confidence', 0)}))

        signature_result = self.signature.validate_signature(file_path)
        diagnostics.append(StageDiagnostics(stage='signature', ok=True, meta={'valid': signature_result.get('valid', False)}))

        db_result = self.matcher.find_matches(fields)
        diagnostics.append(StageDiagnostics(stage='database_match', ok='error' not in db_result, meta={'match_found': db_result.get('match_found', False)}))

        overall_confidence, verdict = self.scoring.calculate(
            ocr_confidence=ocr_result.get('confidence', 0),
            tamper_detected=tamper_result.get('tamper_detected', False),
            tamper_confidence=tamper_result.get('confidence', 0),
            db_match=db_result.get('match_found', False),
            db_confidence=db_result.get('confidence', 0),
            signature_valid=signature_result.get('valid', False),
        )

        matched_institution = db_result.get('institution')
        matched_record = db_result.get('record')

        return PipelineOutput(
            extracted_text=ocr_result.get('raw_text', ''),
            extracted_fields=fields,
            ocr_confidence=float(ocr_result.get('confidence', 0)),
            tamper_detected=bool(tamper_result.get('tamper_detected', False)),
            tamper_confidence=float(tamper_result.get('confidence', 0)),
            tamper_issues=tamper_result.get('issues', []),
            signature_valid=bool(signature_result.get('valid', False)),
            signature_details=signature_result.get('details', {}),
            database_match=bool(db_result.get('match_found', False)),
            db_match_confidence=float(db_result.get('confidence', 0)),
            verdict=verdict,
            overall_confidence=overall_confidence,
            diagnostics=diagnostics,
            matched_institution_id=str(getattr(matched_institution, 'id', '')) or None,
            matched_record_id=getattr(matched_record, 'id', None),
        )

    def run_from_fields(self, extracted_fields: Dict[str, Any]) -> Dict[str, Any]:
        fields = self.parser.normalize(extracted_fields)
        db_result = self.matcher.find_matches(fields)
        return {
            'database_match': bool(db_result.get('match_found', False)),
            'confidence_score': float(db_result.get('confidence', 0)),
            'verification_status': 'valid' if db_result.get('match_found', False) else 'unverified',
            'matched_record': getattr(db_result.get('record'), 'id', None),
            'matched_institution': getattr(db_result.get('institution'), 'name', None),
            'comparison_details': [],
            'raw': db_result,
        }
