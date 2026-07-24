from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from ..db.database import get_db
from ..db.models import User, Doctor, Appointment, DiagnosticRecord
from .auth import get_current_user

router = APIRouter()

class DoctorSchema(BaseModel):
    id: str
    user_id: str
    full_name: str
    specialty: str
    availability: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)

class AppointmentCreate(BaseModel):
    doctor_id: str
    date: datetime
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    date: datetime
    status: str
    notes: Optional[str]
    doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

@router.get("/doctors", response_model=List[DoctorSchema])
def list_doctors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doctors = db.query(Doctor).all()
    res = []
    for d in doctors:
        d_user = db.query(User).filter(User.id == d.user_id).first()
        res.append({
            "id": d.id,
            "user_id": d.user_id,
            "full_name": d_user.full_name if d_user else "Unknown",
            "specialty": d.specialty,
            "availability": d.availability
        })
    return res

@router.post("/book", response_model=AppointmentResponse)
def book_appointment(req: AppointmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can book appointments directly.")
    
    # AI Logic check - optional, but useful context
    latest_record = db.query(DiagnosticRecord).filter(DiagnosticRecord.user_id == current_user.id).order_by(DiagnosticRecord.created_at.desc()).first()
    context_notes = req.notes or ""
    if latest_record and latest_record.distress_probability > 60:
         context_notes += f" [AI Priority: High Distress Detected ({latest_record.distress_probability}%)]"
         
    appointment = Appointment(
        patient_id=current_user.id,
        doctor_id=req.doctor_id,
        date=req.date,
        notes=context_notes,
        status="scheduled"
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment

@router.get("/mine", response_model=List[AppointmentResponse])
def get_my_appointments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = []
    if current_user.role == "patient":
        appts = db.query(Appointment).filter(Appointment.patient_id == current_user.id).order_by(Appointment.date.desc()).all()
    else:
        # Doctor viewing their own appointments
        doc = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doc:
            return []
        appts = db.query(Appointment).filter(Appointment.doctor_id == doc.id).order_by(Appointment.date.desc()).all()

    for a in appts:
        d_doc = db.query(Doctor).filter(Doctor.id == a.doctor_id).first()
        d_user = db.query(User).filter(User.id == d_doc.user_id).first() if d_doc else None
        p_user = db.query(User).filter(User.id == a.patient_id).first()
        
        res.append({
            "id": a.id,
            "patient_id": a.patient_id,
            "doctor_id": a.doctor_id,
            "date": a.date,
            "status": a.status,
            "notes": a.notes,
            "doctor_name": d_user.full_name if d_user else "Unknown Doctor",
            "patient_name": p_user.full_name if p_user else "Unknown Patient"
        })
        
    return res
