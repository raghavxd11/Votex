'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  // Re-focus input after bot responds
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <div className="p-4 border-t border-white/[0.06] bg-[#0a0e1a]/60 backdrop-blur-sm">
      <form
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        className="relative flex items-end gap-3"
      >
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            id="chat-input"
            rows={1}
            className="w-full resize-none bg-white/[0.04] border border-white/[0.1] rounded-2xl py-3.5 pl-4 pr-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/30 transition-all shadow-inner leading-snug"
            placeholder={isLoading ? 'Assistant is thinking...' : 'Share how you\'re feeling...'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            style={{ minHeight: '48px', maxHeight: '120px' }}
            aria-label="Message input"
          />
        </div>

        {/* Send Button */}
        <motion.button
          type="submit"
          id="chat-send-btn"
          disabled={!canSend}
          whileHover={{ scale: canSend ? 1.05 : 1 }}
          whileTap={{ scale: canSend ? 0.94 : 1 }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-lg shrink-0 ${
            canSend
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/50'
              : 'bg-white/[0.05] text-gray-600 cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-500 border-t-indigo-400 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </motion.button>
      </form>

      {/* Footer hints */}
      <div className="flex items-center justify-between mt-2.5 px-1">
        <p className="text-[9px] text-gray-600">
          Press <kbd className="font-mono bg-white/[0.06] px-1 rounded text-gray-500">Enter</kbd> to send · <kbd className="font-mono bg-white/[0.06] px-1 rounded text-gray-500">Shift+Enter</kbd> for new line
        </p>
        <div className="flex items-center gap-3">
          <p className="text-[9px] text-gray-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            End-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
