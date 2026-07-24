'use client';

import { useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MessageBubble from './MessageBubble';
import type { ChatMessage } from '../../lib/gemini';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  userName?: string;
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  { emoji: '😰', text: "I'm feeling anxious" },
  { emoji: '😴', text: "I can't sleep" },
  { emoji: '😓', text: "I'm feeling stressed" },
  { emoji: '😔', text: "I feel low today" },
  { emoji: '💭', text: "I keep overthinking" },
  { emoji: '🧘', text: "Teach me to breathe" },
];

export default function ChatWindow({ messages, isLoading, userName, onSuggestion }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5" id="chat-messages-container">
      <AnimatePresence initial={false}>
        {messages.length === 0 ? (
          /* Empty state welcome screen */
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center h-full text-center px-4 pt-8 pb-4 space-y-6"
          >
            {/* Animated orb */}
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/25 flex items-center justify-center text-4xl shadow-2xl shadow-indigo-900/30"
            >
              🧠
            </motion.div>

            <div>
              <h2 className="text-xl font-semibold text-white">
                {userName ? `Hello, ${userName.split(' ')[0]}` : 'Welcome'}
              </h2>
              <p className="text-sm text-gray-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                This is a confidential, safe space. Share how you're feeling and I'll offer supportive guidance.
              </p>
            </div>

            {/* Quick suggestion chips */}
            <div className="w-full max-w-md">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-3">
                Quick start
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    id={`suggestion-btn-${i}`}
                    onClick={() => onSuggestion(s.text)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-gray-300 hover:text-indigo-300 hover:border-indigo-500/35 hover:bg-indigo-500/[0.06] transition-all"
                  >
                    <span>{s.emoji}</span>
                    {s.text}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} userName={userName} />
            ))}
          </>
        )}

        {/* Typing indicator */}
        {isLoading && (
          <motion.div
            key="typing"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="flex justify-start items-end gap-2.5"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-[11px] mb-1 shrink-0 shadow-lg shadow-indigo-900/40 border border-indigo-500/30">
              🧠
            </div>
            <div className="px-4 py-3.5 rounded-2xl rounded-bl-md bg-white/[0.05] border border-white/[0.08] flex gap-1.5 items-center backdrop-blur-sm">
              {[0, 0.2, 0.4].map((delay, i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.9, delay, ease: 'easeInOut' }}
                  className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                />
              ))}
              <span className="text-[10px] text-gray-600 ml-1">thinking...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={messagesEndRef} />
    </div>
  );
}
