"""
SQLite Certificate Verification Views
API endpoints for certificate verification using SQLite database
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os
import sys

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.append(backend_dir)

from certificate_verifier import CertificateVerifier

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_certificate_with_database(request):
    """
    Enhanced certificate verification with centralized database comparison
    
    Expected input format (from your verification results page):
    {
        "id": "certificate_id",
        "status": "valid|tampered|unverified",
        "overallConfidence": 93.2,
        "extractedFields": [
            {"field": "Student Name", "value": "John Smith", "confidence": 95.2},
            {"field": "Institution", "value": "Stanford University", "confidence": 98.7},
            ...
        ],
        "extractedText": "raw OCR text...",
        "tamperIssues": [...],
        "signatureValid": true,
        "databaseMatch": false
    }
    """
    
    try:
        verification_data = request.data
        
        # Initialize verifier
        verifier = CertificateVerifier()
        
        # Process the verification result
        enhanced_result = verifier.process_verification_result(verification_data)
        
        # Close database connection
        verifier.close()
        
        return Response({
            'success': True,
            'message': 'Certificate verification completed with database comparison',
            'data': enhanced_result
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Verification failed: {str(e)}',
            'data': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_verification_by_id(request, certificate_id):
    """
    Get enhanced verification result by certificate ID
    """
    
    try:
        verifier = CertificateVerifier()
        
        # Get verification result (this would normally query your Django models)
        result = verifier.verify_certificate_by_id(certificate_id)
        
        verifier.close()
        
        if result:
            return Response({
                'success': True,
                'data': result
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': 'Certificate not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error retrieving verification: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_verification_stats(request):
    """
    Get verification system statistics (public endpoint)
    """
    
    try:
        verifier = CertificateVerifier()
        stats = verifier.get_verification_summary()
        verifier.close()
        
        return Response({
            'success': True,
            'data': stats
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error retrieving stats: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
def quick_verify_certificate(request):
    """
    Quick verification endpoint for testing (no authentication required)
    """
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        
        # Extract certificate data directly
        extracted_data = {
            'student_name': data.get('student_name', ''),
            'certificate_number': data.get('certificate_number', ''),
            'institution': data.get('institution', ''),
            'degree': data.get('degree', ''),
            'graduation_date': data.get('graduation_date', '')
        }
        
        # Initialize verifier
        verifier = CertificateVerifier()
        
        # Perform database verification
        db_verification = verifier.db.verify_certificate(extracted_data)
        
        verifier.close()
        
        # Determine if person is issued the certificate
        is_issued = (
            db_verification['database_match'] and 
            db_verification['confidence_score'] >= 70 and
            db_verification['verification_status'] in ['valid', 'unverified']
        )
        
        return JsonResponse({
            'success': True,
            'is_certificate_issued': is_issued,
            'verification_status': db_verification['verification_status'],
            'confidence_score': db_verification['confidence_score'],
            'database_match': db_verification['database_match'],
            'matched_institution': db_verification['matched_institution'],
            'matched_record': db_verification['matched_record'],
            'comparison_details': db_verification['comparison_details'],
            'message': (
                'Certificate is valid - Person IS issued this certificate' if is_issued
                else 'Certificate verification failed - Person may NOT be issued this certificate'
            )
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)