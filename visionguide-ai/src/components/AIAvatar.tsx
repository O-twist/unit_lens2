import React, { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { Loader2, Sparkles } from "lucide-react";

interface AIAvatarProps {
  landmarks: any[] | null;
  isGenerating: boolean;
  isThinking?: boolean;
}

export const AIAvatar: React.FC<AIAvatarProps> = ({ landmarks, isGenerating, isThinking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawAvatar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw stylized torso and head
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Torso
    ctx.beginPath();
    ctx.moveTo(centerX - 100, canvas.height);
    ctx.bezierCurveTo(centerX - 80, centerY + 100, centerX + 80, centerY + 100, centerX + 100, canvas.height);
    ctx.fillStyle = "rgba(255, 0, 255, 0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 0, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(centerX, centerY - 60, 45, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 0, 255, 0.1)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 0, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Brain pulsing effect
    if (isThinking) {
      const pulse = Math.sin(Date.now() / 200) * 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY - 60, 30 + pulse, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(0, 255, 0, 0.2)";
      ctx.fill();
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#00FF00";
      ctx.strokeStyle = "#00FF00";
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Eyes (stylized)
    ctx.fillStyle = isThinking ? "#00FF00" : "#FF00FF";
    ctx.beginPath();
    ctx.arc(centerX - 15, centerY - 70, 3, 0, 2 * Math.PI);
    ctx.arc(centerX + 15, centerY - 70, 3, 0, 2 * Math.PI);
    ctx.fill();

    if (isThinking) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00FF00";
      ctx.beginPath();
      ctx.arc(centerX - 15, centerY - 70, 4, 0, 2 * Math.PI);
      ctx.arc(centerX + 15, centerY - 70, 4, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw Hands if landmarks exist
    if (landmarks) {
      // Add glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#FF00FF";

      // Draw connections
      ctx.strokeStyle = "#FF00FF";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      HAND_CONNECTIONS.forEach(([start, end]) => {
        const s = landmarks[start];
        const e = landmarks[end];
        if (s && e) {
          ctx.beginPath();
          ctx.moveTo(s.x * canvas.width, s.y * canvas.height);
          ctx.lineTo(e.x * canvas.width, e.y * canvas.height);
          ctx.stroke();
        }
      });

      // Draw landmarks
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#FFFFFF";
      landmarks.forEach(l => {
        ctx.beginPath();
        ctx.arc(l.x * canvas.width, l.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Reset shadow
      ctx.shadowBlur = 0;
    }
  }, [landmarks, isThinking]);

  useEffect(() => {
    drawAvatar();
  }, [drawAvatar]);

  return (
    <div className="relative w-full h-full bg-black rounded-[32px] overflow-hidden border border-white/10 shadow-2xl">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#FF00FF]/20 via-transparent to-transparent opacity-30" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#FF00FF 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <canvas 
        ref={canvasRef} 
        width={640} 
        height={360} 
        className="absolute inset-0 w-full h-full z-20"
      />

      {/* Overlay Info */}
      <div className="absolute bottom-8 left-8 right-8 z-30 flex items-end justify-between">
        <div className="space-y-1">
          <motion.h3 
            animate={isThinking ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-xl font-bold uppercase tracking-tighter"
          >
            AI Avatar
          </motion.h3>
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">SASL Visualization Engine</p>
        </div>
        
        <AnimatePresence>
          {landmarks && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF00FF]/20 border border-[#FF00FF]/40 backdrop-blur-md"
            >
              <Sparkles className="w-3 h-3 text-[#FF00FF]" />
              <span className="text-[8px] font-mono uppercase tracking-widest text-[#FF00FF]">Active Signing</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Loading States */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="relative">
              <Loader2 className="w-16 h-16 text-[#FF00FF] animate-spin" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-[#FF00FF]/20 blur-xl rounded-full"
              />
            </div>
            <p className="mt-6 text-sm font-mono text-white/60 uppercase tracking-widest animate-pulse">
              Synthesizing Gesture...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!landmarks && !isGenerating && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="opacity-5"
          >
            <Sparkles className="w-32 h-32 text-[#FF00FF]" />
          </motion.div>
        </div>
      )}
    </div>
  );
};
