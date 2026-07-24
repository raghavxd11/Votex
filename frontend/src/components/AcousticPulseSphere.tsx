'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, type RefObject } from 'react';

interface Props {
  isListening: boolean;
  riskScore: number;
  hasSignal?: boolean;
  analyserRef?: RefObject<AnalyserNode | null>;
  onToggleRecording?: () => void;
  speechDensity?: number;
}

export default function AcousticPulseSphere({
  isListening,
  riskScore,
  hasSignal = false,
  analyserRef,
  onToggleRecording,
  speechDensity = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isListening || !canvasRef.current || !analyserRef?.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(analyser.frequencyBinCount);

    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      analyser.getByteTimeDomainData(dataArray);
      analyser.getByteFrequencyData(freqData);

      const rms = Math.sqrt(
        dataArray.reduce((sum, value) => {
          const normalized = (value - 128) / 128;
          return sum + normalized * normalized;
        }, 0) / dataArray.length
      );

      const spectralPeak = freqData.reduce((peak, value, index) => (value > peak.value ? { value, index } : peak), { value: 0, index: 0 });
      const pitchFactor = Math.min(1, spectralPeak.index / Math.max(freqData.length - 1, 1));
      const paceFactor = Math.min(1, speechDensity);

      const color = '#ef4444';
      const centerY = canvas.height / 2;
      const time = performance.now();

      const amplitude = 18 + rms * 80 + paceFactor * 26 + pitchFactor * 14;
      const frequency = 0.018 + paceFactor * 0.035 + pitchFactor * 0.028;

      // Soft red glow backdrop for the waveform ribbon.
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = color;
      ctx.fillRect(0, centerY - amplitude * 1.35, canvas.width, amplitude * 2.7);
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let i = 0; i < bufferLength; i += 4) {
        const v = (dataArray[i] - 128) / 128;
        const spectrum = freqData[i % freqData.length] / 255;
        const x = (i / bufferLength) * canvas.width;
        const speechPulse = Math.sin((x * frequency) + (time * 0.0015)) * (0.2 + paceFactor * 0.3);
        const wordPulse = Math.sin((x * 0.11) + (speechDensity * 8) + (time * 0.0028)) * (0.08 + paceFactor * 0.12);
        const pitchLift = (spectrum - 0.5) * amplitude * 0.55;
        const y = centerY + (v * amplitude * 0.75) + pitchLift + (speechPulse * amplitude) + (wordPulse * amplitude * 0.9);
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 4.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.stroke();

      // Fill underneath with a subtle gradient for a more natural audio ribbon.
      ctx.lineTo(canvas.width, centerY + amplitude);
      ctx.lineTo(0, centerY + amplitude);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, centerY - amplitude, 0, centerY + amplitude);
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.34)');
      gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.18)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0.04)');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      for (let i = 0; i < bufferLength; i += 48) {
        const v = (dataArray[i] - 128) / 128;
        const x = (i / bufferLength) * canvas.width;
        const spectrum = freqData[i % freqData.length] / 255;
        const speechPulse = Math.sin((x * frequency) + (time * 0.0015)) * (0.2 + paceFactor * 0.3);
        const wordPulse = Math.sin((x * 0.11) + (speechDensity * 8) + (time * 0.0028)) * (0.08 + paceFactor * 0.12);
        const y = centerY + (v * amplitude * 0.75) + ((spectrum - 0.5) * amplitude * 0.55) + (speechPulse * amplitude) + (wordPulse * amplitude * 0.9);
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isListening, riskScore, analyserRef]);

  return (
    <div className={`w-full rounded-[2rem] border backdrop-blur-xl p-5 md:p-6 transition-all duration-300 ${
      isListening
        ? riskScore < 30
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : riskScore < 70
            ? 'bg-amber-500/5 border-amber-500/20'
            : 'bg-red-500/5 border-red-500/20'
        : 'bg-white/[0.03] border-white/10'
    }`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Voice Capture</p>
            <p className="text-sm text-gray-300 mt-1">
              {isListening ? 'Listening to your speech waveform' : 'Click to start voice capture'}
            </p>
          </div>
          <motion.button
            type="button"
            onClick={onToggleRecording}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.02 }}
            className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${
              isListening
                ? 'bg-red-500/15 text-red-300 border-red-500/30'
                : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
            }`}
          >
            {isListening ? 'Stop Voice' : 'Start Voice'}
          </motion.button>
        </div>

        <div className="relative h-24 rounded-2xl bg-black/30 border border-white/5 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={700}
            height={120}
            className={`w-full h-full transition-opacity duration-300 ${isListening ? 'opacity-100' : 'opacity-0'}`}
          />

        </div>

        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] font-bold text-gray-500">
          <span>{isListening ? 'Recording live' : 'Idle'}</span>
        </div>
      </div>

    </div>
  );
}
