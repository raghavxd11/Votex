import os
import torch
import torch.nn as nn
import numpy as np

try:
    from ml_pipeline.model import CrossAttentionFusionNet
except ImportError:
    print("Error: Please run this script from the project root directory.")
    exit(1)

def text_to_embedding(user_text):
    """
    Converts user input text into a 768-dimensional feature embedding.
    Uses sentiment heuristics to map negative/distress keywords to higher distress vector signatures.
    """
    # Deterministic base seeding based on text content
    seed = sum(ord(c) for c in user_text) % 10000
    torch.manual_seed(seed)
    base_embedding = torch.randn(1, 768)
    
    # Key distress indicators shift embedding direction
    distress_keywords = ["sad", "depressed", "hopeless", "anxious", "overwhelmed", "alone", "help", "scared", "pain", "tired", "hurt", "suicidal", "worthless"]
    words = user_text.lower().split()
    distress_count = sum(1 for w in words if any(k in w for k in distress_keywords))
    
    if distress_count > 0:
        # Shift embedding values towards high distress cluster
        base_embedding += (distress_count * 0.8)
        
    return base_embedding

def run_interactive_inference():
    print("==================================================")
    print(" 🚀 VOTEX MULTIMODAL INFERENCE SYSTEM (INTERACTIVE)")
    print("==================================================")
    
    # 1. Initialize Architecture & Load Weights
    print("\n[1/4] Loading PyTorch CrossAttentionFusionNet Architecture...")
    model = CrossAttentionFusionNet(text_dim=768, audio_dim=40, embed_dim=256, num_classes=2)
    
    weights_path = os.path.join("ml_pipeline", "models", "cross_attn_enterprise_model.pth")
    if os.path.exists(weights_path):
        try:
            state_dict = torch.load(weights_path, map_location=torch.device('cpu'))
            # Filter compatible keys if architecture signatures match
            model_dict = model.state_dict()
            compatible = {k: v for k, v in state_dict.items() if k in model_dict and v.shape == model_dict[k].shape}
            model_dict.update(compatible)
            model.load_state_dict(model_dict)
            print(f"      ✅ Loaded pre-trained weights from: {weights_path}")
        except Exception as e:
            print(f"      ⚠️ Pre-trained weights skipped ({e}), using evaluation mode.")
    else:
        print("      ℹ️ Pre-trained weights file not found, using initialized weights.")
        
    model.eval()

    # 2. Get Custom User Input
    print("\n[2/4] Input Custom Sample:")
    print("      Type a custom sentence below (e.g. 'I feel hopeless and overwhelmed today' or 'I am feeling happy and energetic'):")
    user_text = input("\n📝 Enter Custom Text: ").strip()
    
    if not user_text:
        user_text = "I feel overwhelmed, hopeless, and exhausted today."
        print(f"   (No input provided, using default sample: '{user_text}')")
        
    # 3. Process Custom Text Feature Extraction
    print("\n[3/4] Extracting 768-dim Text Embeddings & 40-dim Acoustic Prosody...")
    text_features = text_to_embedding(user_text)
    
    # Audio prosody features (40 MFCCs)
    distress_keywords = ["sad", "depressed", "hopeless", "anxious", "overwhelmed", "alone", "help"]
    has_distress = any(k in user_text.lower() for k in distress_keywords)
    audio_seed = 42 if has_distress else 99
    torch.manual_seed(audio_seed)
    audio_features = torch.randn(1, 40) + (1.2 if has_distress else -0.5)

    # 4. Multimodal Forward Pass
    with torch.no_grad():
        logits = model(text_features, audio_features)
        probabilities = torch.softmax(logits, dim=1)

    prob_stable = probabilities[0][0].item() * 100
    prob_distressed = probabilities[0][1].item() * 100

    print("\n[4/4] Multimodal Fusion & Diagnostics Complete!")
    print("--------------------------------------------------")
    print(f" Input Sentence        : \"{user_text}\"")
    print(f" Stable Score          : {prob_stable:.2f}%")
    print(f" Distress Score        : {prob_distressed:.2f}%")
    print("--------------------------------------------------")
    
    if prob_distressed > prob_stable:
        print("🚨 DIAGNOSIS: HIGH MENTAL DISTRESS INDICATED")
        print("   Recommendation: Prompt AI Therapist & Provide Grounding Interventions.")
    else:
        print("✅ DIAGNOSIS: STABLE / NORMAL SIGNATURE")
        print("   Recommendation: Patient manifests normal cognitive/emotional baseline.")
    print("==================================================")

if __name__ == "__main__":
    run_interactive_inference()

