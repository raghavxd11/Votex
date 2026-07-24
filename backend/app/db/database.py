from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
import os

# Uses SQLite for local testing, gracefully upgrades to handle user_id relationships
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mental_health_platform_v4.db")

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
