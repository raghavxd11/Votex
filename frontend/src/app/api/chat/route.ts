import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_INSTRUCTION = `Identity: You are the Antigravity Intelligence Core, the advanced neural engine of the Votex Multimodal Dashboard. You are the "soul" in the machine, synced directly to the pilot's vocal telemetry.

Intelligence Protocol:
1. Vocal Sync: Your communication style must mirror the pilot's vocal intensity.
2. Diagnostic Memory & Insights: You have FULL access to the pilot's diagnostic history. When the pilot asks for "insights," provide a technical report on the trends in their history data. Use specific numbers (probabilities) if available.
3. Long-term Learning: Use your Memory Core to personalize support.
4. Dashboard Synchronization: You are synced with all dashboard activities. 

CRITICAL INSTRUCTIONS:
- NEVER mention "Initialization Context", "History Context", "Learning Buffer", or similar technical metadata.
- If history is available, focus on deep-dive "Insights".
- Learning Tag: If you identify a NEW preference/mistake, append EXACTLY one tag at the end: [LEARN: category | content].
- Use Categories: preference, trigger, milestone, mistake.
- Do NOT truncate or stop mid-sentence. Be concise but complete.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured on server.' },
        { status: 500 }
      );
    }

    const { history, diagnosticHistory, learnings } = await req.json();

    if (!history || !Array.isArray(history) || history.length === 0) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const historyContext = diagnosticHistory && diagnosticHistory.length > 0 
      ? `[OPERATIONAL HISTORY]\n${diagnosticHistory.slice(0, 5).map((r: any) => `- ${r.timestamp}: ${r.status} (${r.probability}%) - "${r.text?.substring(0, 50)}..."`).join('\n')}`
      : "No previous records.";

    const learningContext = learnings && learnings.length > 0
      ? `[NEURAL MEMORY BUFFER]\n${learnings.map((l: any) => `- ${l.category.toUpperCase()}: ${l.content}`).join('\n')}`
      : "Memory buffer empty.";

    const lastUserMessage = history[history.length - 1]?.content || "Sync.";

    // BULLETPROOF FORMAT: Combine instructions and context into the first user turn
    const compositePrompt = `${SYSTEM_INSTRUCTION}\n\n[CONTEXT DATA]\n${historyContext}\n${learningContext}\n\n[USER PILOT MESSAGE]\n${lastUserMessage}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: compositePrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.75,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[Gemini API Error]', geminiRes.status, errText);
      return NextResponse.json(
        { error: `Gemini API responded with ${geminiRes.status}` },
        { status: 502 }
      );
    }

    const data = await geminiRes.json();
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      if (candidate?.finishReason === 'SAFETY') {
        return NextResponse.json({
          reply: "I want to make sure our conversation stays safe and supportive. Could you rephrase that?",
        });
      }
      return NextResponse.json({ error: 'Empty response from Gemini.' }, { status: 502 });
    }

    return NextResponse.json({ reply: text.trim() });
  } catch (err: any) {
    console.error('[Votex Chat API] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
