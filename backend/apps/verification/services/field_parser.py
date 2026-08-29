from typing import Any, Dict


class FieldParser:
    """Thin field parser wrapper; source OCR extractors already return structured fields."""

    def normalize(self, raw_fields: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(raw_fields, dict):
            return {}

        normalized = {}
        for key, value in raw_fields.items():
            if isinstance(value, dict) and 'value' in value:
                normalized[key] = value
            else:
                normalized[key] = {
                    'value': str(value),
                    'confidence': 50,
                    'coordinates': {'x': 0, 'y': 0, 'width': 0, 'height': 0},
                }
        return normalized
