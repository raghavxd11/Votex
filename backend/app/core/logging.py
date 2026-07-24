import logging
import sys

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | [%(name)s] - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("platform_metrics.log")
        ]
    )
    # Target noisy libraries
    logging.getLogger("multipart").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    
setup_logging()
logger = logging.getLogger("enterprise_telemetry")
