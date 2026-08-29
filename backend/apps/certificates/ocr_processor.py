import cv2
import numpy as np
import pytesseract
import easyocr
from PIL import Image
import PyPDF2
import re
from googletrans import Translator
import logging
import os
from django.conf import settings

try:
    import requests
except Exception:
    requests = None

try:
    import pypdfium2 as pdfium
except Exception:
    pdfium = None

# Pillow 10+ removed Image.ANTIALIAS; some EasyOCR code paths still reference it.
if not hasattr(Image, 'ANTIALIAS'):
    if hasattr(Image, 'Resampling'):
        Image.ANTIALIAS = Image.Resampling.LANCZOS
    else:
        Image.ANTIALIAS = Image.LANCZOS

logger = logging.getLogger(__name__)

class OCRProcessor:
    def __init__(self):
        self.translator = Translator()
        self.easyocr_reader = easyocr.Reader(['en'])
        self.ocr_space_api_key = (
            str(getattr(settings, 'OCR_SPACE_API_KEY', '') or os.getenv('OCR_SPACE_API_KEY', ''))
        ).strip()
        self.last_ocr_space_line_boxes = []
        
    def process_certificate(self, file_path, language='auto', translate=False):
        """
        Main OCR processing function
        """
        try:
            # Reset cached line boxes for each request to avoid stale state.
            self.last_ocr_space_line_boxes = []

            if file_path.lower().endswith('.pdf'):
                raw_text, word_coordinates, confidence = self.extract_text_and_words_pdf(file_path, language)
            else:
                # Preprocess image
                processed_image = self.preprocess_image(file_path)

                # Extract text/words using Tesseract first.
                raw_text = self.extract_text_tesseract(processed_image, language)
                word_coordinates = self.extract_word_coordinates_tesseract(processed_image, language)

                # Fallback to EasyOCR if Tesseract fails
                if not raw_text.strip():
                    raw_text, word_coordinates = self.extract_text_and_words_easyocr(processed_image)
                elif not word_coordinates:
                    # If Tesseract produced text but no word boxes, try EasyOCR word boxes.
                    _, easyocr_words = self.extract_text_and_words_easyocr(processed_image)
                    if easyocr_words:
                        word_coordinates = easyocr_words

                # Calculate confidence
                confidence = self.calculate_ocr_confidence(processed_image, raw_text)

                if self.is_low_quality_ocr(raw_text, word_coordinates, confidence):
                    remote_text, remote_words, remote_confidence = self.extract_text_and_words_ocr_space(
                        file_path, language
                    )
                    if remote_text:
                        raw_text = remote_text
                        word_coordinates = remote_words
                        confidence = max(confidence, remote_confidence)

            raw_text = self.normalize_ocr_text(raw_text)
            line_coordinates = self.last_ocr_space_line_boxes or self.build_line_boxes_from_word_coordinates(
                word_coordinates
            )

            # Extract structured fields
            extracted_fields = self.extract_structured_fields(raw_text)
            
            # Translate if requested
            if translate and language != 'en':
                translated_text = self.translate_text(raw_text)
                translated_fields = self.extract_structured_fields(translated_text)
                
                return {
                    'raw_text': raw_text,
                    'translated_text': translated_text,
                    'extracted_fields': translated_fields,
                    'original_fields': extracted_fields,
                    'word_coordinates': word_coordinates,
                    'line_coordinates': line_coordinates,
                    'confidence': confidence,
                    'language_detected': language
                }
            
            return {
                'raw_text': raw_text,
                'extracted_fields': extracted_fields,
                'word_coordinates': word_coordinates,
                'line_coordinates': line_coordinates,
                'confidence': confidence,
                'language_detected': language
            }
            
        except Exception as e:
            logger.error(f"OCR processing failed: {str(e)}")
            return {
                'raw_text': '',
                'extracted_fields': {},
                'word_coordinates': [],
                'line_coordinates': [],
                'confidence': 0,
                'error': str(e)
            }

    def extract_text_pdf(self, file_path):
        """Extract text from PDF certificate pages."""
        text_parts = []

        with open(file_path, 'rb') as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            for page in reader.pages:
                try:
                    page_text = page.extract_text() or ''
                except Exception:
                    page_text = ''

                if page_text.strip():
                    text_parts.append(page_text.strip())

        return "\n".join(text_parts).strip()

    def extract_text_and_words_pdf(self, file_path, language):
        """Extract text from PDFs, including scanned PDFs rendered as images."""
        embedded_text = self.extract_text_pdf(file_path)

        pdfium_module = self._get_pdfium_module()
        if not pdfium_module:
            logger.warning('pypdfium2 is unavailable; using embedded PDF text only')
            remote_text, remote_words, remote_confidence = self.extract_text_and_words_ocr_space(file_path, language)
            if remote_text:
                return remote_text, remote_words, remote_confidence
            return embedded_text, [], 90 if embedded_text else 0

        page_text_parts = []
        all_words = []
        confidences = []

        try:
            document = pdfium_module.PdfDocument(file_path)
            page_count = len(document)

            # Limit pages to keep synchronous fallback responsive.
            for page_index in range(min(page_count, 10)):
                page = document[page_index]
                bitmap = page.render(scale=2).to_numpy()
                if bitmap is None:
                    continue

                if len(bitmap.shape) == 3 and bitmap.shape[2] == 4:
                    page_image = cv2.cvtColor(bitmap, cv2.COLOR_BGRA2BGR)
                elif len(bitmap.shape) == 3 and bitmap.shape[2] == 3:
                    page_image = bitmap
                else:
                    page_image = cv2.cvtColor(bitmap, cv2.COLOR_GRAY2BGR)

                processed = self.preprocess_loaded_image(page_image)
                page_text = self.extract_text_tesseract(processed, language)
                page_words = self.extract_word_coordinates_tesseract(processed, language)

                if not page_text.strip():
                    page_text, page_words = self.extract_text_and_words_easyocr(processed)
                elif not page_words:
                    _, easyocr_words = self.extract_text_and_words_easyocr(processed)
                    if easyocr_words:
                        page_words = easyocr_words

                if page_text.strip():
                    page_text_parts.append(page_text.strip())
                    confidences.append(self.calculate_ocr_confidence(processed, page_text))

                if page_words:
                    all_words.extend(page_words)

            scanned_text = "\n".join(page_text_parts).strip()
            final_text = scanned_text or embedded_text
            confidence = (sum(confidences) / len(confidences)) if confidences else (90 if embedded_text else 0)

            if self.is_low_quality_ocr(final_text, all_words, confidence):
                remote_text, remote_words, remote_confidence = self.extract_text_and_words_ocr_space(file_path, language)
                if remote_text:
                    final_text = remote_text
                    all_words = remote_words
                    confidence = max(confidence, remote_confidence)

            return final_text, all_words, confidence
        except Exception as exc:
            logger.warning(f'PDF page rendering OCR failed, using fallback OCR: {exc}')
            remote_text, remote_words, remote_confidence = self.extract_text_and_words_ocr_space(file_path, language)
            if remote_text:
                return remote_text, remote_words, remote_confidence
            return embedded_text, [], 90 if embedded_text else 0

    def extract_text_and_words_ocr_space(self, file_path, language):
        """Use OCR.space as final fallback when local OCR quality is very low."""
        if requests is None:
            logger.warning('requests library is unavailable; skipping OCR.space fallback')
            return '', [], 0

        if not self.ocr_space_api_key:
            return '', [], 0

        language_map = {
            'eng': 'eng',
            'spa': 'spa',
            'fre': 'fre',
            'ger': 'ger',
            'ita': 'ita',
            'por': 'por',
        }
        api_language = language_map.get(language, 'eng')

        try:
            with open(file_path, 'rb') as file_obj:
                response = requests.post(
                    'https://api.ocr.space/parse/image',
                    data={
                        'apikey': self.ocr_space_api_key,
                        'language': api_language,
                        'isOverlayRequired': True,
                        'OCREngine': 2,
                    },
                    files={'file': file_obj},
                    timeout=45,
                )

            payload = response.json()
            parsed_results = payload.get('ParsedResults') or []
            if not parsed_results:
                return '', [], 0

            parsed = parsed_results[0]
            overlay = parsed.get('TextOverlay') or {}
            raw_words = []
            for line in overlay.get('Lines') or []:
                for word in line.get('Words') or []:
                    word_text = (word.get('WordText') or '').strip()
                    if not self.is_valid_ocr_token(word_text):
                        continue

                    raw_words.append(
                        {
                            'WordText': word_text,
                            'Left': int(word.get('Left', 0)),
                            'Top': int(word.get('Top', 0)),
                            'Width': int(word.get('Width', 0)),
                            'Height': int(word.get('Height', 0)),
                        }
                    )

            stitched_lines, line_boxes, stitched_words = self.stitch_ocr_space_words(raw_words)
            text = self.normalize_ocr_text("\n".join(stitched_lines) or parsed.get('ParsedText', '') or '')

            words = []
            for item in stitched_words:
                words.append(
                    {
                        'text': item['WordText'],
                        'bbox': {
                            'x': int(item['Left']),
                            'y': int(item['Top']),
                            'width': int(item['Width']),
                            'height': int(item['Height']),
                        },
                        'confidence': 75.0,
                    }
                )

            # Cache merged line boxes for optional debugging/UI enrichment.
            self.last_ocr_space_line_boxes = line_boxes

            confidence = 75 if text else 0
            return text, words, confidence
        except Exception as exc:
            logger.warning(f'OCR.space fallback failed: {exc}')
            return '', [], 0

    def stitch_ocr_space_words(self, words, vertical_tolerance=None):
        """Drop-in dynamic OCR.space word stitcher returning lines and merged line boxes.

        Args:
            words: list of OCR.space-like words with WordText/Left/Top/Width/Height.
            vertical_tolerance: optional pixel tolerance. If None, computed dynamically.

        Returns:
            tuple[list[str], list[dict], list[dict]]:
                - stitched line strings
                - merged bounding boxes per line
                - normalized sorted word list
        """
        if not words:
            return [], [], []

        normalized = []
        heights = []
        for word in words:
            text = str(word.get('WordText', '')).strip()
            if not text:
                continue

            left = int(word.get('Left', 0) or 0)
            top = int(word.get('Top', 0) or 0)
            width = int(word.get('Width', 0) or 0)
            height = int(word.get('Height', 0) or 0)

            normalized.append(
                {
                    'WordText': text,
                    'Left': left,
                    'Top': top,
                    'Width': width,
                    'Height': height,
                }
            )
            if height > 0:
                heights.append(height)

        if not normalized:
            return [], [], []

        # Dynamic tolerance adapts to font size / scan scale.
        if vertical_tolerance is None:
            base_height = int(np.median(heights)) if heights else 20
            vertical_tolerance = max(10, int(base_height * 0.65))

        normalized.sort(key=lambda w: (w['Top'], w['Left']))

        line_groups = []
        for word in normalized:
            best_idx = -1
            best_delta = float('inf')

            for idx, line in enumerate(line_groups):
                delta = abs(word['Top'] - line['avg_top'])
                if delta <= vertical_tolerance and delta < best_delta:
                    best_idx = idx
                    best_delta = delta

            if best_idx == -1:
                line_groups.append({'avg_top': float(word['Top']), 'count': 1, 'words': [word]})
            else:
                line = line_groups[best_idx]
                line['words'].append(word)
                line['avg_top'] = (line['avg_top'] * line['count'] + word['Top']) / (line['count'] + 1)
                line['count'] += 1

        line_groups.sort(key=lambda line: line['avg_top'])

        stitched_lines = []
        merged_boxes = []
        stitched_words = []

        for line in line_groups:
            line_words = sorted(line['words'], key=lambda w: w['Left'])
            stitched_words.extend(line_words)
            stitched_lines.append(' '.join(w['WordText'] for w in line_words).strip())

            min_left = min(w['Left'] for w in line_words)
            min_top = min(w['Top'] for w in line_words)
            max_right = max(w['Left'] + w['Width'] for w in line_words)
            max_bottom = max(w['Top'] + w['Height'] for w in line_words)
            merged_boxes.append(
                {
                    'text': ' '.join(w['WordText'] for w in line_words).strip(),
                    'x': int(min_left),
                    'y': int(min_top),
                    'width': int(max(0, max_right - min_left)),
                    'height': int(max(0, max_bottom - min_top)),
                    'word_count': len(line_words),
                }
            )

        return stitched_lines, merged_boxes, stitched_words

    def _get_pdfium_module(self):
        """Resolve pypdfium2 at runtime so newly installed package is picked up without restart."""
        global pdfium
        if pdfium is not None:
            return pdfium

        try:
            import pypdfium2 as runtime_pdfium
            pdfium = runtime_pdfium
            return pdfium
        except Exception:
            return None
    
    def preprocess_image(self, file_path):
        """
        Preprocess image for better OCR results
        """
        # Load image
        image = cv2.imread(file_path)
        return self.preprocess_loaded_image(image)

    def preprocess_loaded_image(self, image):
        """Preprocess an already-loaded image array for better OCR results."""
        if image is None:
            raise ValueError('Unable to load image for OCR preprocessing')

        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # Adaptive threshold
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Deskew
        deskewed = self.deskew_image(thresh)
        
        # DPI normalization (resize to standard DPI)
        height, width = deskewed.shape
        if width < 1200:  # Upscale if too small
            scale_factor = 1200 / width
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
            deskewed = cv2.resize(deskewed, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        return deskewed
    
    def deskew_image(self, image):
        """
        Correct skew in the image
        """
        coords = np.column_stack(np.where(image > 0))
        angle = cv2.minAreaRect(coords)[-1]
        
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        
        return rotated
    
    def extract_text_tesseract(self, image, language):
        """
        Extract text using Tesseract OCR
        """
        # Configure Tesseract
        config = '--oem 3 --psm 6'
        
        if language != 'auto':
            config += f' -l {language}'
        
        # Extract text. If Tesseract is unavailable, return empty text so EasyOCR fallback can run.
        try:
            text = pytesseract.image_to_string(image, config=config)
            return text.strip()
        except Exception as exc:
            logger.warning(f"Tesseract OCR unavailable, falling back to EasyOCR: {exc}")
            return ''
    
    def extract_text_easyocr(self, image):
        """
        Extract text using EasyOCR as fallback
        """
        text, _ = self.extract_text_and_words_easyocr(image)
        return text

    def extract_text_and_words_easyocr(self, image):
        """Extract text and word coordinates using EasyOCR."""
        results = self.easyocr_reader.readtext(image)
        words = []

        for result in results:
            if len(result) < 3:
                continue

            bbox, text, confidence = result
            clean_text = (text or '').strip()
            if not clean_text:
                continue

            xs = [int(point[0]) for point in bbox]
            ys = [int(point[1]) for point in bbox]
            left = min(xs)
            top = min(ys)
            right = max(xs)
            bottom = max(ys)

            words.append(
                {
                    'text': clean_text,
                    'bbox': {
                        'x': left,
                        'y': top,
                        'width': max(0, right - left),
                        'height': max(0, bottom - top),
                    },
                    'confidence': round(float(confidence) * 100, 2),
                }
            )

        filtered_words = self.filter_word_coordinates(words, min_confidence=25)
        if not filtered_words:
            filtered_words = self.filter_word_coordinates(words, min_confidence=10)

        text = self.compose_text_from_words(filtered_words)
        return text, filtered_words

    def extract_word_coordinates_tesseract(self, image, language):
        """Extract word-level coordinates using Tesseract image_to_data."""
        config = '--oem 3 --psm 6'
        if language != 'auto':
            config += f' -l {language}'

        try:
            data = pytesseract.image_to_data(image, config=config, output_type=pytesseract.Output.DICT)
            words = []

            total = len(data.get('text', []))
            for idx in range(total):
                text = (data['text'][idx] or '').strip()
                if not text:
                    continue

                try:
                    conf = float(data['conf'][idx])
                except Exception:
                    conf = 0

                if conf < 0:
                    continue

                words.append(
                    {
                        'text': text,
                        'bbox': {
                            'x': int(data['left'][idx]),
                            'y': int(data['top'][idx]),
                            'width': int(data['width'][idx]),
                            'height': int(data['height'][idx]),
                        },
                        'confidence': round(conf, 2),
                    }
                )

            return words
        except Exception as exc:
            logger.warning(f"Tesseract word coordinate extraction failed: {exc}")
            return []
    
    def extract_structured_fields(self, text):
        """
        Extract structured fields from raw text
        """
        fields = {}
        
        # Common patterns for certificate fields
        patterns = {
            'student_name': [
                r'(?:name|student|recipient)[\s:]+([A-Za-z\s]+?)(?:\n|$|[A-Z]{2,})',
                r'This is to certify that\s+([A-Za-z\s]+?)(?:\s+has|$)',
                r'CERTIFIED THAT\s+([A-Za-z\s]+?)(?:\n|$)',
                r'awarded to\s+([A-Za-z\s]+?)(?:\n|$)',
            ],
            'roll_number': [
                r'(?:roll\s*(?:no|number)?)[\s:\-]*([A-Z0-9\-\/]{5,})',
                r'ROLL\s*NO\s*([A-Z0-9\-\/]{5,})',
            ],
            'registration_number': [
                r'\b(?:registration|reg)\b\s*(?:no|number)?[\s:\-]*([A-Z0-9\-\/]{4,})',
                r'\b([A-Z]{1,4}\/\d{2,6}\/\d{2,8}\/[A-Z0-9]{1,6})\b',
            ],
            'certificate_number': [
                r'\b(?:certificate|cert|id)\b\s*(?:no|number)?[\s:\-]*([A-Z0-9\-\/]{4,})',
            ],
            'degree': [
                r'\b(SSC Examination|Secondary School Certificate)\b',
                r'\b(Bachelor(?:\s+of\s+[A-Za-z\s]+)?|Master(?:\s+of\s+[A-Za-z\s]+)?|Doctor(?:\s+of\s+[A-Za-z\s]+)?)\b',
                r'(?:degree|diploma|course|program)[\s:]+([A-Za-z][A-Za-z\s]{3,80})',
            ],
            'institution': [
                r'(?:university|college|institute|school)[\s:]*([A-Za-z\s]+?)(?:\n|$)',
                r'^([A-Za-z\s]+?(?:University|College|Institute|School))',
                r'^([A-Za-z\s]+?(?:Board\s+of\s+[A-Za-z\s]+))',
            ],
            'graduation_date': [
                r'(?:date\s+of\s+issue)[\s:]*([0-3]?\d[\.\/-][01]?\d[\.\/-]\d{2,4})',
                r'(?:held\s+in)[\s:]*([A-Za-z]+\s+\d{4})',
                r'(?:date|graduated|conferred)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
                r'(?:date|graduated|conferred)[\s:]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})',
            ],
            'gpa': [
                r'(?:gpa|grade point average)[\s:]*(\d+\.?\d*)',
                r'(\d\.\d{2})\s*(?:gpa|grade)',
            ],
        }
        
        for field_name, field_patterns in patterns.items():
            for pattern in field_patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    value = match.group(1).strip()
                    if value and len(value) > 1:
                        fields[field_name] = {
                            'value': value,
                            'confidence': self.calculate_field_confidence(value, field_name),
                            'coordinates': self.get_field_coordinates(text, value)
                        }
                        break

        # Heuristic fallback for noisy OCR: infer likely fields from meaningful lines.
        if not fields:
            fields.update(self.extract_fallback_fields_from_lines(text))

        fields = self.sanitize_extracted_fields(fields, text)
        
        return fields

    def sanitize_extracted_fields(self, fields, text):
        """Normalize extracted fields to remove noisy OCR captures."""
        if not fields:
            return {}

        cleaned = dict(fields)
        degree_keywords = ('bachelor', 'master', 'doctor', 'diploma', 'degree', 'ssc', 'secondary', 'certificate')
        institution_keywords = ('university', 'college', 'institute', 'school', 'board')

        degree = ((cleaned.get('degree') or {}).get('value') or '').strip()
        if degree and not any(keyword in degree.lower() for keyword in degree_keywords):
            cleaned.pop('degree', None)

        institution = ((cleaned.get('institution') or {}).get('value') or '').strip()
        if institution and not any(keyword in institution.lower() for keyword in institution_keywords):
            cleaned.pop('institution', None)

        graduation_date = ((cleaned.get('graduation_date') or {}).get('value') or '').strip()
        if graduation_date and not self.is_valid_graduation_date(graduation_date):
            cleaned.pop('graduation_date', None)

        for key in ('roll_number', 'registration_number', 'certificate_number'):
            value = ((cleaned.get(key) or {}).get('value') or '').strip()
            if value and not self.is_valid_identifier_value(value):
                cleaned.pop(key, None)

        if 'institution' not in cleaned:
            inferred = self.infer_institution_line(text)
            if inferred:
                cleaned['institution'] = {
                    'value': inferred,
                    'confidence': 80,
                    'coordinates': self.get_field_coordinates(text, inferred),
                }

        if 'degree' not in cleaned:
            inferred = self.infer_degree_value(text)
            if inferred:
                cleaned['degree'] = {
                    'value': inferred,
                    'confidence': 80,
                    'coordinates': self.get_field_coordinates(text, inferred),
                }

        if 'graduation_date' not in cleaned:
            inferred = self.infer_graduation_date_value(text)
            if inferred:
                cleaned['graduation_date'] = {
                    'value': inferred,
                    'confidence': 80,
                    'coordinates': self.get_field_coordinates(text, inferred),
                }

        inferred_identifiers = self.infer_identifier_values(text)
        for key, value in inferred_identifiers.items():
            if key not in cleaned and value:
                cleaned[key] = {
                    'value': value,
                    'confidence': 82,
                    'coordinates': self.get_field_coordinates(text, value),
                }

        # Alias preferred identifier for downstream matching when available.
        if 'certificate_number' not in cleaned:
            if 'registration_number' in cleaned:
                cleaned['certificate_number'] = dict(cleaned['registration_number'])
            elif 'roll_number' in cleaned:
                cleaned['certificate_number'] = dict(cleaned['roll_number'])

        if 'registration_number' not in cleaned and 'certificate_number' in cleaned:
            cleaned['registration_number'] = dict(cleaned['certificate_number'])

        return cleaned

    def infer_institution_line(self, text):
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        for line in lines:
            if re.search(r'\b(university|college|institute|school|board)\b', line, re.IGNORECASE):
                return line
        return None

    def infer_degree_value(self, text):
        match = re.search(r'\b(SSC\s+Examination|Secondary\s+School\s+Certificate)\b', text, re.IGNORECASE)
        if match:
            return match.group(1)

        match = re.search(
            r'\b(Bachelor(?:\s+of\s+[A-Za-z\s]+)?|Master(?:\s+of\s+[A-Za-z\s]+)?|Doctor(?:\s+of\s+[A-Za-z\s]+)?|Diploma(?:\s+in\s+[A-Za-z\s]+)?)\b',
            text,
            re.IGNORECASE,
        )
        if match:
            return match.group(1)
        return None

    def infer_graduation_date_value(self, text):
        patterns = [
            r'(?:date\s+of\s+issue)[\s:]*([0-3]?\d[\.\/-][01]?\d[\.\/-]\d{2,4})',
            r'(?:held\s+in)[\s:]*([A-Za-z]+\s+\d{4})',
            r'([0-3]?\d[\.\/-][01]?\d[\.\/-]\d{2,4})',
            r'([A-Za-z]+\s+\d{4})',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                candidate = match.group(1).strip()
                if self.is_valid_graduation_date(candidate):
                    return candidate
        return None

    def is_valid_graduation_date(self, value):
        value = (value or '').strip()
        if not value:
            return False

        if re.match(r'^[0-3]?\d[\.\/-][01]?\d[\.\/-]\d{2,4}$', value):
            return True

        month_year = re.match(r'^([A-Za-z]+)\s+(\d{4})$', value)
        if month_year:
            year = int(month_year.group(2))
            return 1950 <= year <= 2100
        return False

    def infer_identifier_values(self, text):
        """Infer roll/reg/certificate id values from OCR text."""
        values = {}

        roll_patterns = [
            r'(?:roll\s*(?:no|number)?)[\s:\-]*([A-Z0-9\-\/]{5,})',
            r'ROLL\s*NO\s*([A-Z0-9\-\/]{5,})',
        ]
        reg_patterns = [
            r'\b(?:registration|reg)\b\s*(?:no|number)?[\s:\-]*([A-Z0-9\-\/]{4,})',
            r'\b([A-Z]{1,4}\/\d{2,6}\/\d{2,8}\/[A-Z0-9]{1,6})\b',
        ]
        cert_patterns = [
            r'\b(?:certificate|cert|id)\b\s*(?:no|number)?[\s:\-]*([A-Z0-9\-\/]{4,})',
        ]

        def pick(patterns):
            for p in patterns:
                m = re.search(p, text, re.IGNORECASE)
                if m:
                    candidate = (m.group(1) or '').strip().strip('.,;:')
                    if self.is_valid_identifier_value(candidate):
                        return candidate
            return None

        roll = pick(roll_patterns)
        reg = pick(reg_patterns)
        if not reg:
            spaced_match = re.search(r'\b([A-Z]{1,4})\s+(\d{2,4})\s+(\d{3,8})\s+(\d{3,8})\s+([A-Z0-9]{1,4})\b', text)
            if spaced_match:
                reg = '/'.join(spaced_match.groups())
        cert = pick(cert_patterns)

        if roll:
            values['roll_number'] = roll
        if reg:
            values['registration_number'] = reg
        if cert:
            values['certificate_number'] = cert

        return values

    def is_valid_identifier_value(self, value):
        value = (value or '').strip()
        if len(value) < 4:
            return False
        if not re.search(r'[A-Z0-9]', value, re.IGNORECASE):
            return False
        if not re.search(r'\d', value):
            return False
        if value.upper() in {'REGULAR', 'CERTIFIED'}:
            return False

        alpha_num = sum(1 for ch in value if ch.isalnum())
        ratio = alpha_num / max(len(value), 1)
        return ratio >= 0.7

    def is_low_quality_ocr(self, text, words, confidence):
        """Detect OCR output that is too weak for reliable field extraction."""
        normalized_text = self.normalize_ocr_text(text)
        alnum_count = sum(1 for ch in normalized_text if ch.isalnum())

        if confidence < 25:
            return True
        if len(words or []) < 4:
            return True
        if len(normalized_text) < 20:
            return True
        if alnum_count < 15:
            return True

        return False

    def normalize_ocr_text(self, text):
        """Normalize OCR text while preserving line structure."""
        if not text:
            return ''

        lines = []
        for raw_line in str(text).splitlines():
            line = re.sub(r'\s+', ' ', raw_line).strip()
            if line:
                lines.append(line)

        return '\n'.join(lines)

    def filter_word_coordinates(self, words, min_confidence=25):
        """Remove low-confidence and symbol-only OCR tokens."""
        filtered = []
        for word in words:
            text = str(word.get('text', '')).strip()
            confidence = float(word.get('confidence', 0) or 0)

            if confidence < min_confidence:
                continue
            if not self.is_valid_ocr_token(text):
                continue

            filtered.append(word)

        return filtered

    def is_valid_ocr_token(self, token):
        """Keep tokens that contain meaningful alphanumeric content."""
        if not token:
            return False

        token = token.strip()
        if len(token) < 2:
            return False

        alnum_count = sum(1 for c in token if c.isalnum())
        if alnum_count == 0:
            return False

        ratio = alnum_count / max(len(token), 1)
        return ratio >= 0.5

    def compose_text_from_words(self, words):
        """Build readable multi-line OCR text from positioned words."""
        if not words:
            return ''

        ordered = sorted(words, key=lambda w: (int(w['bbox']['y']), int(w['bbox']['x'])))
        lines = []
        current_line = []
        current_y = None

        for word in ordered:
            y = int(word['bbox']['y'])
            if current_y is None:
                current_y = y

            if abs(y - current_y) > 20 and current_line:
                lines.append(' '.join(current_line).strip())
                current_line = [word['text']]
                current_y = y
            else:
                current_line.append(word['text'])
                current_y = int((current_y + y) / 2)

        if current_line:
            lines.append(' '.join(current_line).strip())

        return '\n'.join(line for line in lines if line)

    def build_line_boxes_from_word_coordinates(self, words, vertical_tolerance=15):
        """Create merged line bounding boxes from generic word_coordinates format."""
        if not words:
            return []

        normalized = []
        heights = []
        for word in words:
            bbox = word.get('bbox') or {}
            x = int(bbox.get('x', 0) or 0)
            y = int(bbox.get('y', 0) or 0)
            width = int(bbox.get('width', 0) or 0)
            height = int(bbox.get('height', 0) or 0)
            text = str(word.get('text', '')).strip()
            if not text:
                continue

            normalized.append({'text': text, 'x': x, 'y': y, 'width': width, 'height': height})
            if height > 0:
                heights.append(height)

        if not normalized:
            return []

        dynamic_tolerance = max(vertical_tolerance, int((np.median(heights) if heights else 20) * 0.6))
        normalized.sort(key=lambda w: (w['y'], w['x']))

        line_groups = []
        for word in normalized:
            best_idx = -1
            best_delta = float('inf')
            for idx, line in enumerate(line_groups):
                delta = abs(word['y'] - line['avg_y'])
                if delta <= dynamic_tolerance and delta < best_delta:
                    best_idx = idx
                    best_delta = delta

            if best_idx == -1:
                line_groups.append({'avg_y': float(word['y']), 'count': 1, 'words': [word]})
            else:
                line = line_groups[best_idx]
                line['words'].append(word)
                line['avg_y'] = (line['avg_y'] * line['count'] + word['y']) / (line['count'] + 1)
                line['count'] += 1

        line_groups.sort(key=lambda line: line['avg_y'])

        merged = []
        for line in line_groups:
            line_words = sorted(line['words'], key=lambda w: w['x'])
            min_left = min(w['x'] for w in line_words)
            min_top = min(w['y'] for w in line_words)
            max_right = max(w['x'] + w['width'] for w in line_words)
            max_bottom = max(w['y'] + w['height'] for w in line_words)
            line_text = ' '.join(w['text'] for w in line_words).strip()

            merged.append(
                {
                    'text': line_text,
                    'bbox': {
                        'x': int(min_left),
                        'y': int(min_top),
                        'width': int(max(0, max_right - min_left)),
                        'height': int(max(0, max_bottom - min_top)),
                    },
                    'word_count': len(line_words),
                }
            )

        return merged

    def extract_fallback_fields_from_lines(self, text):
        """Infer minimal structured fields from line-based OCR output."""
        if not text:
            return {}

        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        fields = {}

        institution_line = next(
            (ln for ln in lines if re.search(r'\b(university|college|institute|school|board)\b', ln, re.IGNORECASE)),
            None,
        )
        if institution_line:
            fields['institution'] = {
                'value': institution_line,
                'confidence': 65,
                'coordinates': self.get_field_coordinates(text, institution_line),
            }

        degree_line = next(
            (ln for ln in lines if re.search(r'\b(bachelor|master|doctor|diploma|certificate|degree|ssc|secondary)\b', ln, re.IGNORECASE)),
            None,
        )
        if degree_line:
            fields['degree'] = {
                'value': degree_line,
                'confidence': 60,
                'coordinates': self.get_field_coordinates(text, degree_line),
            }

        date_match = re.search(r'\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})\b', text)
        if date_match:
            value = date_match.group(1)
            fields['graduation_date'] = {
                'value': value,
                'confidence': 55,
                'coordinates': self.get_field_coordinates(text, value),
            }

        if lines and len(lines[0].split()) >= 2 and len(lines[0].split()) <= 6 and 'student_name' not in fields:
            candidate_name = lines[0]
            if re.match(r'^[A-Za-z\s\.\-]+$', candidate_name):
                fields['student_name'] = {
                    'value': candidate_name,
                    'confidence': 50,
                    'coordinates': self.get_field_coordinates(text, candidate_name),
                }

        return fields
    
    def calculate_ocr_confidence(self, image, text):
        """
        Calculate overall OCR confidence
        """
        try:
            # Get word-level confidence from Tesseract
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            
            if confidences:
                return sum(confidences) / len(confidences)
            else:
                return 50  # Default confidence if no data
        except:
            return 50
    
    def calculate_field_confidence(self, value, field_type):
        """
        Calculate confidence for extracted field
        """
        base_confidence = 80
        
        # Adjust based on field type and value characteristics
        if field_type == 'student_name':
            if re.match(r'^[A-Za-z\s]+$', value) and len(value.split()) >= 2:
                return min(95, base_confidence + 15)
        elif field_type == 'graduation_date':
            if re.match(r'\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}', value):
                return min(95, base_confidence + 15)
        elif field_type == 'gpa':
            try:
                gpa_val = float(value)
                if 0 <= gpa_val <= 4.0:
                    return min(95, base_confidence + 15)
            except:
                pass
        
        return base_confidence
    
    def get_field_coordinates(self, text, value):
        """
        Get approximate coordinates of field in text
        """
        # This is a simplified implementation
        # In practice, you'd use OCR bounding box data
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if value in line:
                char_pos = line.find(value)
                return {
                    'x': char_pos * 10,  # Approximate
                    'y': i * 20,        # Approximate
                    'width': len(value) * 10,
                    'height': 20
                }
        
        return {'x': 0, 'y': 0, 'width': 100, 'height': 20}
    
    def translate_text(self, text):
        """
        Translate text to English
        """
        try:
            result = self.translator.translate(text, dest='en')
            return result.text
        except Exception as e:
            logger.error(f"Translation failed: {str(e)}")
            return text
