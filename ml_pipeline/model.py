import torch
import torch.nn as nn

class CrossAttentionFusionNet(nn.Module):
    """
    Multimodal Fusion Network employing Cross-Attention to synergize Text and Audio modalities.
    
    This architecture projects BERT-derived semantic text embeddings and Librosa-derived 
    MFCC audio features into a shared latent space. It utilizes a Multi-Head Attention mechanism 
    where the text modality acts as the Query to attend over the audio Key-Value pairs, 
    producing a contextually-weighted multimodal representation for distress classification.
    """
    def __init__(self, text_dim=768, audio_dim=40, embed_dim=256, num_classes=2, dropout_rate=0.4):
        """
        Initializes the CrossAttentionFusionNet.

        Args:
            text_dim (int): Dimensionality of the input text features (default: 768 for BERT [CLS] token).
            audio_dim (int): Dimensionality of the input audio features (default: 40 for MFCCs).
            embed_dim (int): Dimensionality of the shared projection space (default: 256).
            num_classes (int): Number of output classification labels (default: 2 for Stable vs Distressed).
            dropout_rate (float): Dropout probability for the final classifier (default: 0.4).
        """
        super(CrossAttentionFusionNet, self).__init__()
        self.text_proj = nn.Sequential(
            nn.Linear(text_dim, embed_dim),
            nn.LayerNorm(embed_dim),
            nn.ReLU(),
            nn.Dropout(0.2)
        )
        self.audio_proj = nn.Sequential(
            nn.Linear(audio_dim, embed_dim),
            nn.LayerNorm(embed_dim),
            nn.ReLU(),
            nn.Dropout(0.2)
        )
        self.cross_attn = nn.MultiheadAttention(embed_dim=embed_dim, num_heads=4, batch_first=True)
        self.classifier = nn.Sequential(
            nn.Linear(embed_dim * 2, 128),
            nn.LayerNorm(128),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, num_classes)
        )

    def forward(self, text_features, audio_features):
        """
        Forward pass of the fusion network.

        Args:
            text_features (torch.Tensor): Tensor of shape (batch_size, text_dim) containing semantic embeddings.
            audio_features (torch.Tensor): Tensor of shape (batch_size, audio_dim) containing acoustic features.

        Returns:
            torch.Tensor: Logits of shape (batch_size, num_classes) representing the classification predictions.
        """
        T_proj = self.text_proj(text_features).unsqueeze(1)
        A_proj = self.audio_proj(audio_features).unsqueeze(1)
        attn_out, _ = self.cross_attn(query=T_proj, key=A_proj, value=A_proj)
        attn_out = attn_out.squeeze(1)
        A_proj = A_proj.squeeze(1)
        fused_vector = torch.cat((attn_out, A_proj), dim=1)
        return self.classifier(fused_vector)
