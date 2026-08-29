from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class StageDiagnostics:
    stage: str
    ok: bool
    message: str = ''
    meta: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PipelineOutput:
    extracted_text: str
    extracted_fields: Dict[str, Any]
    ocr_confidence: float
    tamper_detected: bool
    tamper_confidence: float
    tamper_issues: List[Dict[str, Any]]
    signature_valid: bool
    signature_details: Dict[str, Any]
    database_match: bool
    db_match_confidence: float
    verdict: str
    overall_confidence: float
    diagnostics: List[StageDiagnostics] = field(default_factory=list)
    matched_institution_id: Optional[str] = None
    matched_record_id: Optional[int] = None
