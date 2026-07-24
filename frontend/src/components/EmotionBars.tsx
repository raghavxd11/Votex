import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmotionState {
  sad: number;
  fear: number;
  happy: number;
  anger: number;
  surprise: number;
  neutral: number;
  disgust: number;
}

const EMOTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  happy:    { label: 'Joy/Happy',  color: 'bg-emerald-400', bg: 'bg-emerald-500/10' },
  surprise: { label: 'Surprise',   color: 'bg-indigo-400',  bg: 'bg-indigo-500/10' },
  neutral:  { label: 'Neutral',    color: 'bg-gray-400',    bg: 'bg-gray-500/10' },
  sad:      { label: 'Sadness',    color: 'bg-blue-400',    bg: 'bg-blue-500/10' },
  fear:     { label: 'Fear',       color: 'bg-purple-400',  bg: 'bg-purple-500/10' },
  disgust:  { label: 'Disgust',    color: 'bg-orange-400',  bg: 'bg-orange-500/10' },
  anger:    { label: 'Anger',      color: 'bg-rose-500',    bg: 'bg-rose-500/10' },
};

export const EmotionBars = ({ emotions }: { emotions: EmotionState }) => {
  const data = Object.entries(emotions)
    .map(([key, val]) => ({
      key,
      ...EMOTION_CONFIG[key],
      value: Math.round(val * 100),
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="w-full h-48 bg-slate-900/50 rounded-xl border border-white/[0.06] flex items-center justify-center p-4">
        <p className="text-gray-500 text-xs my-auto">Analyzing primary emotions...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0B0D17]/80 backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-5 relative overflow-hidden mt-4">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] -z-10 rounded-full" />
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Dynamic Emotion Breakdown
        </h4>
      </div>
      <div className="space-y-3 relative z-10">
        <AnimatePresence>
          {data.map((item, index) => (
            <motion.div
              layout
              key={item.key}
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, delay: index * 0.05, type: "spring", bounce: 0.4 }}
              className={`flex items-center gap-3 p-2 rounded-lg border border-white/[0.03] ${item.bg}`}
            >
              <div className="w-24 shrink-0 flex items-center gap-2">
                <span className="text-[11px] font-bold text-white tracking-wide">{item.label}</span>
              </div>
              <div className="flex-1 h-2.5 bg-black/40 rounded-full overflow-hidden shadow-inner border border-white/[0.02]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 0.8, delay: 0.1 + index * 0.05, ease: "easeOut" }}
                  className={`h-full rounded-full ${item.color} shadow-[0_0_10px_rgba(255,255,255,0.2)]`}
                />
              </div>
              <div className="w-8 shrink-0 text-right">
                <span className="text-[11px] font-mono font-bold text-gray-200">{item.value}%</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
