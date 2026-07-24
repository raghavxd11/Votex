'use client';
import { useState, useEffect, useRef } from 'react';
import EmotionMeter from '../../components/EmotionMeter';
import { EmotionWaveformVisualizer } from '../../components/EmotionWaveformVisualizer';
import AudioVisualizer from '../../components/AudioVisualizer';
import AcousticPulseSphere from '../../components/AcousticPulseSphere';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [text, setText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  // Voice recording / STT state
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isProcessingFinal, setIsProcessingFinal] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const leftChannelRef = useRef<Float32Array[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number>(0);
  const committedTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  // Live preview state
  const [liveEmotions, setLiveEmotions] = useState({
    sad: 0.1, fear: 0.1, happy: 0.1, anger: 0.1, surprise: 0.1, neutral: 0.5, disgust: 0.1
  });
  const [liveRisk, setLiveRisk] = useState(0);
  const hasMeaningfulSignal = Boolean(text.trim() || interimText.trim() || audioFile);
  const spokenText = `${text} ${interimText}`.trim();
  const spokenWordCount = spokenText ? spokenText.split(/\s+/).filter(Boolean).length : 0;
  const speechDensity = Math.min(1, spokenWordCount / 18);
  
  useEffect(() => {
    if (!text && !isListening) {
      setLiveEmotions({ sad: 0.1, fear: 0.1, happy: 0.1, anger: 0.1, surprise: 0.1, neutral: 0.5, disgust: 0.1 });
      setLiveRisk(0); // idle baseline
      return;
    }
    const txt = text.toLowerCase();
    
    // Advanced Lexicon matching synchronized with backend logic
    const countMatches = (words: string[]) => words.reduce((acc, word) => acc + (txt.match(new RegExp(`\\b${word}`, 'g')) || []).length, 0);
    
    const sadMatches = countMatches(['sad', 'depress', 'lonely', 'hopeless', 'worthless', 'cry', 'miserable', 'suicide', 'die', 'death']);
    const fearMatches = countMatches(['fear', 'anxious', 'scared', 'panic', 'worried', 'nervous', 'terrified', 'suicide', 'die', 'death']);
    const angerMatches = countMatches(['ang', 'mad', 'hate', 'frustrat', 'rage', 'annoy']);
    const disgustMatches = countMatches(['disgust', 'bad', 'gross', 'awful', 'terrible', 'sick']);
    const happyMatches = countMatches(['happy', 'good', 'great', 'joy', 'glad', 'excit']);
    const surpriseMatches = countMatches(['!', 'wow', 'sudden', 'shock']);
    const reassuranceMatches = countMatches(['can manage', 'rest tonight', 'feeling okay', 'calm', 'steady', 'doing fine', 'manageable', 'mostly fine', 'routine stress', 'deadline', 'deadlines', 'minor worries', 'nothing serious', 'not serious', 'small worries', 'quiet', 'neutral']);
    const moderatePatternMatch = /\b(overwhelmed|cannot\s+switch\s+my\s+mind\s+off|can'?t\s+switch\s+my\s+mind\s+off|mind\s+won'?t\s+stop|cannot\s+turn\s+my\s+mind\s+off|can'?t\s+turn\s+my\s+mind\s+off|can'?t\s+switch\s+off|cannot\s+switch\s+off)\b/.test(txt);
    
    // Semantic weight multiplier
    const w = 0.15;
    let sad = 0.05 + (sadMatches * w);
    let fear = 0.05 + (fearMatches * w);
    let anger = 0.05 + (angerMatches * w);
    let disgust = 0.05 + (disgustMatches * w);
    let happy = 0.1 + (happyMatches * w);
    let surprise = 0.05 + (surpriseMatches * w);
    let neutral = 0.5;
    const hasSuicidalIntent = /\b(suicid|kill myself|end my life|ending my life|die|death|want to die|can't go on)\b/.test(txt);

    if (hasSuicidalIntent) {
      fear += 0.35;
      sad += 0.15;
      happy *= 0.2;
      neutral *= 0.4;
    }

    const benignWorkloadMatch = /\b(mostly\s+fine|routine\s+stress|deadlines?|minor\s+worries?|nothing\s+serious|not\s+serious|small\s+worries?|not\s+happy\s+or\s+sad|just\s+neutral|neutral\s+and\s+quiet|quiet\s+and\s+neutral)\b/.test(txt);

    if (reassuranceMatches > 0 || benignWorkloadMatch) {
      neutral += 0.2 + (reassuranceMatches * 0.1);
      happy += 0.1;
      sad *= 0.65;
      fear *= 0.7;
      anger *= 0.75;
      disgust *= 0.8;
    }

    if (moderatePatternMatch) {
      fear += 0.35;
      sad += 0.2;
      neutral *= 0.8;
    }

    // Simulate audio stress integration
    if (isListening) {
       fear += 0.15;
       anger += 0.05;
       sad += 0.05;
    }

    // Softmax-like normalization for precise frontend accuracy
    const exps = [sad, fear, anger, disgust, happy, surprise, neutral].map(v => Math.exp(v * 2.0));
    const totalExp = exps.reduce((a, b) => a + b, 0);
    
    const [nSad, nFear, nAnger, nDisgust, nHappy, nSurprise, nNeutral] = exps.map(v => v / totalExp);
    
    // Sync risk calculation with normalized distress sum
    const neutralOverride = /\b(not\s+happy\s+or\s+sad|just\s+neutral|neutral\s+and\s+quiet|quiet\s+and\s+neutral)\b/.test(txt);
    const reassuranceBoost = reassuranceMatches > 0 ? 24 : 0;
    const workloadBoost = benignWorkloadMatch ? 18 : 0;
    const riskScore = hasSuicidalIntent
      ? 98
      : neutralOverride
        ? 10
        : moderatePatternMatch
          ? 50
          : Math.min(100, Math.max(0, ((nSad + nFear + nAnger + nDisgust) * 100) * 1.15 + (isListening ? 6 : 0) - reassuranceBoost - workloadBoost));

    setLiveEmotions({ sad: nSad, fear: nFear, happy: nHappy, anger: nAnger, surprise: nSurprise, neutral: nNeutral, disgust: nDisgust });
    setLiveRisk(riskScore);
  }, [text, isListening]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Initialize Speech Recognition (Text only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) final += transcript + ' ';
            else interim += transcript;
          }
          if (final) {
            committedTranscriptRef.current = `${committedTranscriptRef.current} ${final}`.trim();
          }
          interimTranscriptRef.current = interim.trim();
          const liveTranscript = `${committedTranscriptRef.current} ${interimTranscriptRef.current}`.trim();
          setText(liveTranscript);
          setInterimText(interim);
        };

        recognition.onerror = (e: any) => {
          console.error("STT Error:", e);
          stopRecording();
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const startRecording = async () => {
    try {
      setResult(null);
      committedTranscriptRef.current = text.trim();
      interimTranscriptRef.current = '';
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      leftChannelRef.current = [];

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const inputData = e.inputBuffer.getChannelData(0);
        leftChannelRef.current.push(new Float32Array(inputData));
      };

      source.connect(analyser);
      source.connect(processor);
      processor.connect(audioCtx.destination);
      
      recognitionRef.current?.start();
      setIsListening(true);
    } catch (err) {
      console.error("Mic access failed:", err);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (!isListening) return;

    // Persist the latest live transcript immediately at stop.
    const liveFinal = `${committedTranscriptRef.current} ${interimTranscriptRef.current}`.trim();
    committedTranscriptRef.current = liveFinal;
    setText(liveFinal);

    // Stop STT
    recognitionRef.current?.stop();
    
    // Stop Mono WAV Capture
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Encode to WAV
    const buffer = flattenArray(leftChannelRef.current);
    const wavBlob = encodeWAV(buffer, 44100); // Most browsers use 44.1k or 48k context
    const file = new File([wavBlob], "recording.wav", { type: 'audio/wav' });
    
    setAudioFile(file);
    setIsListening(false);
    setInterimText('');
    interimTranscriptRef.current = '';

  };

  const flattenArray = (channelData: Float32Array[]) => {
    const length = channelData.reduce((acc, curr) => acc + curr.length, 0);
    const result = new Float32Array(length);
    let offset = 0;
    for (const chunk of channelData) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  };

  const encodeWAV = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 32 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([view], { type: 'audio/wav' });
  };

  const handleAnalyzeClick = () => {
    if (isListening) {
      // Never auto-submit while recording. Stop first so user can review/correct transcript.
      stopRecording();
      return;
    }
    executeAnalysis(audioFile);
  };

  const executeAnalysis = async (currentAudio: File | null) => {
    if (!currentAudio && !docFile && !text.trim()) {
      alert("Please provide voice input, clinical text, or a medical record.");
      setIsProcessingFinal(false);
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('text', text);
    if (currentAudio) formData.append('audio', currentAudio);
    if (docFile) formData.append('document', docFile);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/v1/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Server Error");
      }
      setResult(await res.json());
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
      setIsProcessingFinal(false);
    }
  };

  if (authLoading || !user) return <div className="p-10 text-center animate-pulse">Loading Identity...</div>;

  return (
    <div className="flex flex-col items-center px-4 py-8 w-full max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">Votex AI</h1>
        <p className="text-gray-500 text-sm">Advanced Multimodal Distress Assessment</p>
      </div>

      {/* --- PREMIUM BIO-FEEDBACK LAYER --- */}
      <div className={`fixed inset-0 pointer-events-none transition-colors duration-1000 opacity-20 blur-[120px] ${
        liveRisk < 30 ? 'bg-emerald-500/10' : 
        liveRisk < 70 ? 'bg-amber-500/10' : 
        liveRisk < 90 ? 'bg-red-500/10' :
        'bg-red-500/20'
      }`} />

      {/* Main Container */}
      <div className="relative z-10 glass-card rounded-[2.5rem] border-white/5 p-8 md:p-10 shadow-2xl backdrop-blur-2xl space-y-10 w-full">
        
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
                <svg width="60" height="30" viewBox="0 0 60 30" className="opacity-40">
                    <path d="M0 15 L10 15 L15 5 L25 25 L30 15 L40 15 L45 10 L50 20 L60 15" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400" />
                </svg>
            </div>
            <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Votex Diagnosis</h2>
                <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">Multi-modal fusion engine active</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all duration-500 ${
              liveRisk < 30 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
              liveRisk < 70 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
              liveRisk < 90 ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              'bg-red-500/20 text-red-300 border-red-500/40'
            }`}>
              {liveRisk < 30 ? 'IDLE' : liveRisk < 70 ? 'LIVE SIGNAL' : liveRisk < 90 ? 'ELEVATED DISTRESS' : 'CRISIS'}
            </div>
          </div>
        </div>

        {/* --- Phase 1: Dynamic Bio-feedback Core --- */}
        <div className="flex flex-col items-center">
          <AcousticPulseSphere
            isListening={isListening}
            riskScore={liveRisk}
            hasSignal={hasMeaningfulSignal}
            analyserRef={analyserRef}
              speechDensity={speechDensity}
            onToggleRecording={isListening ? stopRecording : startRecording}
          />
            
            {isListening && interimText && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md text-center mt-4"
                >
                    <p className="text-sm text-indigo-300/80 font-medium leading-relaxed italic">
                        "{interimText}"
                    </p>
                </motion.div>
            )}
        </div>

        {/* Text and Document Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Text Area */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-indigo-500" />
                    Clinical Transcription / Observations
                </label>
                {text && <button onClick={() => { setText(''); committedTranscriptRef.current = ''; interimTranscriptRef.current = ''; }} className="text-[10px] text-red-400 hover:underline font-bold uppercase tracking-tighter">Reset</button>}
              </div>
              <textarea
                className="w-full bg-black/40 border border-white/5 rounded-3xl p-5 text-sm text-gray-200 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all resize-none h-40 shadow-inner"
                placeholder="Diagnostic signals appearing from voice... or type clinical notes manually."
                value={text}
                onChange={(e) => {
                  const value = e.target.value;
                  setText(value);
                  committedTranscriptRef.current = value;
                }}
              />
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Voice transcript can mis-hear words. Review and edit this text before running diagnosis to preserve exact wording.
              </p>
            </div>

            {/* Right Column: File & Action */}
            <div className="flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-indigo-500" />
                        Supplemental Medical Record
                    </label>
                    <div className="relative group">
                        <input
                            type="file"
                            id="doc-upload"
                            accept=".pdf"
                            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                            className="hidden"
                        />
                        <label 
                            htmlFor="doc-upload"
                            className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
                                docFile ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-white/20'
                            }`}
                        >
                            <span className="text-xl mb-1">{docFile ? '📄' : '📤'}</span>
                            <span className="text-[10px] font-bold text-gray-400 text-center px-4 truncate max-w-full">
                                {docFile ? docFile.name : 'Click to attach PDF record'}
                            </span>
                        </label>
                    </div>
                </div>

                <button
                    onClick={handleAnalyzeClick}
                    disabled={loading || isProcessingFinal}
                    className="group relative w-full h-16 rounded-3xl overflow-hidden shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-700 transition-transform group-hover:scale-105" />
                    <div className="relative flex items-center justify-center gap-3">
                        <span className="text-white font-black text-sm uppercase tracking-[0.2em]">
                            {loading || isProcessingFinal ? 'Processing Signals...' : 'Execute Full Diagnosis'}
                        </span>
                        {!(loading || isProcessingFinal) && <span className="text-white/50 group-hover:translate-x-1 transition-transform">→</span>}
                    </div>
                    {loading && (
                        <motion.div 
                            className="absolute bottom-0 left-0 h-1 bg-white/40"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2 }}
                        />
                    )}
                </button>
            </div>
        </div>
      </div>

      {result && (
        <div className="w-full animate-fade-up">
          <EmotionMeter data={result} />
        </div>
      )}
    </div>
  );
}
