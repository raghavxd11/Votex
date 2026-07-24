'use client';

import { motion } from 'framer-motion';
import type { ChatMessage } from '../../lib/gemini';

interface MessageBubbleProps {
  message: ChatMessage;
  userName?: string;
}

export default function MessageBubble({ message, userName }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const initial = userName?.charAt(0)?.toUpperCase() || 'U';

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Render assistant message with basic markdown: bold (**text**) and line breaks
  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20, y: 8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2.5`}
    >
      {/* Bot Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-[11px] mb-1 shrink-0 shadow-lg shadow-indigo-900/40 border border-indigo-500/30">
          🧠
        </div>
      )}

      {/* Bubble */}
      <div className={`group relative max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-3 text-sm leading-relaxed shadow-md ${
            isUser
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-br-md shadow-indigo-900/40'
              : 'bg-white/[0.05] border border-white/[0.08] text-gray-200 rounded-2xl rounded-bl-md backdrop-blur-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap font-medium">{message.content}</p>
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">{renderContent(message.content)}</p>
          )}
        </div>
        {/* Timestamp */}
        <span className="text-[9px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity px-1">
          {formattedTime}
        </span>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[11px] font-bold text-indigo-300 mb-1 shrink-0 uppercase">
          {initial}
        </div>
      )}
    </motion.div>
  );
}
