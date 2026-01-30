"""
Telemedicine Queue Optimization - AI Engine
============================================
This module contains the FastAPI application that serves the ML model
for patient priority scoring in telemedicine queue optimization.

Author: Telemedicine SaaS Team
Version: 1.0.0
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import uvicorn

# Import our ML model and training utilities
from model.predictor import PriorityPredictor
from model.trainer import train_model, generate_training_data

# Initialize FastAPI application
app = FastAPI(
    title="Telemedicine AI Engine",
    description="ML-powered patient priority scoring for queue optimization",
    version="1.0.0"
)

# Configure CORS to allow requests from frontend and backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend
        "http://localhost:5000",  # Backend
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the ML predictor (singleton pattern)
predictor: Optional[PriorityPredictor] = None


# ============================================
# Pydantic Models for Request/Response
# ============================================

class PatientData(BaseModel):
    """
    Input schema for patient priority prediction.
    All fields are validated for appropriate ranges.
    """
    age: int = Field(..., ge=0, le=120, description="Patient age in years")
    severity: int = Field(..., ge=1, le=10, description="Symptom severity score (1-10)")
    rural: int = Field(..., ge=0, le=1, description="Rural location flag (0=urban, 1=rural)")
    chronic: int = Field(..., ge=0, le=1, description="Chronic illness flag (0=no, 1=yes)")
    waiting_time: float = Field(..., ge=0, description="Current waiting time in minutes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "age": 65,
                "severity": 8,
                "rural": 1,
                "chronic": 1,
                "waiting_time": 30
            }
        }


class PredictionResponse(BaseModel):
    """
    Output schema for priority prediction.
    Includes the score and human-readable explanation.
    """
    priority_score: int = Field(..., description="Priority score (0-100)")
    reason: str = Field(..., description="Human-readable explanation for the score")
    
    class Config:
        json_schema_extra = {
            "example": {
                "priority_score": 87,
                "reason": "High severity, rural location, chronic illness"
            }
        }


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str
    model_loaded: bool
    version: str


# ============================================
# Application Lifecycle Events
# ============================================

@app.on_event("startup")
async def startup_event():
    """
    Application startup handler.
    Loads or trains the ML model on startup.
    """
    global predictor
    
    print("🚀 Starting Telemedicine AI Engine...")
    
    # Initialize predictor
    predictor = PriorityPredictor()
    
    # Try to load existing model
    model_path = os.path.join(os.path.dirname(__file__), "model", "trained_model.joblib")
    
    if os.path.exists(model_path):
        print("📦 Loading existing model...")
        predictor.load_model(model_path)
    else:
        print("🔧 No existing model found. Training new model...")
        # Generate synthetic training data
        X_train, y_train = generate_training_data(n_samples=5000)
        # Train the model
        train_model(predictor, X_train, y_train, model_path)
    
    print("✅ AI Engine ready!")


# ============================================
# API Endpoints
# ============================================

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    Returns the status of the AI engine and model.
    """
    return HealthResponse(
        status="healthy",
        model_loaded=predictor is not None and predictor.is_loaded,
        version="1.0.0"
    )


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict_priority(patient: PatientData):
    """
    Predict patient priority score.
    
    Takes patient data and returns a priority score (0-100) with explanation.
    Higher scores indicate higher priority for telemedicine consultation.
    
    **Priority Factors:**
    - Age: Elderly patients (65+) receive higher priority
    - Severity: Higher severity scores increase priority
    - Rural: Rural patients receive fairness uplift (+10 points)
    - Chronic: Chronic illness patients receive higher priority
    - Waiting Time: Longer waits increase priority slightly
    """
    if predictor is None or not predictor.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="ML model not loaded. Please try again later."
        )
    
    try:
        # Get prediction from model
        result = predictor.predict(
            age=patient.age,
            severity=patient.severity,
            rural=patient.rural,
            chronic=patient.chronic,
            waiting_time=patient.waiting_time
        )
        
        return PredictionResponse(
            priority_score=result["priority_score"],
            reason=result["reason"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@app.post("/retrain", tags=["Admin"])
async def retrain_model():
    """
    Retrain the ML model with fresh synthetic data.
    In production, this would use real historical data.
    """
    global predictor
    
    try:
        print("🔄 Retraining model...")
        predictor = PriorityPredictor()
        X_train, y_train = generate_training_data(n_samples=5000)
        model_path = os.path.join(os.path.dirname(__file__), "model", "trained_model.joblib")
        train_model(predictor, X_train, y_train, model_path)
        
        return {"status": "success", "message": "Model retrained successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Retraining failed: {str(e)}"
        )


# ============================================
# Main Entry Point
# ============================================

if __name__ == "__main__":
    # Run the FastAPI server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable hot reload for development
        log_level="info"
    )
