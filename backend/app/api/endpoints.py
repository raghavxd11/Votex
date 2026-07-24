from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from ..schemas.schemas import AnalysisResponse
from ..services.ml_inference import analyze_multimodal_request
from ..db.database import get_db
from ..db.models import DiagnosticRecord, User
from .auth import get_current_user
from ..core.logging import logger
from typing import List

router = APIRouter()

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_endpoint(
    text: str = Form(""),
    document: UploadFile = File(None),
    audio: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        if not text and not document and not audio:
            raise HTTPException(status_code=400, detail="Must provide at least text/document or audio.")
            
        if audio and not any(audio.filename.endswith(ext) for ext in ['.wav', '.webm', '.m4a', '.mp3', '.ogg']):
            raise HTTPException(status_code=400, detail="Supported audio formats: .wav, .webm, .m4a, .mp3, .ogg")
        
        logger.info(f"Initiating Multimodal Inference for user [{current_user.id}] | Payload size: {len(text)} chars.")
        response = await analyze_multimodal_request(text, document, audio, current_user.id, db)
        return response
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        logger.error(f"Inference Route crashed unexpectedly:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal Platform Error.")

@router.get("/history")
def get_user_history_self(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        records = db.query(DiagnosticRecord).filter(DiagnosticRecord.user_id == current_user.id).order_by(DiagnosticRecord.created_at.desc()).all()
        records = [r for r in records if (r.patient_text_payload or '').strip()]
        return [
            {
                "id": r.id,
                "text": r.patient_text_payload,
                "probability": r.distress_probability,
                "status": r.status_classification,
                "timestamp": r.created_at.strftime("%Y-%m-%d %H:%M:%S")
            } for r in records
        ]
    except Exception as e:
        logger.error(f"Failed to fetch history for User [{current_user.id}]: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve patient history.")

@router.get("/history/{user_id}")
def get_user_history(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.id != user_id and current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Not authorized to view this patient's history.")
    
    try:
        records = db.query(DiagnosticRecord).filter(DiagnosticRecord.user_id == user_id).order_by(DiagnosticRecord.created_at.desc()).all()
        records = [r for r in records if (r.patient_text_payload or '').strip()]
        return [
            {
                "id": r.id,
                "text": r.patient_text_payload,
                "probability": r.distress_probability,
                "status": r.status_classification,
                "timestamp": r.created_at.strftime("%Y-%m-%d %H:%M:%S")
            } for r in records
        ]
    except Exception as e:
        logger.error(f"Failed to fetch history for User [{user_id}]: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not retrieve patient history.")
