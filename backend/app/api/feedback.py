from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.database import get_db
from ..db.models import Feedback, User
from .auth import get_current_user
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

router = APIRouter()

class FeedbackCreate(BaseModel):
    rating: int
    comments: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: str
    rating: int
    comments: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

@router.post("/", response_model=FeedbackResponse)
def submit_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if feedback.rating < 1 or feedback.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
    new_feedback = Feedback(
        user_id=current_user.id,
        rating=feedback.rating,
        comments=feedback.comments
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    return new_feedback

@router.get("/", response_model=List[FeedbackResponse])
def get_user_feedbacks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    feedbacks = db.query(Feedback).filter(Feedback.user_id == current_user.id).order_by(Feedback.created_at.desc()).all()
    return feedbacks
