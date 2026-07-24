"use client";

import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from 'recharts';

interface EmotionState {
  sad: number;
  fear: number;
  happy: number;
  anger: number;
  surprise: number;
  neutral: number;
  disgust: number;
}

export const XaiRadarChart = ({ emotions }: { emotions: EmotionState }) => {
  const data = [
    { subject: 'Sadness', value: Math.round(emotions.sad * 100), fullMark: 100 },
    { subject: 'Fear', value: Math.round(emotions.fear * 100), fullMark: 100 },
    { subject: 'Anger', value: Math.round(emotions.anger * 100), fullMark: 100 },
    { subject: 'Disgust', value: Math.round(emotions.disgust * 100), fullMark: 100 },
    { subject: 'Surprise', value: Math.round(emotions.surprise * 100), fullMark: 100 },
    { subject: 'Happy', value: Math.round(emotions.happy * 100), fullMark: 100 },
    { subject: 'Neutral', value: Math.round(emotions.neutral * 100), fullMark: 100 },
  ];

  return (
    <div className="w-full h-64 bg-slate-900/50 rounded-xl border border-white/[0.06] shadow-inner p-4 relative">
        <h4 className="absolute top-4 left-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest z-10">Emotional Spectrum Analysis</h4>
        <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'monospace' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Intensity" dataKey="value" stroke="#818cf8" strokeWidth={2} fill="#6366f1" fillOpacity={0.3} />
                <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#818cf8' }}
                />
            </RadarChart>
        </ResponsiveContainer>
    </div>
  );
};

