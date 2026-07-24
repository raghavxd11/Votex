/**
 * gemini.ts — Votex Intelligence 4.0
 * Client-side utility that calls our internal Next.js API route,
 * which securely proxies requests to the Google Gemini API server-side.
 * The API key is NEVER exposed to the browser.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const FALLBACK_RESPONSES: Record<string, string> = {
  RATE_LIMIT:
    "I'm receiving a lot of messages right now. Please wait a moment before trying again — your well-being matters and I'm here whenever you're ready.",
  DEFAULT:
    "I'm having a brief connection issue with my support modules. Please try again in a moment. If you're feeling distressed, know that you're not alone.",
};

/**
 * Sends the full conversation history to the internal /api/chat proxy
 * and returns the assistant's reply text.
 */
export async function sendMessageToGemini(history: ChatMessage[], diagnosticHistory?: any[], learnings?: any[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, diagnosticHistory, learnings }),
  });

  const data = await response.json();

  // Handle rate limit
  if (response.status === 429 || data.error === 'RATE_LIMIT') {
    throw new Error('RATE_LIMIT');
  }

  // Handle other API errors
  if (!response.ok || data.error) {
    throw new Error(data.error || `Server error: ${response.status}`);
  }

  if (!data.reply) {
    throw new Error('Empty reply from AI service.');
  }

  return data.reply;
}
