"""
Model Training Module
=====================
This module handles training the XGBoost model for patient priority scoring.
It includes synthetic data generation for initial training and model training utilities.

In production, you would replace generate_training_data() with real historical data
from your clinic's patient records and outcomes.
"""

import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from typing import Tuple
import os


def generate_training_data(n_samples: int = 5000) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic training data for the priority scoring model.
    
    This creates realistic patient data with appropriate distributions and
    generates target priority scores based on domain knowledge of telemedicine
    prioritization factors.
    
    In production, replace this with real historical data extraction.
    
    Args:
        n_samples: Number of training samples to generate
        
    Returns:
        Tuple of (X, y) where:
            X: Feature matrix with shape (n_samples, 5)
            y: Target priority scores with shape (n_samples,)
    
    Features generated:
        - age: Normal distribution centered at 45, range 0-100
        - severity: Uniform distribution 1-10
        - rural: Binary 0/1, 30% rural population
        - chronic: Binary 0/1, 25% with chronic conditions
        - waiting_time: Exponential distribution, avg 20 minutes
    """
    np.random.seed(42)  # For reproducibility
    
    # Generate realistic patient demographics
    age = np.clip(np.random.normal(45, 20, n_samples), 0, 100).astype(int)
    
    # Severity distribution skewed towards lower values (most cases aren't severe)
    severity = np.clip(np.random.exponential(3, n_samples) + 1, 1, 10).astype(int)
    
    # Rural population (~30%)
    rural = np.random.binomial(1, 0.3, n_samples)
    
    # Chronic illness (~25%, higher in elderly)
    chronic_base_prob = 0.15
    chronic_age_factor = (age / 100) * 0.3  # Higher chance for elderly
    chronic = np.random.binomial(1, np.clip(chronic_base_prob + chronic_age_factor, 0, 0.8))
    
    # Waiting time in minutes (exponential distribution)
    waiting_time = np.clip(np.random.exponential(20, n_samples), 0, 120).astype(float)
    
    # Create feature matrix
    X = np.column_stack([age, severity, rural, chronic, waiting_time])
    
    # Generate target priority scores based on domain knowledge
    # This formula captures the expected prioritization logic
    y = compute_priority_score(age, severity, rural, chronic, waiting_time)
    
    print(f"📊 Generated {n_samples} training samples")
    print(f"   Features: {['age', 'severity', 'rural', 'chronic', 'waiting_time']}")
    print(f"   Target range: {y.min():.1f} - {y.max():.1f}")
    
    return X, y


def compute_priority_score(
    age: np.ndarray,
    severity: np.ndarray,
    rural: np.ndarray,
    chronic: np.ndarray,
    waiting_time: np.ndarray
) -> np.ndarray:
    """
    Compute ground truth priority scores for training data.
    
    This function encodes domain knowledge about telemedicine prioritization:
    - Severity is the most important factor (40% weight)
    - Age matters, especially for elderly (20% weight)
    - Chronic conditions increase priority (15% weight)
    - Rural location gets fairness consideration (15% weight)
    - Waiting time adds urgency (10% weight)
    
    Args:
        All patient features as numpy arrays
        
    Returns:
        Priority scores as numpy array (0-100 range)
    """
    # Base score from severity (most important factor)
    # Severity 1 -> ~10 points, Severity 10 -> ~40 points
    severity_score = (severity / 10) * 40
    
    # Age factor: elderly patients need priority
    # Age 0-40: minimal boost, 65+: significant boost
    age_score = np.where(age >= 65, 20, np.where(age >= 50, 10, age / 10))
    
    # Chronic illness factor
    chronic_score = chronic * 15
    
    # Rural factor (connectivity challenges deserve consideration)
    rural_score = rural * 15
    
    # Waiting time factor (caps at 60 minutes for max effect)
    waiting_score = np.minimum(waiting_time / 60, 1) * 10
    
    # Combine all factors
    total_score = severity_score + age_score + chronic_score + rural_score + waiting_score
    
    # Add small random noise to simulate real-world variability
    noise = np.random.normal(0, 3, len(total_score))
    total_score = total_score + noise
    
    # Clamp to valid range
    return np.clip(total_score, 0, 100)


def train_model(
    predictor,
    X: np.ndarray,
    y: np.ndarray,
    model_path: str
) -> dict:
    """
    Train the XGBoost model for priority prediction.
    
    Args:
        predictor: PriorityPredictor instance to train
        X: Feature matrix
        y: Target values
        model_path: Path to save the trained model
        
    Returns:
        Dictionary with training metrics
    """
    print("🎯 Training XGBoost model...")
    
    # Split data into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Initialize XGBoost model with tuned hyperparameters
    # These parameters are optimized for this use case
    model = XGBRegressor(
        n_estimators=100,          # Number of trees
        max_depth=5,               # Prevent overfitting
        learning_rate=0.1,         # Learning rate
        min_child_weight=3,        # Minimum sum of instance weight
        subsample=0.8,             # Subsample ratio of training instances
        colsample_bytree=0.8,      # Subsample ratio of columns
        objective='reg:squarederror',  # Regression objective
        random_state=42,
        n_jobs=-1                  # Use all CPU cores
    )
    
    # Train the model
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Evaluate model performance
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"   Mean Squared Error: {mse:.2f}")
    print(f"   R² Score: {r2:.4f}")
    
    # Feature importance
    feature_names = ['age', 'severity', 'rural', 'chronic', 'waiting_time']
    importances = model.feature_importances_
    
    print("   Feature Importances:")
    for name, imp in sorted(zip(feature_names, importances), key=lambda x: -x[1]):
        print(f"      {name}: {imp:.4f}")
    
    # Save model to predictor and disk
    predictor.model = model
    predictor.is_loaded = True
    
    # Ensure model directory exists
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    predictor.save_model(model_path)
    
    return {
        "mse": mse,
        "r2": r2,
        "feature_importance": dict(zip(feature_names, importances.tolist()))
    }


def create_sample_predictions():
    """
    Create sample predictions for testing the model.
    These examples demonstrate expected behavior.
    """
    test_cases = [
        {
            "name": "High Priority - Elderly Rural Chronic",
            "age": 75,
            "severity": 9,
            "rural": 1,
            "chronic": 1,
            "waiting_time": 45,
            "expected": "High (80+)"
        },
        {
            "name": "Medium Priority - Middle Age Urban",
            "age": 45,
            "severity": 5,
            "rural": 0,
            "chronic": 1,
            "waiting_time": 20,
            "expected": "Medium (40-70)"
        },
        {
            "name": "Low Priority - Young Healthy",
            "age": 25,
            "severity": 2,
            "rural": 0,
            "chronic": 0,
            "waiting_time": 5,
            "expected": "Low (0-30)"
        },
    ]
    
    return test_cases


if __name__ == "__main__":
    # Quick test of data generation
    X, y = generate_training_data(100)
    print(f"\nSample data shape: X={X.shape}, y={y.shape}")
    print(f"Sample features (first row): {X[0]}")
    print(f"Sample target (first): {y[0]:.2f}")
