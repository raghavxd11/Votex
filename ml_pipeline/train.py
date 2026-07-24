"""
Votex Intelligence - Model Retraining & Optimization Pipeline
--------------------------------------------------------------
Trains the CrossAttentionFusionNet multimodal architecture (BERT text + Librosa MFCC audio)
using PyTorch with AdamW optimizer, Cosine Annealing learning rate schedule, and CrossEntropyLoss.
"""

import os
import sys
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np

# Force UTF-8 encoding for Windows console compatibility
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from ml_pipeline.model import CrossAttentionFusionNet

def train_votex_model():
    print("==================================================")
    print(" 🏋️ VOTEX MULTIMODAL MODEL RETRAINING PIPELINE")
    print("==================================================")
    
    # 1. Hyperparameters
    TEXT_DIM = 768
    AUDIO_DIM = 40
    EMBED_DIM = 256
    NUM_CLASSES = 2
    BATCH_SIZE = 32
    EPOCHS = 15
    LR = 1e-3
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[1/5] Training Device: {device}")
    
    # 2. Generate Synthetic Multimodal Training Dataset (1,200 Samples)
    print("[2/5] Synthesizing Multimodal Feature Tensors (1,200 samples)...")
    torch.manual_seed(42)
    np.random.seed(42)
    
    # 600 Stable Samples (Label 0)
    text_stable = torch.randn(600, TEXT_DIM) - 0.5
    audio_stable = torch.randn(600, AUDIO_DIM) - 0.4
    labels_stable = torch.zeros(600, dtype=torch.long)
    
    # 600 Distressed Samples (Label 1)
    text_distressed = torch.randn(600, TEXT_DIM) + 0.6
    audio_distressed = torch.randn(600, AUDIO_DIM) + 0.5
    labels_distressed = torch.ones(600, dtype=torch.long)
    
    X_text = torch.cat([text_stable, text_distressed], dim=0)
    X_audio = torch.cat([audio_stable, audio_distressed], dim=0)
    y = torch.cat([labels_stable, labels_distressed], dim=0)
    
    # Shuffle dataset
    indices = torch.randperm(1200)
    X_text, X_audio, y = X_text[indices], X_audio[indices], y[indices]
    
    # Train / Test split (80 / 20)
    split_idx = int(0.8 * 1200)
    train_dataset = TensorDataset(X_text[:split_idx], X_audio[:split_idx], y[:split_idx])
    test_dataset = TensorDataset(X_text[split_idx:], X_audio[split_idx:], y[split_idx:])
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    # 3. Model Setup
    print("[3/5] Initializing CrossAttentionFusionNet Architecture...")
    model = CrossAttentionFusionNet(
        text_dim=TEXT_DIM, 
        audio_dim=AUDIO_DIM, 
        embed_dim=EMBED_DIM, 
        num_classes=NUM_CLASSES
    ).to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)
    
    # 4. Training Loop
    print("\n[4/5] Starting Optimization Loop across 15 Epochs:")
    print("-" * 50)
    
    best_acc = 0.0
    models_dir = os.path.join("ml_pipeline", "models")
    os.makedirs(models_dir, exist_ok=True)
    save_path = os.path.join(models_dir, "cross_attn_enterprise_model.pth")
    
    for epoch in range(1, EPOCHS + 1):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        for batch_text, batch_audio, batch_y in train_loader:
            batch_text, batch_audio, batch_y = batch_text.to(device), batch_audio.to(device), batch_y.to(device)
            
            optimizer.zero_grad()
            logits = model(batch_text, batch_audio)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * batch_text.size(0)
            preds = torch.argmax(logits, dim=1)
            correct += (preds == batch_y).sum().item()
            total += batch_y.size(0)
            
        scheduler.step()
        epoch_loss = running_loss / total
        epoch_acc = (correct / total) * 100.0
        
        # Test Set Evaluation
        model.eval()
        test_correct = 0
        test_total = 0
        with torch.no_grad():
            for t_text, t_audio, t_y in test_loader:
                t_text, t_audio, t_y = t_text.to(device), t_audio.to(device), t_y.to(device)
                t_logits = model(t_text, t_audio)
                t_preds = torch.argmax(t_logits, dim=1)
                test_correct += (t_preds == t_y).sum().item()
                test_total += t_y.size(0)
                
        test_acc = (test_correct / test_total) * 100.0
        
        print(f" Epoch {epoch:02d}/{EPOCHS:02d} | Train Loss: {epoch_loss:.4f} | Train Acc: {epoch_acc:.2f}% | Test Acc: {test_acc:.2f}%")
        
        if test_acc >= best_acc:
            best_acc = test_acc
            torch.save(model.state_dict(), save_path)
            
    print("-" * 50)
    print(f"✅ Optimization Finished! Best Test Accuracy: {best_acc:.2f}%")
    print(f"💾 Model weights saved to: {save_path}")
    print("==================================================")

if __name__ == "__main__":
    train_votex_model()
