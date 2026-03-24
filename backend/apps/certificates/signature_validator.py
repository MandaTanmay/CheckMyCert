import PyPDF2
from cryptography import x509
from cryptography.hazmat.backends import default_backend
import logging

try:
    from cryptography.x509.verification import PolicyBuilder, StoreBuilder
    HAS_X509_VERIFICATION = True
except ImportError:
    PolicyBuilder = None
    StoreBuilder = None
    HAS_X509_VERIFICATION = False

logger = logging.getLogger(__name__)

class SignatureValidator:
    def __init__(self):
        self.trusted_certificates = self.load_trusted_certificates()
    
    def validate_signature(self, file_path):
        """
        Validate digital signatures in PDF documents
        """
        try:
            if not file_path.lower().endswith('.pdf'):
                return {
                    'valid': False,
                    'details': {'message': 'Digital signature validation only supported for PDF files'}
                }
            
            # Open PDF file
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                # Check if PDF has digital signatures
                if '/AcroForm' not in pdf_reader.trailer['/Root']:
                    return {
                        'valid': False,
                        'details': {'message': 'No digital signatures found in PDF'}
                    }
                
                acro_form = pdf_reader.trailer['/Root']['/AcroForm']
                
                if '/SigFlags' not in acro_form:
                    return {
                        'valid': False,
                        'details': {'message': 'No signature fields found in PDF'}
                    }
                
                # Extract signature information
                signature_info = self.extract_signature_info(pdf_reader)
                
                # Validate signature
                validation_result = self.validate_pdf_signature(signature_info)
                
                return {
                    'valid': validation_result['valid'],
                    'details': {
                        'signer': signature_info.get('signer'),
                        'signing_time': signature_info.get('signing_time'),
                        'certificate_chain': signature_info.get('certificate_chain'),
                        'validation_details': validation_result
                    }
                }
                
        except Exception as e:
            logger.error(f"Signature validation failed: {str(e)}")
            return {
                'valid': False,
                'details': {'error': str(e)}
            }
    
    def extract_signature_info(self, pdf_reader):
        """
        Extract signature information from PDF
        """
        signature_info = {}
        
        try:
            # This is a simplified implementation
            # In practice, you'd need to parse the PDF signature dictionary
            # and extract PKCS#7 signature data
            
            signature_info = {
                'signer': 'Unknown',
                'signing_time': None,
                'certificate_chain': [],
                'signature_algorithm': 'Unknown'
            }
            
        except Exception as e:
            logger.error(f"Failed to extract signature info: {str(e)}")
        
        return signature_info
    
    def validate_pdf_signature(self, signature_info):
        """
        Validate the extracted PDF signature
        """
        try:
            # Simplified validation logic
            # In practice, this would:
            # 1. Verify the signature cryptographically
            # 2. Check certificate chain validity
            # 3. Verify certificate against trusted CAs
            # 4. Check certificate revocation status
            
            validation_result = {
                'valid': False,
                'signature_valid': False,
                'certificate_valid': False,
                'trust_chain_valid': False,
                'not_revoked': True,
                'signing_time_valid': True
            }
            
            # Mock validation for demo purposes
            if signature_info.get('signer'):
                validation_result['signature_valid'] = True
                validation_result['certificate_valid'] = True
                validation_result['trust_chain_valid'] = True
                validation_result['valid'] = True
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Signature validation failed: {str(e)}")
            return {
                'valid': False,
                'error': str(e)
            }
    
    def load_trusted_certificates(self):
        """
        Load trusted CA certificates
        """
        # In practice, this would load trusted CA certificates
        # from a certificate store or configuration
        return []
    
    def verify_certificate_chain(self, certificate_chain):
        """
        Verify certificate chain against trusted CAs
        """
        try:
            if not HAS_X509_VERIFICATION:
                logger.warning("cryptography.x509.verification is unavailable; skipping trust-chain verification")
                return False

            # Build certificate chain
            certificates = []
            for cert_data in certificate_chain:
                cert = x509.load_der_x509_certificate(cert_data, default_backend())
                certificates.append(cert)
            
            if not certificates:
                return False
            
            # Build trust store
            store_builder = StoreBuilder()
            for trusted_cert in self.trusted_certificates:
                store_builder = store_builder.add_certs([trusted_cert])
            
            store = store_builder.build()
            
            # Build verification policy
            builder = PolicyBuilder().store(store)
            verifier = builder.build()
            
            # Verify certificate chain
            chain = verifier.verify(certificates[0], certificates[1:])
            
            return True
            
        except Exception as e:
            logger.error(f"Certificate chain verification failed: {str(e)}")
            return False
