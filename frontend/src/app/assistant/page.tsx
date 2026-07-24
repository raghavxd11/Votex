'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ChatWindow from '../../components/chat/ChatWindow';
import ChatInput from '../../components/chat/ChatInput';
import { sendMessageToGemini, type ChatMessage } from '../../lib/gemini';

const STORAGE_KEY = 'votex_chat_history';

const FALLBACK_RESPONSES: Record<string, string> = {
  RATE_LIMIT:
    "I'm receiving many messages right now. Please wait a moment before trying again — your well-being matters and I'm here whenever you're ready.",
  DEFAULT:
    "I'm having a brief connection issue with my support modules. Please try again in a moment. If you're feeling distressed, know that you're not alone.",
};

export default function AssistantPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [diagnosticHistory, setDiagnosticHistory] = useState<any[]>([]);
  const [learnings, setLearnings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [isClearConfirm, setIsClearConfirm] = useState(false);

  // Auth guard and fetch history
  useEffect(() => {
    if (!authLoading && !user) {
       router.push('/login');
       return;
    }
    if (user) {
      const fetchHistory = async () => {
        try {
          const token = localStorage.getItem('token');
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const res = await fetch(`${apiUrl}/v1/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setDiagnosticHistory(data);
          }
          const learningRes = await fetch(`${apiUrl}/api/assistant/learnings`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (learningRes.ok) {
            const data = await learningRes.json();
            setLearnings(data);
          }
        } catch (err) {
          console.error("Failed to fetch history", err);
        }
      };
      fetchHistory();
    }
  }, [user, authLoading, router]);

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => setSessionTime((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      const updatedHistory = [...messages, userMessage];
      setMessages(updatedHistory);
      setIsLoading(true);

      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        
        // --- NEW: Call Unified Backend Chat API ---
        const response = await fetch(`${apiUrl}/api/assistant/chat`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ 
            message: text.trim()
            // Backend handles conversation state/history persistence
          })
        });

        if (!response.ok) {
          throw new Error(`Assistant API failed: ${response.status}`);
        }

        const data = await response.json();
        const lastMsg = data.messages[data.messages.length - 1];
        let replyText = lastMsg.content;

        // Strip the [Votex Response] and [System Diagnostics] headers for cleaner UI if desired,
        // or just keep them for transparency. Let's keep them but clean up formatting.
        if (replyText.includes('[Votex Response]')) {
          replyText = replyText.split('[Votex Response]')[1].trim();
        }

        // EXTRACTION: Check for [LEARN: category | content] tags
        const learningMatch = replyText.match(/\[LEARN:\s*(\w+)\s*\|\s*([^\]]+)\]/);
        if (learningMatch) {
          const category = learningMatch[1];
          const content = learningMatch[2].trim();
          
          // Save to LTM (Long-term Memory)
          await fetch(`${apiUrl}/api/assistant/learnings`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ category, content })
          });
          
          // Refetch learnings to keep context fresh
          const learningRes = await fetch(`${apiUrl}/api/assistant/learnings`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (learningRes.ok) {
            const learningsData = await learningRes.json();
            setLearnings(learningsData);
          }

          // Strip the tag from the displayed message
          replyText = replyText.replace(/\[LEARN:.*?\]/g, '').trim();
        }

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: replyText,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error: any) {
        const fallbackMessage: ChatMessage = {
          role: 'assistant',
          content: FALLBACK_RESPONSES.DEFAULT,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, fallbackMessage]);
        console.error('[Votex Assistant] API error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, diagnosticHistory]
  );

  const handleClearChat = () => {
    if (!isClearConfirm) {
      setIsClearConfirm(true);
      setTimeout(() => setIsClearConfirm(false), 3000);
      return;
    }
    setMessages([]);
    if (user) localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    setIsClearConfirm(false);
  };

  // Loading screen while auth resolves
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto w-full px-4 py-4">

      {/* Top status bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-3 px-4 py-2.5 glass-card rounded-2xl"
      >
        {/* Left: Bot identity */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-base shadow-lg shadow-indigo-900/40 border border-indigo-500/30">
              🧠
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0B0B0F] ${isLoading ? 'bg-yellow-400' : 'bg-emerald-400'} ${!isLoading ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none tracking-tight">
              Votex Therapeutic AI
            </h1>
            <p className={`text-[10px] mt-0.5 font-medium uppercase tracking-wider ${isLoading ? 'text-yellow-400/80' : 'text-emerald-400/80'}`}>
              {isLoading ? 'Thinking...' : 'Online · Gemini Powered'}
            </p>
          </div>
        </div>

        {/* Right: Session info + controls */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[9px] text-gray-600 uppercase font-semibold tracking-widest">Session</div>
            <div className="text-xs font-mono text-gray-400">{formatTime(sessionTime)}</div>
          </div>

          {messages.length > 0 && (
            <motion.button
              id="clear-chat-btn"
              onClick={handleClearChat}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                isClearConfirm
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-white/[0.04] text-gray-500 border border-white/[0.07] hover:text-red-400 hover:bg-red-500/10'
              }`}
            >
              {isClearConfirm ? 'Confirm clear?' : 'Clear chat'}
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Disclaimer banner */}
      <AnimatePresence>
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl">
              <span className="text-amber-400 text-base shrink-0">⚠️</span>
              <p className="text-[11px] text-amber-300/80 leading-snug">
                <strong className="font-semibold">Disclaimer:</strong> This AI assistant is not a licensed medical professional. For emergencies, please call a crisis helpline.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="flex-1 flex flex-col min-h-0 overflow-hidden glass-card rounded-3xl"
      >
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          userName={user.full_name}
          onSuggestion={handleSend}
        />
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </motion.div>
    </div>
  );
}
