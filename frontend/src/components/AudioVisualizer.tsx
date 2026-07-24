'use client';
import { useEffect, useRef } from 'react';

export default function AudioVisualizer({ file }: { file: File }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!file || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let offset = 0;
    
    // Smooth generative rendering algorithm mimicking WebAudio Nodes
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      
      for (let i = 0; i < canvas.width; i++) {
        const amplitude = Math.sin((i * 0.05) + offset) * 20;
        ctx.lineTo(i, (canvas.height / 2) + amplitude);
      }
      
      ctx.strokeStyle = '#60a5fa'; // Blue-400 hue
      ctx.lineWidth = 2;
      ctx.stroke();
      
      offset += 0.1;
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [file]);

  return (
    <div className="w-full h-24 bg-gray-900 rounded-lg border border-gray-700 flex items-center justify-center p-2">
      <canvas ref={canvasRef} width={400} height={80} className="w-full h-full opacity-80" />
    </div>
  );
}
