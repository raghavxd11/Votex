import torch
import numpy as np

# A simplified mock script demonstrating how the model is used during inference.
# In a real environment, you would use Librosa to extract MFCCs and HuggingFace to get BERT tokens.

try:
    from ml_pipeline.model import CrossAttentionFusionNet
    import pickle
except ImportError:
    print("Error: Please run this script from the project root directory where 'ml_pipeline' exists.")
    exit(1)

def run_mock_inference():
    print("🚀 Votex Intelligence - Mock Inference Demo")
    print("-" * 50)
    
    # 1. Initialize the Model Structure
    print("[1/4] Initializing CrossAttentionFusionNet architecture...")
    model = CrossAttentionFusionNet(text_dim=768, audio_dim=40, embed_dim=256, num_classes=2)
    model.eval()
    
    # Normally, you would load the pre-trained weights here:
    # model.load_state_dict(torch.load('ml_pipeline/models/cross_attn_enterprise_model.pth', map_location='cpu'))
    print("      (Skipping heavy weight loading for quick demonstration)")

    # 2. Simulate Feature Extraction
    print("[2/4] Simulating Feature Extraction...")
    # Simulate an extracted 768-dim BERT [CLS] token for a distressed sentence ("I feel hopeless.")
    mock_text_features = torch.randn(1, 768) 
    # Simulate extracted 40-dim MFCCs from a corresponding 3-second audio clip
    mock_audio_features = torch.randn(1, 40)
    
    print("      - Text features extracted: shape (1, 768)")
    print("      - Audio features extracted: shape (1, 40)")

    # 3. Model Inference (Forward Pass)
    print("[3/4] Running Multimodal Cross-Attention Fusion...")
    with torch.no_grad():
        logits = model(mock_text_features, mock_audio_features)
        probabilities = torch.softmax(logits, dim=1)
    
    # 4. Results
    print("[4/4] Generating Diagnosis...")
    prob_stable = probabilities[0][0].item() * 100
    prob_distressed = probabilities[0][1].item() * 100
    
    print("-" * 50)
    print("🩺 Votex Diagnostic Report:")
    print(f"   Stable Probability     : {prob_stable:.2f}%")
    print(f"   Distressed Probability : {prob_distressed:.2f}%")
    print("-" * 50)
    
    if prob_distressed > prob_stable:
        print("🚨 Result: HIGH DISTRESS INDICATED. Recommend clinical intervention.")
    else:
        print("✅ Result: STABLE. No acute distress signatures detected.")

if __name__ == "__main__":
    run_mock_inference()
