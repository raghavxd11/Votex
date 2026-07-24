from pydantic import BaseModel
from typing import Optional

class AnalysisRequest(BaseModel):
    text: str

class AnalysisResponse(BaseModel):
    status: str
    distress_probability: float
    confidence_score: float
    risk_tier: Optional[str] = None
    text_sentiment_score: Optional[float] = None
    shap_text_weight: Optional[float] = None
    shap_audio_weight: Optional[float] = None
    xai_explanation: Optional[str] = None
    recommendation_title: Optional[str] = None
    recommendation_body: Optional[str] = None
    raw_logit: Optional[float] = None
    base_probability: Optional[float] = None
    image_url: Optional[str] = None
    energy_variance: Optional[float] = 0.0
    pitch_variability: Optional[float] = 0.0
    spectral_flux: Optional[float] = 0.0
    silence_ratio: Optional[float] = 0.0
    pitch_mean_hz: Optional[float] = 0.0
    sadness: Optional[float] = 0.0
    joy: Optional[float] = 0.0
    love: Optional[float] = 0.0
    anger: Optional[float] = 0.0
    fear: Optional[float] = 0.0
    surprise: Optional[float] = 0.0
    neutral: Optional[float] = 0.0
    disgust: Optional[float] = 0.0
