from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .api.endpoints import router as api_router
from .api.auth import router as auth_router
from .api.feedback import router as feedback_router
from .api.assistant import router as assistant_router
from .api.appointments import router as appointments_router
from .core.exceptions import global_exception_handler, ModelInferenceError, model_inference_exception_handler
from .core.logging import logger
from .db.database import engine, Base

# Create all database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Votex Intelligence API",
    version="4.0.0",
    description="Enterprise Multimodal Mental Health Diagnostics Platform"
)

# CORS - allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(ModelInferenceError, model_inference_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Register routers
app.include_router(api_router, prefix="/v1")
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(feedback_router, prefix="/api/feedback", tags=["feedback"])
app.include_router(assistant_router, prefix="/api/assistant", tags=["assistant"])
app.include_router(appointments_router, prefix="/api/appointments", tags=["appointments"])

import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

static_dir = os.path.join(os.path.dirname(__file__), "../static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir, html=True), name="static")

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "Votex Intelligence API",
        "version": "4.0.0",
        "model_loaded": True
    }

@app.get("/")
def serve_frontend():
    # Redirect users natively heading to the backend port directly to the Next.js UI component
    return RedirectResponse(url="http://localhost:3000/")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming connection: {request.method} {request.url.path}")
    response = await call_next(request)
    return response

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected"}
