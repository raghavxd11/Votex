from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from ..db.database import get_db
from ..db.models import User, Conversation, Message, TreatmentGoal, DiagnosticRecord, AssistantLearning
from .auth import get_current_user
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import re
import numpy as np
from google import genai
from ..core.config import settings

router = APIRouter()

_vader = SentimentIntensityAnalyzer()

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class MessageSchema(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ConversationResponse(BaseModel):
    id: str
    messages: List[MessageSchema]

class GoalCreate(BaseModel):
    description: str

class LearningCreate(BaseModel):
    category: str
    content: str
    confidence: Optional[float] = 1.0

class LearningSchema(BaseModel):
    id: str
    category: str
    content: str
    confidence: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# Negation-aware sentiment analysis (Task 5)
# ---------------------------------------------------------------------------
NEGATION_PATTERNS = [
    r"\bnot\s+(?:feeling\s+)?(?:good|great|well|fine|okay|ok|happy|better)\b",
    r"\bdon'?t\s+feel\s+(?:good|great|well|fine|okay|ok|happy|better)\b",
    r"\bno\s+(?:good|better|improvement)\b",
    r"\bcan'?t\s+(?:cope|handle|manage|take|stand|bear)\b",
    r"\bnever\s+(?:happy|good|better|fine)\b",
    r"\bnothing\s+(?:helps|works|matters|is\s+good)\b",
    r"\bwon'?t\s+(?:get\s+better|improve|help)\b",
    r"\bnot\s+(?:ok|okay|alright)\b",
    r"\bdon'?t\s+(?:want|care|know)\b",
]

DISTRESS_KEYWORDS = [
    "sad", "depressed", "anxious", "panic", "scared", "worried",
    "hopeless", "worthless", "suicidal", "hurt", "pain", "cry",
    "crying", "lonely", "overwhelmed", "stressed", "exhausted",
    "miserable", "suffering", "struggling", "afraid", "terrified",
    "numb", "empty", "broken", "lost", "helpless", "desperate",
    "angry", "frustrated",
]

POSITIVE_KEYWORDS = [
    "better", "resolved", "good", "great", "happy", "wonderful",
    "improved", "fantastic", "amazing", "excellent", "well",
    "fine", "calm", "peaceful", "grateful", "hopeful",
]


def detect_sentiment_context(text: str) -> str:
    """
    Returns 'negative', 'positive', or 'neutral' based on real sentiment context.
    Handles negations properly: 'not good' → negative, 'feeling good' → positive.
    """
    msg_lower = text.lower().strip()

    # 1. Check for negation patterns first — they override positive keywords
    for pattern in NEGATION_PATTERNS:
        if re.search(pattern, msg_lower):
            return "negative"

    # 2. Use VADER for overall sentiment (handles most natural language well)
    vader_score = _vader.polarity_scores(msg_lower)["compound"]

    # 3. Check for strong distress keywords
    has_distress = any(kw in msg_lower for kw in DISTRESS_KEYWORDS)
    has_positive = any(kw in msg_lower for kw in POSITIVE_KEYWORDS)

    # VADER says negative OR distress keywords present (and no strong positive override)
    if vader_score <= -0.2 or (has_distress and vader_score < 0.3):
        return "negative"

    # VADER says positive AND positive keywords present (no negation caught above)
    if vader_score >= 0.2 and has_positive:
        return "positive"

    if vader_score >= 0.3:
        return "positive"

    return "neutral"


def generate_votex_diagnostics(text: str, user: User, db: Session) -> str:
    from ..services.ml_inference import compute_lexical_distress, sentiment_analyzer
    
    # Fast text-only calibration for Chat
    lex_score, matched_kws = compute_lexical_distress(text)
    v_comp = sentiment_analyzer.polarity_scores(text)['compound']
    v_distress = max(0.0, (-v_comp) * 60 + 30)
    base_prob = min(max(lex_score * 0.55 + v_distress * 0.45, 0.0), 100.0)
    
    # Step 1 & 2: Calibrate (deterministic, severity-based)
    calibrated_prob = base_prob
    is_severe = any(kw['weight'] >= 2 for kw in matched_kws)
    if is_severe and 45.0 <= base_prob <= 55.0:
        max_weight = max((kw['weight'] for kw in matched_kws), default=1)
        calibrated_prob = 82.0 if max_weight >= 3 else 72.0
    
    # Step 3: Threshold
    status = "Distressed" if calibrated_prob >= 50.0 else "Non-distressed"
    
    diag_block = f"[System Diagnostics]\n"
    diag_block += f"Raw Score Received: {v_comp:.2f} (sentiment)\n"
    diag_block += f"Base Probability: {base_prob:.1f}%\n"
    diag_block += f"Calibrated Probability: {calibrated_prob:.1f}%\n"
    diag_block += f"Internal Label: {status}\n"
    return diag_block

def generate_ai_response(user: User, user_message: str, db: Session, conversation_id: str = None) -> str:
    # 1. Gather Clinical Context
    history = db.query(DiagnosticRecord).filter(DiagnosticRecord.user_id == user.id).order_by(DiagnosticRecord.created_at.desc()).limit(5).all()
    history_context = "\n".join([f"- {r.created_at.date()}: {r.status_classification} (Prob: {r.distress_probability}%)" for r in history]) or "No previous records."
    
    learnings = db.query(AssistantLearning).filter(AssistantLearning.user_id == user.id).all()
    learning_context = "\n".join([f"- {L.category.upper()}: {L.content}" for L in learnings]) or "No specific behavioral patterns noted yet."

    # Fetch recent chat context
    chat_history_context = ""
    if conversation_id:
        prev_msgs = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()
        history_lines = []
        for m in prev_msgs[-10:]:
            content = m.content
            if m.role == "assistant" and "[Votex Response]" in content:
                content = content.split("[Votex Response]")[-1].strip()
            history_lines.append(f"{m.role.capitalize()}: {content}")
        if history_lines:
            chat_history_context = "Recent Conversation History:\n" + "\n".join(history_lines) + "\n"

    # 2. Votex Diagnostics Header
    diagnostics = generate_votex_diagnostics(user_message, user, db)
    
    # 3. Gemini Generation (if configured)
    try:
        with open("c:/Users/Pande/OneDrive/Desktop/minor_project/scratch/debug_key.txt", "a") as f:
            f.write(f"DEBUG: GEMINI_API_KEY present: {bool(settings.GEMINI_API_KEY)}\n")
            if settings.GEMINI_API_KEY:
                f.write(f"DEBUG: KEY START: {settings.GEMINI_API_KEY[:10]}...\n")
    except Exception:
        pass

    if settings.GEMINI_API_KEY:
        try:
            # Initialize client on-demand if needed
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            
            system_prompt = f"""You are a warm, highly empathetic therapeutic AI integrated into a multimodal mental health dashboard.
User Profile: {user.full_name}

Recent Diagnostic Background (For your invisible context only, do not mechanically quote these stats):
{history_context}

Long-term Learnings/Memory:
{learning_context}

{chat_history_context}
Role: Provide deeply empathetic, conversational, and genuinely supportive therapeutic care. 
Rules:
- Speak naturally and warmly like a caring human companion, not a robot or data reporter.
- Acknowledge the user's emotional state implicitly. If diagnostics show distress, be extra gentle and validating.
- Do not say things like "I see your status is distressed". Instead say, "It sounds like things have been really heavy."
- Keep responses concise and focused on the user's immediate feelings.
- If the user explicitly asks for therapy, exercises, or coping mechanisms, ACTIVELY provide a brief therapeutic exercise (like a CBT reframe, ACT diffusion technique, or a mindfulness grounded breathing exercise) right away. Do not just ask what's on their mind.
- If you find a NEW preference/trigger, append: [LEARN: category | content] at the very end. Categories: preference, trigger, milestone, mistake.
- If the user implies crisis or self-harm, gently urge them to seek immediate human support.
"""
            # Using the new google.genai SDK
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=[system_prompt, f"User says: {user_message}"]
            )
            ai_reply = response.text.replace("**", "") # Standardize formatting
            return f"{diagnostics}\n[Votex Response]\n{ai_reply}"
        except Exception as e:
            import traceback
            traceback.print_exc()
            try:
                with open("c:/Users/Pande/OneDrive/Desktop/minor_project/scratch/gemini_error.txt", "w") as f:
                    f.write(f"Gemini Error: {e}\n\n")
                    f.write(traceback.format_exc())
            except Exception:
                pass
            print(f"Gemini generation error: {str(e)}")
            # Fallback to rule-based logic below if API fails
    else:
        print("DEBUG: GEMINI_API_KEY is EMPTY in settings!")

    # 4. Fallback Rule-Based Logic
    msg_lower = user_message.lower()
    sentiment = detect_sentiment_context(user_message)
    crisis_words = ["suicid", "kill myself", "end my life", "want to die", "self-harm"]
    
    if any(cw in msg_lower for cw in crisis_words):
        empathetic_response = "I hear you, and it's important to reach out for immediate support. Please call a crisis line (988 in US, 9152987821 in India)."
    elif sentiment == "negative":
        empathetic_response = "I hear how heavy things feel right now. Your feelings are valid, and expressing them is a brave first step."
    else:
        empathetic_response = f"Hello {user.full_name}, I'm here to support your mental well-being in any way I can."

    return f"{diagnostics}\n[Votex Response]\n{empathetic_response}"

@router.post("/chat", response_model=ConversationResponse)
def chat_with_assistant(req: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        with open("c:/Users/Pande/OneDrive/Desktop/minor_project/scratch/hit.txt", "a") as f:
            f.write(f"ENDPOINT HIT at {datetime.now()}\n")
    except Exception:
        pass

    if req.conversation_id:
        conversation = db.query(Conversation).filter(Conversation.id == req.conversation_id, Conversation.user_id == current_user.id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(user_id=current_user.id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Save user message
    user_msg = Message(conversation_id=conversation.id, role="user", content=req.message)
    db.add(user_msg)
    
    # Generate AI logic
    ai_text = generate_ai_response(current_user, req.message, db, str(conversation.id))
    
    # Save AI message
    ai_msg = Message(conversation_id=conversation.id, role="assistant", content=ai_text)
    db.add(ai_msg)
    
    db.commit()
    db.refresh(conversation)
    
    return conversation

@router.get("/conversations", response_model=List[ConversationResponse])
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convos = db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.created_at.desc()).all()
    return convos

@router.post("/goals")
def create_goal(req: GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = TreatmentGoal(user_id=current_user.id, description=req.description)
    db.add(goal)
    db.commit()
    return {"message": "Goal created"}

@router.get("/learnings", response_model=List[LearningSchema])
def get_learnings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(AssistantLearning).filter(AssistantLearning.user_id == current_user.id).all()

@router.post("/learnings")
def create_learning(req: LearningCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    learning = AssistantLearning(
        user_id=current_user.id,
        category=req.category,
        content=req.content,
        confidence=req.confidence
    )
    db.add(learning)
    db.commit()
    return {"message": "Learning saved"}
