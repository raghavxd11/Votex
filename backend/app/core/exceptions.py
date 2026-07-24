from fastapi import Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class ModelInferenceError(Exception):
    def __init__(self, detail: str):
        self.detail = detail

async def model_inference_exception_handler(request: Request, exc: ModelInferenceError):
    logger.error(f"Inference failure during multimodal tracking: {exc.detail}")
    return JSONResponse(
        status_code=503,
        content={"message": "The Deep Learning engine is currently overloaded or encountered an anomaly.", "details": exc.detail},
    )

async def global_exception_handler(request: Request, exc: Exception):
    logger.critical(f"Unhandled critical exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected enterprise platform failure occurred. Our engineers have been alerted."}
    )
