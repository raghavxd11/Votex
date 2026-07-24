"use client";

import React, { useEffect, useRef } from 'react';

interface EmotionState {
  sad: number;
  fear: number;
  happy: number;
  anger: number;
  surprise: number;
  neutral: number;
  disgust: number;
}

interface WaveformVisualizerProps {
  emotions: EmotionState;
  dynamicRiskScore: number; // 0 to 100
}

export const EmotionWaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ emotions, dynamicRiskScore }) => {
  return (
    <div className="w-full flex-col flex items-center justify-center p-6 bg-slate-900 rounded-xl relative overflow-hidden my-4 border border-slate-700 shadow-2xl">
      <div className="w-full flex justify-between items-start">
        <div className="flex flex-col items-start space-y-1">
          <span className="text-white font-bold text-lg tracking-wide border-b border-white/20 pb-1">
            Dynamic Risk: <span className={dynamicRiskScore > 70 ? "text-red-400" : dynamicRiskScore > 30 ? "text-yellow-400" : "text-blue-400"}>{dynamicRiskScore.toFixed(1)}%</span>
          </span>
          <div className="text-xs text-slate-300 font-mono tracking-tighter uppercase space-y-1 mt-2">
              <p>😞 Sadness  : {(emotions.sad * 100).toFixed(0)}%</p>
              <p>😨 Fear     : {(emotions.fear * 100).toFixed(0)}%</p>
              <p>😡 Anger    : {(emotions.anger * 100).toFixed(0)}%</p>
              <p>🤢 Disgust  : {(emotions.disgust * 100).toFixed(0)}%</p>
              <p>😲 Surprise : {(emotions.surprise * 100).toFixed(0)}%</p>
              <p>😊 Happy    : {(emotions.happy * 100).toFixed(0)}%</p>
              <p>😐 Neutral  : {(emotions.neutral * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
