"""
Priority Predictor Module
=========================
This module contains the PriorityPredictor class that wraps the XGBoost model
and provides priority scoring with explainability.

The predictor uses a trained XGBoost regression model to score patients
based on multiple factors, then applies fairness adjustments for rural patients.
"""

import numpy as np
import joblib
from typing import Dict, Any, Optional


class PriorityPredictor:
    """
    ML-based patient priority predictor for telemedicine queue optimization.
    
    This class encapsulates the XGBoost model and provides:
    - Priority score prediction (0-100)
    - Human-readable explanations for scores
    - Rural fairness adjustments
    - Feature importance tracking
    
    Attributes:
        model: The trained XGBoost model
        is_loaded: Boolean indicating if model is ready
        feature_names: List of input feature names
    """
    
    # Feature names in order expected by the model
    FEATURE_NAMES = ["age", "severity", "rural", "chronic", "waiting_time"]
    
    # Fairness adjustment for rural patients
    RURAL_FAIRNESS_UPLIFT = 10
    
    def __init__(self):
        """Initialize the predictor with no model loaded."""
        self.model = None
        self.is_loaded = False
        self.feature_names = self.FEATURE_NAMES
    
    def load_model(self, model_path: str) -> None:
        """
        Load a pre-trained model from disk.
        
        Args:
            model_path: Path to the saved model file (.joblib)
            
        Raises:
            FileNotFoundError: If model file doesn't exist
            Exception: If model loading fails
        """
        try:
            self.model = joblib.load(model_path)
            self.is_loaded = True
            print(f"✅ Model loaded from {model_path}")
        except Exception as e:
            self.is_loaded = False
            raise Exception(f"Failed to load model: {str(e)}")
    
    def save_model(self, model_path: str) -> None:
        """
        Save the trained model to disk.
        
        Args:
            model_path: Path where model will be saved
        """
        if self.model is not None:
            joblib.dump(self.model, model_path)
            print(f"✅ Model saved to {model_path}")
    
    def predict(
        self,
        age: int,
        severity: int,
        rural: int,
        chronic: int,
        waiting_time: float
    ) -> Dict[str, Any]:
        """
        Predict priority score for a patient.
        
        This method:
        1. Prepares input features
        2. Gets raw prediction from XGBoost model
        3. Applies rural fairness uplift
        4. Clamps score to 0-100 range
        5. Generates human-readable explanation
        
        Args:
            age: Patient age in years (0-120)
            severity: Symptom severity (1-10)
            rural: Rural location flag (0 or 1)
            chronic: Chronic illness flag (0 or 1)
            waiting_time: Current waiting time in minutes
            
        Returns:
            Dictionary with:
                - priority_score: Integer score from 0-100
                - reason: Human-readable explanation string
        """
        if not self.is_loaded:
            raise Exception("Model not loaded")
        
        # Prepare features as numpy array
        features = np.array([[age, severity, rural, chronic, waiting_time]])
        
        # Get raw prediction from model
        raw_score = self.model.predict(features)[0]
        
        # Apply rural fairness uplift
        # Rural patients face connectivity challenges and deserve priority
        if rural == 1:
            raw_score += self.RURAL_FAIRNESS_UPLIFT
        
        # Clamp score to valid range [0, 100]
        priority_score = int(np.clip(raw_score, 0, 100))
        
        # Generate explanation
        reason = self._generate_explanation(
            age=age,
            severity=severity,
            rural=rural,
            chronic=chronic,
            waiting_time=waiting_time,
            score=priority_score
        )
        
        return {
            "priority_score": priority_score,
            "reason": reason
        }
    
    def _generate_explanation(
        self,
        age: int,
        severity: int,
        rural: int,
        chronic: int,
        waiting_time: float,
        score: int
    ) -> str:
        """
        Generate a human-readable explanation for the priority score.
        
        This provides transparency and explainability for the ML decision,
        which is important in healthcare applications.
        
        Args:
            All patient features and the computed score
            
        Returns:
            Human-readable explanation string
        """
        factors = []
        
        # Analyze each factor's contribution
        if severity >= 8:
            factors.append("High severity")
        elif severity >= 5:
            factors.append("Moderate severity")
        else:
            factors.append("Low severity")
        
        if age >= 65:
            factors.append("elderly patient")
        elif age >= 50:
            factors.append("middle-aged patient")
        
        if rural == 1:
            factors.append("rural location (fairness uplift applied)")
        
        if chronic == 1:
            factors.append("chronic illness")
        
        if waiting_time >= 60:
            factors.append("long wait time")
        elif waiting_time >= 30:
            factors.append("moderate wait time")
        
        # Construct the explanation
        if score >= 80:
            priority_level = "HIGH PRIORITY"
        elif score >= 50:
            priority_level = "MEDIUM PRIORITY"
        else:
            priority_level = "LOW PRIORITY"
        
        # Join factors with proper grammar
        if len(factors) > 1:
            factor_text = ", ".join(factors[:-1]) + ", and " + factors[-1]
        elif len(factors) == 1:
            factor_text = factors[0]
        else:
            factor_text = "standard case"
        
        return f"{priority_level}: {factor_text}"
    
    def get_feature_importance(self) -> Optional[Dict[str, float]]:
        """
        Get feature importance from the trained model.
        
        Returns:
            Dictionary mapping feature names to importance scores,
            or None if model not loaded
        """
        if not self.is_loaded or self.model is None:
            return None
        
        try:
            importances = self.model.feature_importances_
            return dict(zip(self.feature_names, importances.tolist()))
        except AttributeError:
            return None
