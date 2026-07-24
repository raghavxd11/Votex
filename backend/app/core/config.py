import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Votex AI Mental Health API"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/v1"
    
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    DATABASE_URL: str = "sqlite:///./mental_health_platform.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # ML Hyperparameters embedded into env execution
    MODEL_PATH: str = "/ml_pipeline/cross_attn_enterprise_model.pth"
    MAX_TEXT_LEN: int = 128
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    
    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")

settings = Settings()
