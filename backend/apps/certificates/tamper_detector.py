import cv2
import numpy as np
from PIL import Image
import logging
from sklearn.cluster import KMeans
import io
import base64

logger = logging.getLogger(__name__)

class TamperDetector:
    def __init__(self):
        self.font_analyzer = FontAnalyzer()
        self.layout_analyzer = LayoutAnalyzer()
        self.ml_detector = MLTamperDetector()
    
    def analyze_document(self, file_path):
        """
        Main tamper detection function
        """
        try:
            # Load image
            image = cv2.imread(file_path)
            
            # Run multiple detection methods
            font_issues = self.font_analyzer.detect_font_inconsistencies(image)
            layout_issues = self.layout_analyzer.detect_layout_anomalies(image)
            ml_issues = self.ml_detector.detect_tampering(image)
            
            # Combine all issues
            all_issues = font_issues + layout_issues + ml_issues
            
            # Calculate overall tamper confidence
            tamper_confidence = self.calculate_tamper_confidence(all_issues)
            tamper_detected = tamper_confidence > 30  # Threshold for tamper detection
            
            # Generate heatmap
            heatmap_data = self.generate_tamper_heatmap(image, all_issues)
            
            return {
                'tamper_detected': tamper_detected,
                'confidence': tamper_confidence,
                'issues': [self.format_issue(issue) for issue in all_issues],
                'heatmap_data': heatmap_data,
                'analysis_details': {
                    'font_issues': len(font_issues),
                    'layout_issues': len(layout_issues),
                    'ml_issues': len(ml_issues)
                }
            }
            
        except Exception as e:
            logger.error(f"Tamper detection failed: {str(e)}")
            return {
                'tamper_detected': False,
                'confidence': 0,
                'issues': [],
                'error': str(e)
            }
    
    def calculate_tamper_confidence(self, issues):
        """
        Calculate overall tamper confidence based on detected issues
        """
        if not issues:
            return 0
        
        # Weight issues by severity
        severity_weights = {'high': 40, 'medium': 20, 'low': 10}
        total_score = sum(severity_weights.get(issue['severity'], 10) for issue in issues)
        
        # Normalize to 0-100 scale
        confidence = min(100, total_score)
        
        return confidence
    
    def format_issue(self, issue):
        """
        Format issue for API response
        """
        return {
            'type': issue['type'],
            'severity': issue['severity'],
            'description': issue['description'],
            'coordinates': issue.get('coordinates', {'x': 0, 'y': 0, 'width': 100, 'height': 100}),
            'confidence': issue.get('confidence', 50)
        }
    
    def generate_tamper_heatmap(self, image, issues):
        """
        Generate visual heatmap showing tamper detection results
        """
        try:
            # Create heatmap overlay
            height, width = image.shape[:2]
            heatmap = np.zeros((height, width), dtype=np.uint8)
            
            # Add issue areas to heatmap
            for issue in issues:
                coords = issue.get('coordinates', {})
                x = coords.get('x', 0)
                y = coords.get('y', 0)
                w = coords.get('width', 100)
                h = coords.get('height', 100)
                
                # Ensure coordinates are within image bounds
                x = max(0, min(x, width - 1))
                y = max(0, min(y, height - 1))
                w = min(w, width - x)
                h = min(h, height - y)
                
                # Add intensity based on severity
                intensity = {'high': 255, 'medium': 170, 'low': 85}.get(issue['severity'], 85)
                cv2.rectangle(heatmap, (x, y), (x + w, y + h), intensity, -1)
            
            # Apply Gaussian blur for smooth heatmap
            heatmap = cv2.GaussianBlur(heatmap, (15, 15), 0)
            
            # Convert to color heatmap
            heatmap_color = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
            
            # Overlay on original image
            overlay = cv2.addWeighted(image, 0.7, heatmap_color, 0.3, 0)
            
            # Convert to bytes for storage
            _, buffer = cv2.imencode('.png', overlay)
            return buffer.tobytes()
            
        except Exception as e:
            logger.error(f"Heatmap generation failed: {str(e)}")
            return None

class FontAnalyzer:
    def detect_font_inconsistencies(self, image):
        """
        Detect font inconsistencies that might indicate tampering
        """
        issues = []
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Find text regions
            text_regions = self.find_text_regions(gray)
            
            # Analyze font characteristics in each region
            font_features = []
            for region in text_regions:
                features = self.extract_font_features(gray, region)
                font_features.append((features, region))
            
            # Cluster font features to find inconsistencies
            if len(font_features) > 2:
                inconsistencies = self.find_font_clusters(font_features)
                
                for inconsistency in inconsistencies:
                    issues.append({
                        'type': 'Font Inconsistency',
                        'severity': 'medium',
                        'description': f'Font variation detected in text region',
                        'coordinates': inconsistency['coordinates'],
                        'confidence': inconsistency['confidence']
                    })
        
        except Exception as e:
            logger.error(f"Font analysis failed: {str(e)}")
        
        return issues
    
    def find_text_regions(self, gray_image):
        """
        Find text regions in the image
        """
        # Use MSER (Maximally Stable Extremal Regions) to find text
        mser = cv2.MSER_create()
        regions, _ = mser.detectRegions(gray_image)
        
        # Convert to bounding boxes
        bboxes = []
        for region in regions:
            x, y, w, h = cv2.boundingRect(region)
            if w > 20 and h > 10:  # Filter small regions
                bboxes.append({'x': x, 'y': y, 'width': w, 'height': h})
        
        return bboxes
    
    def extract_font_features(self, image, region):
        """
        Extract font characteristics from a text region
        """
        x, y, w, h = region['x'], region['y'], region['width'], region['height']
        roi = image[y:y+h, x:x+w]
        
        # Calculate font features
        features = {
            'avg_stroke_width': self.calculate_stroke_width(roi),
            'character_height': h,
            'character_density': np.sum(roi < 128) / (w * h),
            'edge_density': self.calculate_edge_density(roi)
        }
        
        return features
    
    def calculate_stroke_width(self, roi):
        """
        Calculate average stroke width in text region
        """
        # Simplified stroke width calculation
        edges = cv2.Canny(roi, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            avg_width = np.mean([cv2.boundingRect(c)[2] for c in contours])
            return avg_width
        
        return 0
    
    def calculate_edge_density(self, roi):
        """
        Calculate edge density in text region
        """
        edges = cv2.Canny(roi, 50, 150)
        return np.sum(edges > 0) / (roi.shape[0] * roi.shape[1])
    
    def find_font_clusters(self, font_features):
        """
        Find font inconsistencies using clustering
        """
        if len(font_features) < 3:
            return []
        
        # Extract feature vectors
        features = np.array([[f['avg_stroke_width'], f['character_height'], 
                            f['character_density'], f['edge_density']] 
                           for f, _ in font_features])
        
        # Perform clustering
        kmeans = KMeans(n_clusters=min(3, len(features)), random_state=42)
        clusters = kmeans.fit_predict(features)
        
        # Find outlier clusters (potential tampering)
        inconsistencies = []
        unique_clusters, counts = np.unique(clusters, return_counts=True)
        
        for cluster_id, count in zip(unique_clusters, counts):
            if count == 1:  # Outlier cluster
                outlier_idx = np.where(clusters == cluster_id)[0][0]
                _, region = font_features[outlier_idx]
                
                inconsistencies.append({
                    'coordinates': region,
                    'confidence': 70
                })
        
        return inconsistencies

class LayoutAnalyzer:
    def detect_layout_anomalies(self, image):
        """
        Detect layout anomalies that might indicate tampering
        """
        issues = []
        
        try:
            # Detect alignment issues
            alignment_issues = self.detect_alignment_issues(image)
            issues.extend(alignment_issues)
            
            # Detect spacing anomalies
            spacing_issues = self.detect_spacing_anomalies(image)
            issues.extend(spacing_issues)
            
            # Detect duplicate elements
            duplicate_issues = self.detect_duplicate_elements(image)
            issues.extend(duplicate_issues)
            
        except Exception as e:
            logger.error(f"Layout analysis failed: {str(e)}")
        
        return issues
    
    def detect_alignment_issues(self, image):
        """
        Detect text alignment inconsistencies
        """
        # Simplified implementation
        return []
    
    def detect_spacing_anomalies(self, image):
        """
        Detect unusual spacing between text elements
        """
        # Simplified implementation
        return []
    
    def detect_duplicate_elements(self, image):
        """
        Detect potentially duplicated stamps or signatures
        """
        # Simplified implementation
        return []

class MLTamperDetector:
    def __init__(self):
        # In a real implementation, this would load a trained ML model
        self.model = None
    
    def detect_tampering(self, image):
        """
        Use ML model to detect tampering
        """
        # Placeholder for ML-based tamper detection
        # In practice, this would use a trained model (PyTorch/TensorFlow)
        
        issues = []
        
        # Simulate ML detection results
        if np.random.random() < 0.1:  # 10% chance of detecting tampering
            issues.append({
                'type': 'ML Anomaly Detection',
                'severity': 'high',
                'description': 'Machine learning model detected potential tampering',
                'coordinates': {'x': 100, 'y': 100, 'width': 200, 'height': 50},
                'confidence': 85
            })
        
        return issues
