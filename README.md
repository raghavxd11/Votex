# Votex 🚀
*Multimodal Mental Health Distress Detection System*

[![Python](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=flat&logo=next.js)](https://nextjs.org/)
[![PyTorch](https://img.shields.io/badge/ML-PyTorch-EE4C2C?style=flat&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 Overview
Votex is a multimodal deep learning framework designed to detect mental health distress signatures from speech and text. By combining **Librosa-extracted audio features (MFCCs)** with **BERT text embeddings**, the system classifies input into *Stable* or *Distressed* categories using a PyTorch cross-attention fusion network (`CrossAttentionFusionNet`).

The platform includes a FastAPI backend, a Next.js 14 web interface, and explainable AI (XAI) feature attribution analysis.

---

## ✨ Key Features
- **🧠 Multimodal Fusion Engine**: Synergizes 40-dimensional MFCC acoustic features with 768-dimensional BERT text embeddings using PyTorch Multi-Head Cross-Attention.
- **🎙️ Speech & Text Diagnostics**: Real-time microphone audio processing combined with transcript text classification.
- **🤖 AI Support Assistant**: Interactive conversational interface that provides grounding recommendations based on distress predictions.
- **📊 Patient & Clinician Dashboard**: Web UI for monitoring assessment history, distress probability trends, and modality attributions.
- **🧘 Guided Breathing Module**: Relaxation interface with guided visual breathing exercises.
- **🛡️ Explainable AI (XAI)**: Gradient-based modality attribution to calculate the relative contribution of text vs. speech features.
- **💾 Database Storage**: SQLite database powered by SQLAlchemy to save assessment records and clinician notes.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14, TypeScript, TailwindCSS, Framer Motion |
| **Backend** | FastAPI, Python 3.10+, SQLAlchemy, Pydantic |
| **AI/ML** | PyTorch, HuggingFace Transformers (BERT), Librosa, Scikit-learn |
| **Database** | SQLite |
| **DevOps** | Docker, Docker Compose, Batch Script |

---

## 🚀 Getting Started & Guided Instructions

### Prerequisites
- **Python 3.10+**
- **Node.js 20+**
- **FFmpeg** (required for audio processing)

---

### Option 1: Quick Standalone ML Test (Terminal Only)
To test the PyTorch model logic directly from the terminal without starting web servers:
```bash
python inference_demo.py
```

---

### Option 2: Full Stack Launch (Windows - One Click)
To start both the FastAPI backend and Next.js frontend automatically:
1. Open terminal in the project root folder.
2. Run the startup script:
   ```bash
   start_nexus.bat
   ```
3. Open your browser and go to: `http://localhost:3000`

---

### Option 3: Manual Step-by-Step Setup

#### Step 1: Start Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend API docs will be available at: `http://localhost:8000/docs`*

#### Step 2: Start Frontend (Next.js)
Open a second terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Frontend interface will be available at: `http://localhost:3000`*

---

## 📂 Project Structure
```text
.
├── backend/            # FastAPI REST API, database schemas, & inference services
├── frontend/           # Next.js 14 Web Dashboard & UI components
├── ml_pipeline/        # PyTorch model architecture, feature extraction & training scripts
├── docs/               # Architecture & feature documentation
├── inference_demo.py   # Standalone terminal demo script
├── start_nexus.bat     # Windows 1-click startup launcher
└── docker-compose.yml  # Docker container configuration
```

---

## 🩺 Multimodal Model Architecture
The system executes a three-step fusion process:
1. **Acoustic Path**: Extracts 40 Mel-Frequency Cepstral Coefficients (MFCCs) using Librosa and normalizes them using `StandardScaler`.
2. **Semantic Path**: Extracts 768-dimensional `[CLS]` token embeddings using pre-trained `bert-base-uncased`.
3. **Cross-Attention Fusion Layer**: Projects both vectors to a shared 256-dimensional space and applies Multi-Head Attention where text acts as Query and audio acts as Key-Value pairs, followed by a 3-layer MLP classifier.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.s.

---
*Built with ❤️ by the Votex Engineering Team as a milestone in Multimodal Clinical AI.*
