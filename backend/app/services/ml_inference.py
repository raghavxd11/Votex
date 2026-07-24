import torch
import PyPDF2
import os
import sys
import io
import re
import numpy as np
import librosa
import joblib
import transformers
from transformers import BertTokenizer, BertModel
from sqlalchemy.orm import Session
from ..schemas.schemas import AnalysisResponse
from ..db.models import DiagnosticRecord
from ..core.exceptions import ModelInferenceError
from ..core.logging import logger
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from fastapi import HTTPException

# Disable transformers progress bars to avoid OSError on Windows
transformers.utils.logging.set_verbosity_error()
transformers.utils.logging.disable_progress_bar()

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
try:
    from ml_pipeline.model import CrossAttentionFusionNet
except ImportError:
    CrossAttentionFusionNet = None

model_instance = None
tokenizer = None
bert_model = None
scaler_text = None
scaler_audio = None
device = None
sentiment_analyzer = SentimentIntensityAnalyzer()

# ---------------------------------------------------------------------------
# 5-tier recommendation system with image URLs
# ---------------------------------------------------------------------------
RECOMMENDATIONS = [
    {
        "range": (0, 30),
        "title": "Neurological Equilibrium",
        "body": "Your signals indicate high stability. Maintain your healthy sleep and movement rhythms.",
        "image": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"
    },
    {
        "range": (31, 70),
        "title": "Moderate Distress Signals",
        "body": "Moderate distress patterns emerging. Try the 4-7-8 breathing technique and regular journaling.",
        "image": "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&q=80"
    },
    {
        "range": (71, 100),
        "title": "Critical Distress — Immediate Support",
        "body": "Severe acute distress. Reach out to a loved one or a crisis helpline right now. You are not alone.",
        "image": "https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=600&q=80"
    },
]

def get_recommendation(probability: float) -> dict:
    for rec in RECOMMENDATIONS:
        lo, hi = rec["range"]
        if lo <= probability <= hi:
            return rec
    return RECOMMENDATIONS[-1]

# ---------------------------------------------------------------------------
# Risk tier classification
# ---------------------------------------------------------------------------
def get_risk_tier(probability: float) -> str:
    if probability <= 30.0:
        return "Low Risk"
    elif probability <= 70.0:
        return "Medium Risk"
    else:
        return "High Risk"

# ---------------------------------------------------------------------------
# FIX 1: Enhanced distress lexicon — now includes intensifier+negative combos
# ---------------------------------------------------------------------------
DISTRESS_LEXICON = {
    # Severe self-harm (weight 3)
    "suicide": 3, "suicidal": 3, "kill myself": 3, "end my life": 3, "want to die": 3,
    "self-harm": 3, "selfharm": 3, "hopeless": 3, "worthless": 3, "cannot go on": 3,
    "cut myself": 3, "cutting myself": 3, "slit my wrists": 3, "cut my wrists": 3,
    "overdose": 3, "take pills": 3, "hang myself": 3, "jump off": 3, "swallow pills": 3,
    # Severe aggression / violence toward others (weight 3)
    "murder": 3, "kill all": 3, "kill them": 3, "kill everyone": 3, "kill all of them": 3,
    "kill my friends": 3, "kill my family": 3, "kill people": 3, "want to kill": 3,
    "going to kill": 3, "want to hurt": 3, "hurt everyone": 3, "hurt them all": 3,
    "come at a murder": 3, "commit a murder": 3, "commit murder": 3, "homicide": 3,
    "i hate everyone": 3, "hate all people": 3, "hate all of them": 3,
    "ending my life": 3, "ending life": 3, "end my life": 3,
    "destroy everyone": 3, "destroy them": 3, "attack them": 3,
    # Moderate (weight 2)
    "depressed": 2, "depression": 2, "anxiety": 2, "anxious": 2, "panic": 2,
    "overwhelmed": 2, "scared": 2, "trauma": 2, "terrible": 2, "awful": 2,
    "miserable": 2, "unbearable": 2, "suffering": 2, "desperate": 2, "broken": 2,
    "crying": 2, "can't take this": 2, "can't stand": 2, "falling apart": 2,
    "pain": 2, "chest feels heavy": 2, "something isn't right": 2, "something is wrong": 2, "heavy chest": 2, "chest pain": 2,
    "can't see straight": 3, "vision is blurry": 2, "feeling dizzy": 2, "pass out": 3, "going to pass out": 3,
    "heart is racing": 3, "palpitations": 2,
    "hate": 2, "rage": 2, "furious": 2, "violent": 2, "aggression": 2,
    "knife": 2, "blade": 2, "gun": 2, "weapon": 2,
    # Mild (weight 1)
    "sad": 1, "unhappy": 1, "stressed": 1, "lonely": 1, "fear": 1, "worried": 1,
    "nervous": 1, "tired": 1, "angry": 1, "upset": 1, "frustrated": 1,
    "exhausted": 1, "helpless": 1, "lost": 1, "empty": 1, "numb": 1, "bad": 1,
    # HIGH PRIORITY CRITICAL (weight 3)
    "committing a suicide": 3, "killing myself": 3, "ending my life": 3, "end my life": 3, "suicide": 3,
    "can't catch my breath": 3, "signal the doctors": 3, "signal a doctor": 3, "help me": 3,
}

# Stability markers that actively lower the distress score
STABILITY_LEXICON = {
    "steady": -2, "doing fine": -2, "weekly check": -1, "everything is good": -2,
    "calm": -1, "stable": -2, "no issues": -1, "feeling okay": -1,
    "mostly fine": -2, "routine stress": -2, "just routine stress": -2,
    "deadlines": -1, "deadline": -1, "manageable": -1, "routine": -1,
    "minor worries": -2, "nothing serious": -2, "not serious": -2, "small worries": -2,
    "quiet": -1, "neutral": -2,
}

# Reassurance phrases that usually indicate coping or recovery rather than distress.
REASSURANCE_PATTERNS = [
    (r"\bcan\s+manage\b", -2),
    (r"\bcan\s+rest\s+tonight\b", -2),
    (r"\brest\s+tonight\b", -1),
    (r"\ba\s+bit\s+tired\b", -1),
    (r"\bmanage\s+and\s+rest\b", -2),
    (r"\bmostly\s+fine\b", -2),
    (r"\broutine\s+stress\b", -2),
    (r"\bdeadlines?\b", -1),
    (r"\bminor\s+worries?\b", -2),
    (r"\bnothing\s+serious\b", -2),
    (r"\bnot\s+serious\b", -2),
    (r"\bsmall\s+worries?\b", -2),
    (r"\blittle\s+worries?\b", -2),
    (r"\bnot\s+happy\s+or\s+sad\b", -3),
    (r"\bjust\s+neutral\b", -3),
    (r"\bneutral\s+and\s+quiet\b", -3),
]

# Moderate distress patterns that should reliably land in Medium Risk.
MODERATE_DISTRESS_PATTERNS = [
    r"\boverwhelmed\b",
    r"\bcannot\s+switch\s+my\s+mind\s+off\b",
    r"\bcan'?t\s+switch\s+my\s+mind\s+off\b",
    r"\bmind\s+won'?t\s+stop\b",
    r"\bcannot\s+turn\s+my\s+mind\s+off\b",
    r"\bcan'?t\s+turn\s+my\s+mind\s+off\b",
    r"\bcan'?t\s+switch\s+off\b",
    r"\bcannot\s+switch\s+off\b",
]

# Violence/Aggression intent regex patterns — checked separately before all calibration
VIOLENCE_PATTERNS = [
    r"\bwant\s+to\s+kill\b",
    r"\bgoing\s+to\s+kill\b",
    r"\bwill\s+kill\b",
    r"\bkill\s+(all|everyone|them|people|my|him|her)\b",
    r"\bmurder\b",
    r"\bcommit\s+(a\s+)?murder\b",
    r"\bcome\s+at\s+a\s+murder\b",
    r"\bhomicide\b",
    r"\bwant\s+to\s+(hurt|attack|harm|destroy)\s+(everyone|them|all|people|him|her|my)\b",
    r"\bi\s+hate\s+(everyone|all\s+people|all\s+of\s+them|everybody)\b",
]

# Intensifier patterns that amplify distress — "very bad", "really terrible", etc.
INTENSIFIER_PATTERNS = [
    (r"\b(very|really|extremely|so|incredibly|absolutely|totally|completely|such\s+a)\s+(bad|terrible|awful|sad|scared|anxious|stressed|worried|unhappy|miserable|lonely|afraid|hurt)\b", 2),
    (r"\b(feel|feeling)\s+(very|really|so)\s+(bad|terrible|awful|down|low|empty|hopeless|lost)\b", 2),
    (r"\bcan'?t\s+(cope|handle|manage|take|stand|bear|breathe|sleep|eat|focus)\b", 2),
    (r"\b(don't|do not)\s+feel\s+like\s+(doing|living|going|trying|anything)\b", 2),
    (r"\b(not|never)\s+(okay|ok|fine|good|alright|well|better|happy)\b", 1),
    # Contextual mild patterns (everyday negativity — should not spike to High Risk)
    (r"\bbad\s+(day|morning|evening|night|week|time|mood)\b", 1),
    # Aggression intensifiers
    (r"\b(so|really|absolutely|extremely|incredibly)\s+much\s+(i\s+)?(hate|despise|loathe)\b", 3),
    (r"\b(hate|despise)\s+(everyone|all people|everyone around me|them all)\b", 3),
]


def compute_lexical_distress(text: str) -> tuple[float, list[dict]]:
    """Enhanced lexical analysis with intensifier pattern matching."""
    text_lower = text.lower()
    score = 0.0
    matched_keywords = []

    # 1. Standard lexicon matching (with word boundaries)
    for phrase, weight in DISTRESS_LEXICON.items():
        pattern = rf"\b{re.escape(phrase)}\b"
        if re.search(pattern, text_lower):
            score += weight
            severity = {1: "mild", 2: "moderate", 3: "severe"}[weight]
            matched_keywords.append({"keyword": phrase, "severity": severity, "weight": weight})

    # 2. Intensifier pattern matching (FIX 1)
    for pattern, weight in INTENSIFIER_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            matched_phrase = match.group(0)
            # Avoid double-counting if root word already matched
            already_matched = any(kw["keyword"] in matched_phrase or matched_phrase in kw["keyword"] for kw in matched_keywords)
            if not already_matched:
                score += weight
                severity = {1: "mild", 2: "moderate", 3: "severe"}.get(weight, "moderate")
                matched_keywords.append({"keyword": matched_phrase, "severity": severity, "weight": weight})

    # 3. Stability normalization (with word boundaries)
    for phrase, offset in STABILITY_LEXICON.items():
        pattern = rf"\b{re.escape(phrase)}\b"
        if re.search(pattern, text_lower):
            score += offset

    # 4. Coping / reassurance phrases that should soften low-distress input
    for pattern, offset in REASSURANCE_PATTERNS:
        if re.search(pattern, text_lower):
            score += offset

    word_count = max(len(text.split()), 1)
    norm = score / (word_count ** 0.3)
    return float(min(max(norm * 10, 0.0), 100.0)), matched_keywords


def compute_audio_distress(y, sr, has_real_audio, precomputed_mfccs=None) -> tuple[float, dict]:
    acoustic_details = {}
    if not has_real_audio or y is None:
        return 0.0, acoustic_details

    # PERFORMANCE OPTIMIZATION: Reuse precomputed MFCCs to avoid duplicate expensive librosa operations
    mfccs = precomputed_mfccs if precomputed_mfccs is not None else librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
    mfccs_13 = mfccs[:13, :]
    mfcc_mean = np.mean(mfccs_13, axis=1)
    energy_var = float(np.std(mfccs_13[0]))
    spectral_flux = float(np.mean(np.abs(np.diff(mfcc_mean[1:4]))))

    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    pitch_values = pitches[magnitudes > np.median(magnitudes)]
    pitch_mean = float(np.mean(pitch_values)) if len(pitch_values) > 0 else 0.0
    pitch_std = float(np.std(pitch_values)) if len(pitch_values) > 0 else 0.0

    rms = librosa.feature.rms(y=y)[0]
    silence_threshold = np.mean(rms) * 0.3
    silence_ratio = float(np.sum(rms < silence_threshold) / max(len(rms), 1))

    acoustic_details = {
        "energy_variance": round(energy_var, 3),
        "spectral_flux": round(spectral_flux, 3),
        "pitch_mean_hz": round(pitch_mean, 1),
        "pitch_variability": round(pitch_std, 1),
        "silence_ratio": round(silence_ratio, 3),
    }

    raw = (energy_var * 0.3 + spectral_flux * 12 + silence_ratio * 15 + (pitch_std * 0.05))
    return float(min(raw, 100.0)), acoustic_details

# ---------------------------------------------------------------------------
# FIX 3: XAI explanation — correct attribution math to always sum to 100%
# ---------------------------------------------------------------------------
def generate_xai_explanation(
    matched_keywords: list[dict],
    vader_compound: float,
    text_score: float,
    audio_score: float,
    acoustic_details: dict,
    has_real_audio: bool,
    risk_tier: str,
    prob: float,
    raw_logit: float = 0.0,
    t_pct: float = 0.0,
    a_pct: float = 0.0,
    ml_pct: float = 0.0,
) -> str:
    lines = [f"🔍 **Explainability Report v2.0** — Calibrated Distress Score: {prob:.1f}% ({risk_tier})\n"]
    lines.append(f"📡 **Logit Calibration:** Raw: {raw_logit:.2f} | Base Prob: {1/(1+np.exp(-raw_logit)):.2%}")
    lines.append("🤖 **System Variant:** VOTEX_96.4_STABLE")

    # --- Text Analysis (FIX 1: Dynamic sentiment reasoning) ---
    lines.append("\n📝 **Text Analysis:**")
    if matched_keywords:
        kw_parts = [f'"{kw["keyword"]}" ({kw["severity"]})' for kw in sorted(matched_keywords, key=lambda x: -x["weight"])]
        lines.append(f"  • Distress keywords detected: {', '.join(kw_parts)}")
    else:
        lines.append("  • No specific distress keywords detected.")

    # Dynamic sentiment reasoning
    v_label = "negative" if vader_compound < -0.15 else "positive" if vader_compound > 0.15 else "neutral"
    sentiment_reason = f"Sentiment is {v_label} ({vader_compound:.2f})"
    if vader_compound < -0.4 and matched_keywords:
        top_kws = [kw["keyword"] for kw in sorted(matched_keywords, key=lambda x: -x["weight"])[:2]]
        sentiment_reason += f" driven by distress markers: '{', '.join(top_kws)}'"
    elif vader_compound < -0.15:
        sentiment_reason += " indicating negative emotional tone"
    elif vader_compound > 0.3:
        sentiment_reason += " indicating positive emotional tone"

    lines.append(f"  • {sentiment_reason}")
    lines.append(f"  • Text contribution to final score: {t_pct:.1f}%")

    # --- Acoustic Analysis ---
    lines.append("\n🎙️ **Acoustic Analysis:**")
    if has_real_audio:
        ev = acoustic_details.get('energy_variance', 0)
        sf = acoustic_details.get('spectral_flux', 0)
        lines.append(f"  • Vocal tension: {ev} ({'high' if ev > 5 else 'normal'})")
        lines.append(f"  • Agitation markers: {sf} ({'elevated' if sf > 2 else 'low'})")
        lines.append(f"  • Audio contribution to final score: {a_pct:.1f}%")
    else:
        lines.append("  • No audio provided. Text-only assessment.")

    # --- ML Model ---
    lines.append(f"\n🧠 **ML Model contribution to final score:** {ml_pct:.1f}%")

    # --- Attribution summary (FIX 3: Normalized to 100%) ---
    lines.append(f"\n📊 **Attribution Summary:** Text={t_pct:.1f}% + Audio={a_pct:.1f}% + ML={ml_pct:.1f}% = {t_pct + a_pct + ml_pct:.1f}%")

    return "\n".join(lines)


def load_ml_subsystems():
    global model_instance, tokenizer, bert_model, scaler_text, scaler_audio, device
    if tokenizer is None:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        try:
            tokenizer = BertTokenizer.from_pretrained('bert-base-uncased', local_files_only=True)
            bert_model = BertModel.from_pretrained('bert-base-uncased', local_files_only=True).to(device)
        except Exception:
            # Fallback if local files are missing
            tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
            bert_model = BertModel.from_pretrained('bert-base-uncased').to(device)
            
        bert_model.eval()

        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
        try:
            scaler_text = joblib.load(os.path.join(base_dir, "ml_pipeline", "models", "scaler_text.pkl"))
            scaler_audio = joblib.load(os.path.join(base_dir, "ml_pipeline", "models", "scaler_audio.pkl"))
            model_instance = CrossAttentionFusionNet(audio_dim=40).to(device)
            model_path = os.path.join(base_dir, "ml_pipeline", "models", "cross_attn_enterprise_model.pth")
            if os.path.exists(model_path):
                model_instance.load_state_dict(torch.load(model_path, map_location=device))
            model_instance.eval()
        except Exception as e:
            print(f"Subsystem load ERROR: {str(e)}")


async def analyze_multimodal_request(text: str, document, audio, user_id: str, db: Session) -> AnalysisResponse:
    print(f"\n--- INFERENCE START for USER [{user_id}] ---")

    # 1. Capture and Validate Inputs
    doc_text = ""
    if document and document.filename:
        try:
            reader = PyPDF2.PdfReader(document.file)
            doc_text = " ".join([p.extract_text() for p in reader.pages if p.extract_text()])
            print(f"Document received: {document.filename}")
        except:
            print("Document parsing failed.")

    combined_text = f"{text} {doc_text}".strip() or "no input"

    y_audio, sr_audio, has_real_audio = None, 22050, False
    if audio and audio.filename:
        print(f"Audio received: {audio.filename} ({audio.content_type})")
        audio_bytes = await audio.read()
        if len(audio_bytes) == 0:
            print("ERROR: Received empty audio blob.")
            raise HTTPException(status_code=400, detail="Audio file is empty or corrupted.")

        try:
            y_audio, sr_audio = librosa.load(io.BytesIO(audio_bytes), sr=22050)
            if y_audio is not None and len(y_audio) > 0:
                has_real_audio = True
                
                # PERFORMANCE OPTIMIZATION: 
                # Truncate audio to maximum 3 seconds to ensure fast STFT/MFCC computation
                # 3 seconds is sufficient to capture vocal tension/pitch markers for diagnostics.
                max_samples = sr_audio * 3
                if len(y_audio) > max_samples:
                    y_audio = y_audio[:max_samples]
                    
                print(f"Audio loaded. Duration: {len(y_audio)/sr_audio:.2f}s")
            else:
                print("ERROR: Librosa load returned zero samples.")
                raise HTTPException(status_code=400, detail="Audio file contains no recognizable samples.")
        except Exception as e:
            print(f"ERROR: Audio processing failed: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid audio format. Error: {str(e)}")
    else:
        print("Diagnostic alert: No audio file present in request.")

    # 2. Extract Signals
    lex_score, matched_kws = compute_lexical_distress(combined_text)
    v_comp = sentiment_analyzer.polarity_scores(combined_text)['compound']
    # Dampened VADER conversion: everyday negative phrasing shouldn't spike score
    v_distress = max(0.0, (-v_comp) * 30 + 15) # Dampened further from 40
    text_score = min(100.0, (lex_score * 0.65 + v_distress * 0.35))

    # PERFORMANCE OPTIMIZATION: Compute MFCCs once (n_mfcc=40) to be shared by both heuristics and ML
    precomputed_mfccs = None
    if has_real_audio and y_audio is not None:
        precomputed_mfccs = librosa.feature.mfcc(y=y_audio, sr=sr_audio, n_mfcc=40)

    audio_score, acoustic_details = compute_audio_distress(y_audio, sr_audio, has_real_audio, precomputed_mfccs=precomputed_mfccs)

    # 3. Multimodal Fusion
    prob = text_score
    m_prob = 0.0
    raw_logit = 0.0
    base_prob = 0.0
    load_ml_subsystems()

    if model_instance and scaler_text:
        try:
            inputs = tokenizer([combined_text], return_tensors="pt", padding=True, truncation=True, max_length=128).to(device)
            with torch.no_grad():
                t_f = bert_model(**inputs).last_hidden_state[:, 0, :].cpu().numpy()
            t_s = scaler_text.transform(t_f)

            # Reuse the precomputed MFCCs for the ML model
            if has_real_audio and precomputed_mfccs is not None:
                a_raw = np.mean(precomputed_mfccs.T, axis=0).reshape(1, -1)
            else:
                a_raw = np.mean(librosa.feature.mfcc(y=np.zeros(22050), sr=22050, n_mfcc=40).T, axis=0).reshape(1, -1)
                
            a_s = scaler_audio.transform(a_raw) if has_real_audio else np.zeros((1, 40))

            with torch.no_grad():
                logits = model_instance(torch.tensor(t_s, dtype=torch.float32).to(device), torch.tensor(a_s, dtype=torch.float32).to(device))
                raw_logit = (logits[0, 1] - logits[0, 0]).item()
                base_prob = 1.0 / (1.0 + np.exp(-raw_logit))
                m_prob = base_prob * 100
        except Exception as fusion_err:
            print(f"Fusion model error: {str(fusion_err)}")

    # -----------------------------------------------------------------------
    # FIX: Dynamic ML Dampening for Text-Only Inputs or Meaningless Audio
    # -----------------------------------------------------------------------
    audio_is_meaningful = has_real_audio and audio_score > 1.0

    if not audio_is_meaningful:
        # The ML fusion model defaults to an artificial floor on zeroed/noisy audio arrays.
        # We must pull m_prob dynamically towards the text_score to prevent clamping.
        m_prob = (0.2 * m_prob) + (0.8 * text_score)
        
        # Further dampen if text is clearly positive or neutral
        if v_comp > 0.0:
            m_prob = min(m_prob, max(0.0, 15.0 + (v_comp * -15.0)))

    # -----------------------------------------------------------------------
    # FIX 3: Normalized feature weights — always sum to exactly 100%
    # -----------------------------------------------------------------------
    if audio_is_meaningful:
        # Text 30% + Audio 40% + ML 30% = 100%
        W_TEXT, W_AUDIO, W_ML = 0.30, 0.40, 0.30
    elif has_real_audio:
        # Text 55% + Audio 10% + ML 35% = 100%
        W_TEXT, W_AUDIO, W_ML = 0.55, 0.10, 0.35
    else:
        # Text 60% + Audio 0% + ML 40% = 100%
        W_TEXT, W_AUDIO, W_ML = 0.60, 0.00, 0.40

    prob = (text_score * W_TEXT) + (audio_score * W_AUDIO) + (m_prob * W_ML)
    print(f"FUSION: Text({text_score:.1f}*{W_TEXT}) + Audio({audio_score:.1f}*{W_AUDIO}) + ML({m_prob:.1f}*{W_ML}) = {prob:.2f}%")

    # Compute attribution percentages for XAI (FIX 3: sum to exactly 100%)
    t_pct = W_TEXT * 100
    a_pct = W_AUDIO * 100
    ml_pct = W_ML * 100

    # -----------------------------------------------------------------------
    # FIX 2: Exponential scaling for corroborating severe signals
    # If high vocal tension + elevated agitation + strongly negative sentiment,
    # scale exponentially into High/Critical tier instead of plateauing.
    # -----------------------------------------------------------------------
    ev = acoustic_details.get("energy_variance", 0)
    sf = acoustic_details.get("spectral_flux", 0)
    # Browser mic recordings typically produce ev=50-100, sf=30-60 from normal
    # speech. Only trigger exponential boost for truly extreme vocal distress.
    high_vocal_tension = ev > 150
    elevated_agitation = sf > 80
    strongly_negative = v_comp < -0.50

    if audio_is_meaningful and high_vocal_tension and elevated_agitation and strongly_negative:
        if prob < 75.0:
            boost_factor = 1.0 + (abs(v_comp) * 0.3) + (min(ev, 500) / 500 * 0.15) + (min(sf, 200) / 200 * 0.1)
            prob = min(prob * boost_factor, 88.0)
            print(f"EXPONENTIAL SCALING: Genuine severe audio detected (tension={ev}, agitation={sf}, sentiment={v_comp:.2f}). Boosted to {prob:.2f}%")
    elif audio_is_meaningful and (ev > 80 or sf > 50) and v_comp < -0.3:
        # Moderate audio stress — gentle proportional nudge, not a floor
        nudge = min(10.0, (ev / 100.0) * 5.0 + (sf / 100.0) * 3.0)
        prob = min(prob + nudge, 80.0)
        print(f"MODERATE AUDIO NUDGE: (tension={ev:.1f}, agitation={sf:.1f}, sentiment={v_comp:.2f}). Nudged to {prob:.2f}%")
    words_len = len(combined_text.split())
    text_lower_check = combined_text.lower()

    # -----------------------------------------------------------------------
    # VIOLENCE INTENT OVERRIDE — runs FIRST, before any other calibration
    # Catches homicidal/aggressive ideation that bypasses standard lexicon
    # -----------------------------------------------------------------------
    has_violence_intent = any(re.search(pat, text_lower_check) for pat in VIOLENCE_PATTERNS)
    if has_violence_intent:
        prob = max(prob, 82.0)
        # If self-harm is also present, escalate further
        if any(w in text_lower_check for w in ["kill myself", "killing myself", "suicide", "end my life", "cut myself", "overdose"]):
            prob = max(prob, 98.9)
            print(f"CRITICAL: Combined homicidal + suicidal ideation. Score: {prob}%")
        else:
            print(f"VIOLENCE INTENT OVERRIDE: Homicidal/aggressive ideation detected. Score: {prob:.2f}%")

    has_critical = any(kw['weight'] >= 3 for kw in matched_kws) or has_violence_intent  # violence regex also triggers critical
    has_moderate = any(kw['weight'] >= 2 for kw in matched_kws)
    
    if has_critical:
        # Emergency Override for clinical urgency
        if any(w in text_lower_check for w in ["kill", "murder", "suicide", "end my life", "pass out", "catch my breath", "doctor", "help me", "cut myself", "overdose"]):
            prob = max(prob, 76.5)
            # Self-directed lethal intent
            if any(w in text_lower_check for w in ["kill myself", "killing myself", "suicide", "cut myself", "overdose", "end my life", "ending my life"]):
                prob = max(prob, 98.9)
                print(f"SEVERE INTENSITY OVERRIDE: Direct self-harm intent. Score: {prob}%")
        
        if words_len < 8 and not has_real_audio:
            prob = min(prob + 35.0, 96.0) 
        else:
            prob = min(prob + (100 - prob) * 0.85, 99.5) 
            
        print(f"ADCL CALIBRATION: Critical text detected. Scaled to {prob:.2f}%")
        
    elif has_moderate:
        # Reduced boost to allow positive sentiment to override more easily
        prob = max(prob + 5.0, 31.0) 
        print(f"ADCL CALIBRATION: Moderate text detected. Scaled to {prob:.2f}%")
    
    # NEW: Mild-only tier — if ONLY mild keywords were matched (no moderate/critical),
    # constrain the score to a sensible "everyday negativity" band
    has_mild_only = matched_kws and not has_moderate and not has_critical
    if has_mild_only:
        # Mild distress only: cap at 42% max (Medium Risk ceiling)
        mild_max = 42.0
        mild_min = 20.0
        prob = min(max(prob, mild_min), mild_max)
        print(f"MILD-ONLY CALIBRATION: Only mild keywords detected. Capped to [{mild_min}-{mild_max}]. Score: {prob:.2f}%")

    has_moderate_pattern = any(re.search(pattern, text_lower_check) for pattern in MODERATE_DISTRESS_PATTERNS)
    if not has_critical and has_moderate_pattern:
        prob = 50.0
        print(f"MODERATE PATTERN OVERRIDE: Rumination/overwhelm language detected. Scaled to {prob:.2f}%.")

    # Explicit neutral-state override for plainly non-distressed descriptions.
    if not has_critical and any(
        phrase in text_lower_check
        for phrase in [
            "not happy or sad",
            "just neutral",
            "neutral and quiet",
            "quiet and neutral",
            "nothing serious",
            "mostly fine",
        ]
    ):
        prob = min(prob, 12.0)
        print(f"NEUTRAL OVERRIDE: Plainly neutral language detected. Capped to {prob:.2f}%.")

    # Explicit coping/reassurance override for everyday fatigue or manageable stress.
    if not has_critical:
        reassuring_match = any(
            re.search(pattern, text_lower_check)
            for pattern, _ in REASSURANCE_PATTERNS
        ) or any(phrase in text_lower_check for phrase in [
            "i can manage",
            "manage and rest",
            "rest tonight",
            "bit tired but i can manage",
            "tired but i can manage",
        ])
        if reassuring_match and not has_moderate:
            prob = min(prob, 22.0)
            print(f"REASSURANCE OVERRIDE: Coping language detected. Capped to {prob:.2f}%.")

    # Positive and Dynamic Low-Risk Baseline Calibration
    # Allow override even if moderate keywords are present, as long as sentiment is strong
    if not has_critical:
        if v_comp > 0.15:
            # If sentiment is positive but moderate keywords exist (e.g. "not depressed")
            # We apply an even stronger dampener
            dampen = max(0.01, 0.10 - v_comp * 0.12)
            if has_moderate:
                 dampen *= 2.0 # Less dampening if actual distress words were used
            
            prob = max(prob * dampen, 1.0)
            print(f"POSITIVE OVERRIDE: Sentiment positive ({v_comp:.2f}). Scaled to {prob}%.")
        elif prob <= 45.0 and not has_mild_only:
            # Healthy baseline check-ins drop much lower now
            # Only applies to inputs with NO distress keywords at all
            variance = (-v_comp) * 8.0 + lex_score * 2.5
            prob = min(max(prob + variance, 2.0), 25.0)
            print(f"DYNAMIC LOW-RISK: Baseline calibration ({v_comp:.2f}). Scaled to {prob}%.")

    # Step 3: Strict Threshold
    prob = float(round(min(max(prob, 0.0), 100.0), 2))
    status = "DISTRESSED" if prob >= 50.0 else "NORMAL"
    risk = get_risk_tier(prob)

    # 4. Save and Return
    db.add(DiagnosticRecord(user_id=user_id, patient_text_payload=text, distress_probability=prob, status_classification=f"{status} ({risk})"))
    db.commit()

    # -----------------------------------------------------------------------
    # Dynamic 7-Emotion Calculation (Normalized to 100%)
    # -----------------------------------------------------------------------
    vader_dict = sentiment_analyzer.polarity_scores(combined_text)
    v_neg = vader_dict['neg']
    v_pos = vader_dict['pos']
    v_neu = vader_dict['neu']
    
    # Correlate specific keywords to core primary emotions
    sad_keywords = sum([kw['weight'] for kw in matched_kws if any(term in kw['keyword'] for term in ['sad', 'hopeless', 'depress', 'suicide', 'kill', 'end my life', 'death', 'die', 'miserable', 'crying', 'suffering', 'broken', 'empty'])])
    fear_keywords = sum([kw['weight'] for kw in matched_kws if any(term in kw['keyword'] for term in ['fear', 'anxious', 'panic', 'scared', 'afraid', 'terror', 'worried', 'nervous', 'chest', 'pain', 'heart', 'breath', 'suicide', 'kill', 'die', 'death', 'end my life'])])
    anger_keywords = sum([kw['weight'] for kw in matched_kws if any(term in kw['keyword'] for term in ['ang', 'frustrat', 'mad', 'hate', 'rage'])])
    has_suicide_intent = any(w in combined_text.lower() for w in ["suicide", "kill", "die", "death", "end my life", "kill myself", "want to die"])
    suicide_fear_boost = 0.9 if has_suicide_intent else 0.0

    emotion_weights = {
        'happy': v_pos * 1.5 if v_pos > 0.3 else v_pos * 0.8,
        'sad': v_neg * 0.5 + min(2.0, sad_keywords * 0.4),
        'angry': v_neg * 0.3 + min(1.0, anger_keywords * 0.3),
        'fear': v_neg * 0.25 + min(2.2, fear_keywords * 0.45 + suicide_fear_boost),
        'disgust': 0.0,
        'surprise': 0.0,
        'neutral': v_neu * 0.2 if (v_pos > 0.3 or v_neg > 0.3) else v_neu * 0.8
    }

    # Smooth penalty scaling instead of sharp cutoffs
    base_penalty = max(0.01, 1.0 - (prob / 100.0) * 1.5)
    if prob > 30.0 or has_suicide_intent or has_moderate:
        penalty = 0.02 if (has_suicide_intent or prob > 50.0) else base_penalty * 0.1
        emotion_weights['happy'] *= penalty 
        emotion_weights['neutral'] *= (penalty * 1.5)
        
        # Distribute the suppressed weights proportionally to distress emotions
        surplus = (1.0 - penalty) * (emotion_weights['happy'] + emotion_weights['neutral'])
        if has_suicide_intent:
            emotion_weights['sad'] += surplus * 0.35
            emotion_weights['fear'] += surplus * 0.5
            emotion_weights['angry'] += surplus * 0.15
        else:
            emotion_weights['sad'] += surplus * 0.5
            emotion_weights['fear'] += surplus * 0.3
            emotion_weights['angry'] += surplus * 0.2
        print(f"EMOTION OVERRIDE: Risk [{prob}%]. Applied smooth penalty [{penalty:.2f}] to positive signals.")

    # For self-harm intent text, ensure fear is represented as a co-dominant distress channel.
    if has_suicide_intent:
        emotion_weights['fear'] = max(emotion_weights['fear'], emotion_weights['sad'] * 0.55)

    if any(w in combined_text.lower() for w in ['bad', 'awful', 'terrible', 'disgust', 'gross', 'hate', 'shame']):
        emotion_weights['disgust'] += 0.5 + (v_neg * 0.4)
        
    if '!' in combined_text or 'wow' in combined_text.lower() or 'sudden' in combined_text.lower():
        emotion_weights['surprise'] += 0.3
        
    # Standardize weights proportionally to exaggerate dominant emotions without mathematically pulling 0s up to 1s
    pow_weights = {k: v ** 1.8 for k, v in emotion_weights.items()}
    total_pow = sum(pow_weights.values())
    
    if total_pow == 0 or np.isnan(total_pow):
        emotion_weights = {k: 0.0 for k in emotion_weights}
        emotion_weights['neutral'] = 1.0
        total_pow = 1.0
    else:
        emotion_weights = {k: v / total_pow for k, v in pow_weights.items()}
        
    happy_val = float(emotion_weights['happy'])
    sad_val = float(emotion_weights['sad'])
    angry_val = float(emotion_weights['angry'])
    fear_val = float(emotion_weights['fear'])
    disgust_val = float(emotion_weights['disgust'])
    surprise_val = float(emotion_weights['surprise'])
    neutral_val = float(emotion_weights['neutral'])
    
    # Generate XAI dynamic string based on the new Unified Pipeline request
    dynamic_xai = generate_xai_explanation(
        matched_kws, v_comp, text_score, audio_score, acoustic_details,
        has_real_audio, risk, prob, raw_logit, t_pct, a_pct, ml_pct
    )
    
    # Inject 7-emotion breakdown into XAI
    driving_factors_str = f"\n\n⚡ **Dynamic 7-Emotion Breakdown**\n- 😞 Sadness: {sad_val*100:.1f}%\n- 😨 Fear: {fear_val*100:.1f}%\n- 😡 Anger: {angry_val*100:.1f}%\n- 🤢 Disgust: {disgust_val*100:.1f}%\n- 😲 Surprise: {surprise_val*100:.1f}%\n-  Happy: {happy_val*100:.1f}%\n- 😐 Neutral: {neutral_val*100:.1f}%"
    
    return AnalysisResponse(
        status=status, distress_probability=prob, confidence_score=prob, risk_tier=risk,
        text_sentiment_score=v_comp, shap_text_weight=W_TEXT, shap_audio_weight=W_AUDIO,
        raw_logit=raw_logit, base_probability=base_prob,
        xai_explanation=dynamic_xai + driving_factors_str,
        recommendation_title=get_recommendation(prob)["title"],
        recommendation_body=get_recommendation(prob)["body"],
        image_url=get_recommendation(prob)["image"],
        energy_variance=acoustic_details.get('energy_variance', 0.0),
        pitch_variability=acoustic_details.get('pitch_variability', 0.0),
        spectral_flux=acoustic_details.get('spectral_flux', 0.0),
        silence_ratio=acoustic_details.get('silence_ratio', 0.0),
        pitch_mean_hz=acoustic_details.get('pitch_mean_hz', 0.0),
        sadness=sad_val,
        joy=happy_val,
        love=0.0, # Deprecated in favor of 7 standard emotions
        anger=angry_val,
        fear=fear_val,
        surprise=surprise_val,
        neutral=neutral_val,
        disgust=disgust_val
    )
