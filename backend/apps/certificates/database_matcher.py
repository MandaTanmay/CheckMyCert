from django.db.models import Q
from apps.institutions.models import Institution, InstitutionDatabase
import difflib
import re
import logging

logger = logging.getLogger(__name__)

class DatabaseMatcher:
    def __init__(self):
        self.similarity_threshold = 0.8
    
    def find_matches(self, extracted_fields):
        """
        Find matching records in institution databases
        """
        try:
            # Extract key fields for matching
            student_name = self.extract_field_value(extracted_fields, 'student_name')
            degree = self.extract_field_value(extracted_fields, 'degree')
            institution_name = self.extract_field_value(extracted_fields, 'institution')
            graduation_date = self.extract_field_value(extracted_fields, 'graduation_date')
            certificate_number = self.extract_field_value(extracted_fields, 'certificate_number')
            registration_number = self.extract_field_value(extracted_fields, 'registration_number')
            roll_number = self.extract_field_value(extracted_fields, 'roll_number')

            identifier = certificate_number or registration_number
            
            if not student_name and not identifier and not roll_number:
                return {
                    'match_found': False,
                    'confidence': 0,
                    'details': 'Insufficient data for database matching'
                }
            
            # Find potential institution matches
            institutions = self.find_matching_institutions(institution_name)
            
            if not institutions:
                return {
                    'match_found': False,
                    'confidence': 0,
                    'details': 'No matching institutions found'
                }
            
            # Search for student records in matching institutions
            best_match = None
            best_confidence = 0
            
            for institution in institutions:
                matches = self.search_institution_records(
                    institution,
                    student_name,
                    degree,
                    graduation_date,
                    identifier,
                    roll_number,
                )
                
                for match in matches:
                    confidence = self.calculate_match_confidence(extracted_fields, match['record'])
                    
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_match = {
                            'institution': institution,
                            'record': match['record'],
                            'confidence': confidence
                        }
            
            if best_match and best_confidence >= self.similarity_threshold * 100:
                return {
                    'match_found': True,
                    'confidence': best_confidence,
                    'institution': best_match['institution'],
                    'record': best_match['record'],
                    'details': f'Found matching record with {best_confidence:.1f}% confidence'
                }
            else:
                return {
                    'match_found': False,
                    'confidence': best_confidence,
                    'details': f'Best match confidence ({best_confidence:.1f}%) below threshold'
                }
                
        except Exception as e:
            logger.error(f"Database matching failed: {str(e)}")
            return {
                'match_found': False,
                'confidence': 0,
                'error': str(e)
            }
    
    def extract_field_value(self, extracted_fields, field_name):
        """
        Extract field value from OCR results
        """
        field_data = extracted_fields.get(field_name)
        if field_data and isinstance(field_data, dict):
            return field_data.get('value', '').strip()
        return ''
    
    def find_matching_institutions(self, institution_name):
        """
        Find institutions that match the extracted name
        """
        if not institution_name:
            return Institution.objects.all()[:10]  # Return sample if no name
        
        # Clean institution name
        clean_name = self.clean_institution_name(institution_name)
        
        # Search for exact matches first
        exact_matches = Institution.objects.filter(
            Q(name__icontains=clean_name) |
            Q(short_name__icontains=clean_name)
        )
        
        if exact_matches.exists():
            return exact_matches
        
        # Fuzzy matching for partial matches / OCR variants.
        all_institutions = Institution.objects.all()
        fuzzy_matches = []
        
        for institution in all_institutions:
            inst_name = self.clean_institution_name(institution.name or '').lower()
            seq_similarity = difflib.SequenceMatcher(None, clean_name.lower(), inst_name).ratio()

            clean_tokens = set(clean_name.lower().split())
            inst_tokens = set(inst_name.split())
            overlap = (len(clean_tokens & inst_tokens) / len(clean_tokens | inst_tokens)) if (clean_tokens and inst_tokens) else 0

            contains_bonus = 0
            if clean_name.lower() in inst_name or inst_name in clean_name.lower():
                contains_bonus = 0.2

            score = max(seq_similarity, overlap + contains_bonus)

            if score >= 0.6:
                fuzzy_matches.append((institution, score))
        
        # Sort by similarity and return top matches
        fuzzy_matches.sort(key=lambda x: x[1], reverse=True)
        return [match[0] for match in fuzzy_matches[:5]]
    
    def clean_institution_name(self, name):
        """
        Clean and normalize institution name for matching
        """
        # Remove common suffixes and prefixes
        name = re.sub(r'\b(the|of|and)\b', '', name, flags=re.IGNORECASE)
        name = re.sub(r'[^\w\s]', '', name)  # Remove punctuation
        name = ' '.join(name.split())  # Normalize whitespace
        return name.strip()
    
    def search_institution_records(self, institution, student_name, degree, graduation_date, identifier=None, roll_number=None):
        """
        Search for student records in a specific institution
        """
        return self._search_institution_records(
            institution,
            student_name,
            degree,
            graduation_date,
            identifier=identifier,
            roll_number=roll_number,
        )

    def _search_institution_records(self, institution, student_name, degree, graduation_date, identifier, roll_number):
        """Search for records with optional strong identifier matching."""
        query = Q(institution=institution)

        # Identifier-first narrowing gives deterministic matches when available.
        if identifier:
            query &= Q(certificate_number__iexact=identifier)
        elif roll_number:
            query &= Q(student_id__iexact=roll_number)
        
        # Add student name filter
        if student_name:
            name_parts = student_name.split()
            for part in name_parts:
                if len(part) > 2:  # Skip short words
                    query &= Q(student_name__icontains=part)
        
        # Add degree filter if available
        if degree:
            query &= Q(
                Q(certificate_type__icontains=degree) |
                Q(degree_program__icontains=degree) |
                Q(major__icontains=degree)
            )
        
        # Add graduation date filter if available
        if graduation_date:
            parsed_date = self.parse_graduation_date(graduation_date)
            if parsed_date:
                query &= Q(graduation_date=parsed_date)
        
        records = InstitutionDatabase.objects.filter(query)

        # If identifier-constrained query returned nothing, fall back to fuzzy query path.
        if not records.exists() and (identifier or roll_number):
            query = Q(institution=institution)

            if student_name:
                name_parts = student_name.split()
                for part in name_parts:
                    if len(part) > 2:
                        query &= Q(student_name__icontains=part)

            if degree:
                query &= Q(
                    Q(certificate_type__icontains=degree) |
                    Q(degree_program__icontains=degree) |
                    Q(major__icontains=degree)
                )

            if graduation_date:
                parsed_date = self.parse_graduation_date(graduation_date)
                if parsed_date:
                    query &= Q(graduation_date=parsed_date)

            records = InstitutionDatabase.objects.filter(query)
        
        return [{'record': record} for record in records]
    
    def parse_graduation_date(self, date_string):
        """
        Parse graduation date from various formats
        """
        try:
            # Try different date formats
            import datetime
            
            # Format: "June 15, 2023"
            if re.match(r'[A-Za-z]+\s+\d{1,2},?\s+\d{4}', date_string):
                return datetime.datetime.strptime(date_string, '%B %d, %Y').date()
            
            # Format: "06/15/2023"
            if re.match(r'\d{1,2}/\d{1,2}/\d{4}', date_string):
                return datetime.datetime.strptime(date_string, '%m/%d/%Y').date()

            # Format: "06-15-2023"
            if re.match(r'\d{1,2}-\d{1,2}-\d{4}', date_string):
                return datetime.datetime.strptime(date_string, '%m-%d-%Y').date()

            # Format: "06.08.2021" (common OCR output)
            if re.match(r'\d{1,2}\.\d{1,2}\.\d{4}', date_string):
                return datetime.datetime.strptime(date_string, '%d.%m.%Y').date()

            # Format: "2021-08-06"
            if re.match(r'\d{4}-\d{1,2}-\d{1,2}', date_string):
                return datetime.datetime.strptime(date_string, '%Y-%m-%d').date()
            
            # Format: "2023"
            if re.match(r'^\d{4}$', date_string):
                return datetime.date(int(date_string), 6, 15)  # Assume mid-year
            
        except Exception as e:
            logger.error(f"Date parsing failed: {str(e)}")
        
        return None
    
    def calculate_match_confidence(self, extracted_fields, db_record):
        """
        Calculate confidence score for a potential match
        """
        confidence_scores = []

        # Strong identifier checks first.
        extracted_cert = (
            self.extract_field_value(extracted_fields, 'certificate_number')
            or self.extract_field_value(extracted_fields, 'registration_number')
        )
        extracted_roll = self.extract_field_value(extracted_fields, 'roll_number')

        if extracted_cert and db_record.certificate_number:
            if extracted_cert.strip().lower() == db_record.certificate_number.strip().lower():
                confidence_scores.append(40)

        if extracted_roll and db_record.student_id:
            if extracted_roll.strip().lower() == db_record.student_id.strip().lower():
                confidence_scores.append(30)
        
        # Compare student name
        extracted_name = self.extract_field_value(extracted_fields, 'student_name')
        if extracted_name and db_record.student_name:
            name_similarity = difflib.SequenceMatcher(
                None, extracted_name.lower(), db_record.student_name.lower()
            ).ratio()
            confidence_scores.append(name_similarity * 40)  # 40% weight
        
        # Compare degree/program
        extracted_degree = self.extract_field_value(extracted_fields, 'degree')
        if extracted_degree:
            degree_fields = [
                db_record.certificate_type,
                db_record.degree_program,
                db_record.major
            ]
            
            best_degree_match = 0
            for field in degree_fields:
                if field:
                    similarity = difflib.SequenceMatcher(
                        None, extracted_degree.lower(), field.lower()
                    ).ratio()
                    best_degree_match = max(best_degree_match, similarity)
            
            confidence_scores.append(best_degree_match * 30)  # 30% weight
        
        # Compare graduation date
        extracted_date = self.extract_field_value(extracted_fields, 'graduation_date')
        if extracted_date and db_record.graduation_date:
            parsed_date = self.parse_graduation_date(extracted_date)
            if parsed_date and parsed_date == db_record.graduation_date:
                confidence_scores.append(30)  # 30% weight for exact date match
            elif parsed_date and abs((parsed_date - db_record.graduation_date).days) <= 365:
                confidence_scores.append(15)  # Partial credit for close dates
        
        # Calculate overall confidence
        if confidence_scores:
            return min(100, sum(confidence_scores))
        else:
            return 0
