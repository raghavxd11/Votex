'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { XaiRadarChart } from './XaiRadarChart';
import { EmotionBars } from './EmotionBars';
import { HistoricalTrendChart } from './HistoricalTrendChart';

const TIER_COLORS: Record<string, { bar: string; badge: string; badgeBg: string; border: string }> = {
  emerald: { bar: 'from-emerald-500 to-emerald-400', badge: 'text-emerald-400', badgeBg: 'bg-emerald-500/10', border: 'border-emerald-500/15' },
  blue:    { bar: 'from-blue-500 to-blue-400',       badge: 'text-blue-400',    badgeBg: 'bg-blue-500/10',    border: 'border-blue-500/15'    },
  yellow:  { bar: 'from-yellow-500 to-yellow-400',   badge: 'text-yellow-400',  badgeBg: 'bg-yellow-500/10',  border: 'border-yellow-500/15'  },
  orange:  { bar: 'from-orange-500 to-red-400',      badge: 'text-orange-400',  badgeBg: 'bg-orange-500/10',  border: 'border-orange-500/15'  },
  red:     { bar: 'from-red-500 to-rose-500',        badge: 'text-red-400',     badgeBg: 'bg-red-500/10',     border: 'border-red-500/15'     },
};

function getTier(prob: number): string {
  if (prob <= 20) return 'emerald';
  if (prob <= 40) return 'blue';
  if (prob <= 60) return 'yellow';
  if (prob <= 80) return 'orange';
  return 'red';
}

function getSentimentLabel(score: number) {
  if (score > 0.3)  return { label: 'Positive', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (score < -0.3) return { label: 'Negative', color: 'text-red-400',     bg: 'bg-red-500/10'     };
  return { label: 'Neutral', color: 'text-gray-300', bg: 'bg-white/[0.05]' };
}

const RISK_BADGE: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  'Low Risk':    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
  'Medium Risk': { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20',  glow: 'shadow-yellow-500/10'  },
  'High Risk':   { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     glow: 'shadow-red-500/10'     },
};

export default function EmotionMeter({ data }: { data: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'breakdown' | 'acoustics' | 'recommendations'>('breakdown');
  const prob: number = data.distress_probability ?? 0;
  const tier = getTier(prob);
  const colors = TIER_COLORS[tier];
  const riskTier: string = data.risk_tier ?? 'Low Risk';
  const riskColors = RISK_BADGE[riskTier] ?? RISK_BADGE['Low Risk'];

  const hasSentiment = data.text_sentiment_score !== null && data.text_sentiment_score !== undefined;
  const sentiment = hasSentiment ? getSentimentLabel(data.text_sentiment_score) : null;

  // Confidence is model certainty, not risk severity.
  // It combines decisiveness, multimodal signal availability, and consistency between
  // the distress score and the summed distress emotion channels.
  const decisiveness = Math.abs(prob - 50) / 50; // 0 (ambiguous) → 1 (decisive)
  const distressMass = (data.sadness ?? 0) + (data.fear ?? 0) + (data.anger ?? 0) + (data.disgust ?? 0);
  const scoreMassGap = Math.abs((prob / 100) - distressMass);
  const agreement = Math.max(0, 1 - scoreMassGap);
  const hasAudioSignal = (data.energy_variance ?? 0) > 0 || (data.pitch_variability ?? 0) > 0 || (data.spectral_flux ?? 0) > 0;
  const signalCoverage = (hasAudioSignal ? 1 : 0) + (hasSentiment ? 1 : 0);

  const computedConfidence = 55 + (decisiveness * 25) + (agreement * 13) + (signalCoverage * 3.5);
  const confidence = Math.min(98, Math.max(40, computedConfidence));

  return (
    <div className="w-full space-y-6">
      
      {/* ── Header Summary Ribbon ── */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-5">
           <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border-2 ${riskColors.border} ${riskColors.bg} shadow-lg shadow-black/20`}>
              {riskTier === 'Low Risk' ? '🛡️' : riskTier === 'Medium Risk' ? '⚠️' : '🚨'}
           </div>
           <div>
              <h3 className={`text-xl font-black ${riskColors.text} tracking-tight`}>{riskTier}</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-0.5">
                {riskTier === 'Low Risk' ? 'Stability Consensus' : riskTier === 'Medium Risk' ? 'Pre-Clinical Signal' : 'Crisis Protocol Active'}
              </p>
           </div>
        </div>

        <div className="flex gap-8">
            <div className="text-right">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Score</p>
                <p className="text-xl font-black text-white">{prob.toFixed(1)}%</p>
            </div>
            <div className="text-right border-l border-white/5 pl-8">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Confidence</p>
                <p className="text-xl font-black text-indigo-400">{confidence.toFixed(0)}%</p>
              <p className="text-[9px] text-gray-600 font-semibold">Model certainty</p>
            </div>
        </div>
      </div>

      {/* ── Tabbed Navigation ── */}
      <div className="flex gap-2 p-1 rounded-2xl bg-black/40 border border-white/5 max-w-md mx-auto">
         {(['breakdown', 'acoustics', 'recommendations'] as const).map((tab) => (
            <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`flex-1 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
               }`}
            >
               {tab === 'recommendations' ? 'AI Plan' : tab}
            </button>
         ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'breakdown' && (
          <motion.div
            key="breakdown"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="glass-card p-6 rounded-[2rem] border-white/5">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Emotional Fingerprint</p>
                  <XaiRadarChart emotions={{
                    sad: data.sadness ?? 0,
                    fear: data.fear ?? 0,
                    happy: data.joy ?? 0,
                    anger: data.anger ?? 0,
                    surprise: data.surprise ?? 0,
                    neutral: data.neutral ?? 0,
                    disgust: data.disgust ?? 0
                  }} />
               </div>
               <div className="glass-card p-6 rounded-[2rem] border-white/5">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Sentiment Distribution</p>
                  <EmotionBars emotions={{
                    sad: data.sadness ?? 0,
                    fear: data.fear ?? 0,
                    happy: data.joy ?? 0,
                    anger: data.anger ?? 0,
                    surprise: data.surprise ?? 0,
                    neutral: data.neutral ?? 0,
                    disgust: data.disgust ?? 0
                  }} />
               </div>
            </div>
            <div className="glass-card p-6 rounded-[2rem] border-white/5">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Long-term Trajectory</p>
                <HistoricalTrendChart />
            </div>
          </motion.div>
        )}

        {activeTab === 'acoustics' && (
          <motion.div
            key="acoustics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Bio-marker Insights Grid */}
            {(() => {
              const hasAudio = (data.energy_variance ?? 0) > 0 || (data.spectral_flux ?? 0) > 0 || (data.pitch_variability ?? 0) > 0;
              const silenceDisplay = data.silence_ratio != null && !isNaN(data.silence_ratio) ? (data.silence_ratio * 100).toFixed(1) : '—';
              return hasAudio ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {[
                      { label: 'Vocal Tension', value: data.energy_variance?.toFixed(1) || '0.0', unit: 'ev', color: 'text-indigo-400' },
                      { label: 'Pitch Variance', value: data.pitch_variability?.toFixed(1) || '0.0', unit: 'hz', color: 'text-blue-400' },
                      { label: 'Agitation', value: data.spectral_flux?.toFixed(1) || '0.0', unit: 'flux', color: 'text-amber-400' },
                      { label: 'Silence Ratio', value: silenceDisplay, unit: '%', color: 'text-emerald-400' },
                   ].map((marker) => (
                      <div key={marker.label} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                         <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{marker.label}</p>
                         <p className={`text-xl font-black mt-2 ${marker.color}`}>{marker.value}<span className="text-[10px] text-gray-600 ml-1">{marker.unit}</span></p>
                      </div>
                   ))}
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 text-center">
                   <p className="text-2xl mb-2">🎙️</p>
                   <p className="text-sm font-bold text-gray-400">No Audio Provided</p>
                   <p className="text-xs text-gray-600 mt-1">Record or upload audio to see vocal tension, pitch variance, agitation, and silence ratio metrics.</p>
                </div>
              );
            })()}
            

            {/* Weights and Sentiment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Signal Attribution (SHAP)</p>
                    <div className="space-y-4">
                      {[
                        { label: 'Clinical Text',  value: data.shap_text_weight || 0, color: 'bg-indigo-500' },
                        { label: 'Voice Biomarkers', value: data.shap_audio_weight || 0, color: 'bg-blue-500' },
                      ].map((item) => (
                        <div key={item.label}>
                            <div className="flex justify-between text-[10px] font-bold mb-1.5 uppercase tracking-tighter">
                                <span className="text-gray-400">{item.label}</span>
                                <span className="text-white">{(item.value * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.value * 100}%` }}
                                    className={`h-full ${item.color}`}
                                />
                            </div>
                        </div>
                      ))}
                    </div>
                </div>
                <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Sentiment Polarity</p>
                    {sentiment ? (
                        <div className="flex items-baseline gap-2">
                           <span className={`text-3xl font-black ${sentiment.color}`}>{sentiment.label}</span>
                           <span className="text-sm text-gray-600 font-mono">({data.text_sentiment_score.toFixed(2)})</span>
                        </div>
                    ) : <p className="text-gray-500 italic text-sm">No text signals detected.</p>}
                </div>
            </div>

            {/* XAI Explanation */}
            {data.xai_explanation && (
              <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-indigo-400 text-lg">💡</span>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Explainable AI Justification</p>
                </div>
                <div className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-line opacity-80">
                  {data.xai_explanation.replace(/\*\*(.*?)\*\*/g, '$1')}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'recommendations' && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Main Recommendation Card */}
            <div className={`rounded-[2rem] border-2 overflow-hidden ${colors.border} bg-black/20 backdrop-blur-xl shadow-2xl`}>
               {data.image_url && (
                  <div className="h-48 overflow-hidden">
                    <img src={data.image_url} className="w-full h-full object-cover grayscale opacity-40" />
                  </div>
               )}
               <div className="p-8">
                  <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${colors.badge}`}>Clinical Insight</span>
                      <div className={`h-[1px] flex-1 ${colors.badgeBg}`} />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-4">{data.recommendation_title || 'Dynamic Recovery Plan'}</h2>
                  <p className="text-gray-300 leading-relaxed text-sm mb-8">{data.recommendation_body}</p>
                  
                  {/* Action Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <button 
                        onClick={() => router.push('/assistant')}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
                     >
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-xl">🤖</div>
                        <div>
                           <p className="text-[10px] font-black text-white uppercase tracking-widest">Therapeutic AI</p>
                           <p className="text-[9px] text-gray-500">Discuss these results</p>
                        </div>
                     </button>
                     <button className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl">🧘</div>
                        <div>
                           <p className="text-[10px] font-black text-white uppercase tracking-widest">Guided Reset</p>
                           <p className="text-[9px] text-gray-500">60s Mindfulness</p>
                        </div>
                     </button>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
