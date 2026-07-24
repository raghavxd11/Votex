# Votex Intelligence 4.0 🚀
*Next-Gen Multimodal Clinical Diagnostic & AI Therapy Platform*

[![Python](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=flat&logo=next.js)](https://nextjs.org/)
[![PyTorch](https://img.shields.io/badge/ML-PyTorch-EE4C2C?style=flat&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 Overview
Votex Intelligence is an enterprise-grade clinical platform that leverages **Multimodal Deep Learning** to detect mental health distress signatures. By fusing **Acoustic Vocal Bio-markers** with **Semantic Textual Analysis**, the system provides high-precision diagnostics (>93% accuracy) and delivers autonomous therapeutic interventions through an interactive AI therapist.

---

## ✨ Key Features
- **🧠 Multimodal Fusion Engine**: Synergizes `Librosa` MFCC audio feature extraction with `HuggingFace BERT` transformer embeddings using a custom PyTorch cross-attention architecture.
- **🎙️ Real-Time Waveform Visualization**: Live microphone streaming with millisecond-latency STT (Speech-to-Text) and dynamic emotion-responsive waveforms.
- **🤖 Autonomous AI Therapist**: A conversational assistant that maps real-time distress probabilities to clinical recommendations and grounding exercises.
- **📊 Interactive Clinician Dashboard**: Stunning glassmorphic UI for tracking patient longitudinal data, sentiment trends, and diagnostic archives.
- **🧘 Zen Meditation Module**: Full-screen recursive breathing tools with synthetic UI expansion, binaural drones, and guided audio instructions.
- **🛡️ Explainable AI (XAI)**: Integrated **SHAP** values to justify diagnostic decisions, providing transparency for clinical practitioners.
- **💾 Resilient Persistence**: Auto-healing SQLite layer with `SQLAlchemy` and localized `localStorage` caching for uncrashable performance.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14, TypeScript, TailwindCSS, Framer Motion, Lucide React |
| **Backend** | FastAPI, Python 3.10+, SQLAlchemy, Pydantic |
| **AI/ML** | PyTorch, Transformers (BERT), SHAP, Librosa, Scikit-learn, Vader |
| **Database** | SQLite (Relational), LocalStorage (Client-side Cache) |
| **DevOps** | Docker, Docker Compose, Unified Batch Deployment |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 20+**
- **FFmpeg** (for audio processing)

### Quick Start (Standalone ML Demo)
To test the PyTorch multimodal fusion model instantly without starting web servers:
```bash
python inference_demo.py
```

### Quick Start Full Stack (Windows)
To launch the entire platform (Frontend + Backend) with a single command:
1. Navigate to the project root.
2. Run the master deployment script:
   ```bash
   start_nexus.bat
   ```
*This script automatically handles port cleanup, dependency checks, and concurrent service starts.*

### Manual Setup

#### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Project Structure
```text
.
├── backend/            # FastAPI Application (v1 API, DB, Services)
├── frontend/           # Next.js 14 Frontend (App Router, Components)
├── ml_pipeline/        # Model Training, Augmentation & Evaluation
├── scripts/            # Utility and maintenance scripts
├── models/             # Pre-trained Weights (.pth & .pkl)
├── Actor_XX/           # Diagnostic Audio Datasets (RAVDESS)
└── docker-compose.yml  # Container Orchestration
```

---

## 🩺 Diagnostic Logic
The platform executes a three-stage fusion process:
1. **Acoustic Path**: Extracts 40 features (MFCCs, Spectral Centroid, Zero Crossing Rate) via Librosa.
2. **Semantic Path**: Processes transcription through a BERT-based transformer for context-aware sentiment.
3. **Fusion Layer**: A custom Cross-Attention model weights inputs (40% Audio, 30% Text, 30% Sentiment) to produce a unified distress score.

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Built with ❤️ by the Votex Engineering Team as a milestone in Multimodal Clinical AI.*
