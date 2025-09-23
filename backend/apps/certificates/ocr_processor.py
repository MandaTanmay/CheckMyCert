import cv2
import numpy as np
import pytesseract
import easyocr
from PIL import Image
import re
from googletrans import Translator
import logging

logger = logging.getLogger(__name__)

class OCRProcessor:
    def __init__(self):
        self.translator = Translator()
        self.easyocr_reader = easyocr.Reader(['en'])
        
    def process_certificate(self, file_path, language='auto', translate=False):
        """
        Main OCR processing function
        """
        try:
            # Preprocess image
            processed_image = self.preprocess_image(file_path)
            
            # Extract text using Tesseract
            raw_text = self.extract_text_tesseract(processed_image, language)
            
            # Fallback to EasyOCR if Tesseract fails
            if not raw_text.strip():
                raw_text = self.extract_text_easyocr(processed_image)
            
            # Extract structured fields
            extracted_fields = self.extract_structured_fields(raw_text)
            
            # Calculate confidence
            confidence = self.calculate_ocr_confidence(processed_image, raw_text)
            
            # Translate if requested
            if translate and language != 'en':
                translated_text = self.translate_text(raw_text)
                translated_fields = self.extract_structured_fields(translated_text)
                
                return {
                    'raw_text': raw_text,
                    'translated_text': translated_text,
                    'extracted_fields': translated_fields,
                    'original_fields': extracted_fields,
                    'confidence': confidence,
                    'language_detected': language
                }
            
            return {
                'raw_text': raw_text,
                'extracted_fields': extracted_fields,
                'confidence': confidence,
                'language_detected': language
            }
            
        except Exception as e:
            logger.error(f"OCR processing failed: {str(e)}")
            return {
                'raw_text': '',
                'extracted_fields': {},
                'confidence': 0,
                'error': str(e)
            }
    
    def preprocess_image(self, file_path):
        """
        Preprocess image for better OCR results
        """
        # Load image
        image = cv2.imread(file_path)
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
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
        
        # Extract text
        text = pytesseract.image_to_string(image, config=config)
        
        return text.strip()
    
    def extract_text_easyocr(self, image):
        """
        Extract text using EasyOCR as fallback
        """
        results = self.easyocr_reader.readtext(image)
        text = ' '.join([result[1] for result in results])
        return text.strip()
    
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
                r'awarded to\s+([A-Za-z\s]+?)(?:\n|$)',
            ],
            'degree': [
                r'(?:degree|diploma|certificate)[\s:]+([A-Za-z\s]+?)(?:\n|$)',
                r'Bachelor of\s+([A-Za-z\s]+?)(?:\n|$)',
                r'Master of\s+([A-Za-z\s]+?)(?:\n|$)',
                r'Doctor of\s+([A-Za-z\s]+?)(?:\n|$)',
            ],
            'institution': [
                r'(?:university|college|institute|school)[\s:]*([A-Za-z\s]+?)(?:\n|$)',
                r'^([A-Za-z\s]+?(?:University|College|Institute|School))',
            ],
            'graduation_date': [
                r'(?:date|graduated|conferred)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
                r'(?:date|graduated|conferred)[\s:]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})',
                r'(\d{4})',  # Year only
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
