import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "database": "connected"}

def test_analyze_rejection_no_files():
    # Should 422 if payload is entirely blank without multi-form data
    response = client.post("/v1/analyze")
    assert response.status_code == 422

# Additional deep learning endpoint tests are orchestrated via Docker compose during CI
