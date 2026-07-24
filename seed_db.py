"""
Votex Intelligence - Database Seeder Script
-------------------------------------------
Populates mental_health_platform_v4.db with initial sample data:
- Demo Patient account: patient@votex.ai (Password: password123)
- Demo Clinician account: doctor@votex.ai (Password: password123)
- Initial Diagnostic Records & Clinical Appointments
"""

import sys
import os

# Force UTF-8 encoding for Windows console compatibility
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import hashlib
import datetime

from backend.app.db.database import SessionLocal, engine, Base
from backend.app.db.models import User, Doctor, DiagnosticRecord, Appointment

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def seed_database():
    print("==================================================")
    print(" 🪴 VOTEX DATABASE SEEDER PIPELINE")
    print("==================================================")
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Create Patient User if not exists
        patient = db.query(User).filter(User.email == "patient@votex.ai").first()
        if not patient:
            patient = User(
                id="usr_demo_patient_01",
                email="patient@votex.ai",
                hashed_password=hash_password("password123"),
                role="patient",
                full_name="Alex Mercer"
            )
            db.add(patient)
            print("  ✅ Created Demo Patient: patient@votex.ai")
        else:
            print("  ℹ️ Demo Patient already exists.")
            
        # 2. Create Doctor User if not exists
        doctor_user = db.query(User).filter(User.email == "doctor@votex.ai").first()
        if not doctor_user:
            doctor_user = User(
                id="usr_demo_doctor_01",
                email="doctor@votex.ai",
                hashed_password=hash_password("password123"),
                role="doctor",
                full_name="Dr. Sarah Jenkins, MD"
            )
            db.add(doctor_user)
            db.commit()
            
            doctor_profile = Doctor(
                id="doc_demo_01",
                user_id=doctor_user.id,
                specialty="Neuro-Psychiatry & Cognitive Health",
                availability="Mon-Fri, 9:00 AM - 4:00 PM"
            )
            db.add(doctor_profile)
            print("  ✅ Created Demo Clinician: doctor@votex.ai")
        else:
            print("  ℹ️ Demo Clinician already exists.")

        db.commit()
        
        # 3. Create Initial Diagnostic Records
        existing_records = db.query(DiagnosticRecord).count()
        if existing_records == 0:
            rec1 = DiagnosticRecord(
                id="rec_001",
                user_id=patient.id,
                patient_text_payload="I feel somewhat hopeless and overwhelmed today.",
                document_context=None,
                audio_filename="sample_audio_01.wav",
                distress_probability=51.7,
                status_classification="Mild Distress",
                created_at=datetime.datetime.now() - datetime.timedelta(days=2)
            )
            rec2 = DiagnosticRecord(
                id="rec_002",
                user_id=patient.id,
                patient_text_payload="Everything is going well and I am feeling happy.",
                document_context=None,
                audio_filename="sample_audio_02.wav",
                distress_probability=18.4,
                status_classification="Stable Baseline",
                created_at=datetime.datetime.now() - datetime.timedelta(days=1)
            )
            db.add(rec1)
            db.add(rec2)
            print("  ✅ Seeded 2 Sample Diagnostic Assessment Records.")
            
        db.commit()
        print("-" * 50)
        print("🎉 Database Seeding Complete! Ready for Testing.")
        print("==================================================")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
