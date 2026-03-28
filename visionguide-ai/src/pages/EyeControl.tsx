import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Eye, Zap, MousePointer2, ShieldCheck, Camera, CameraOff, CheckCircle2, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Languages } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { useSpeech } from "../hooks/useSpeech";
import { SALanguage, LANGUAGES } from "../types";
import { translateText } from "../services/geminiService";

type HeadDirection = "Center" | "Left" | "Right" | "Up" | "Down";

export default function EyeControl() {
  const navigate = useNavigate();
  const { speak } = useSpeech();
  const [lang, setLang] = useState<SALanguage>("en-ZA");
  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState<"Camera Off" | "Tracking Active">("Camera Off");
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [headDirection, setHeadDirection] = useState<HeadDirection>("Center");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 }); // Percentage
  const videoRef = useRef<HTMLVideoElement>(null);

  const navButtons = [
    { label: "Go to Home", path: "/" },
    { label: "Open Visual Assistance", path: "/vision" },
    { label: "Open Speech & Hearing", path: "/speech-hearing" },
    { label: "About SignBridge", path: "/about" },
  ];

  // Voice feedback helper
  const announce = useCallback(async (text: string) => {
    speak(text);
    if (lang !== "en-ZA") {
      const translated = await translateText(text, lang);
      setTimeout(() => speak(translated, lang), 1500);
    }
  }, [lang, speak]);

  const handleBlink = useCallback(() => {
    setBlinkDetected(true);
    setTimeout(() => setBlinkDetected(false), 300);

    if (!isCalibrated) {
      setCalibrationStep((prev) => {
        const next = prev + 1;
        if (next >= 2) {
          setIsCalibrated(true);
          announce("Calibration complete. Eye tracking active.");
        } else {
          announce(`Step ${next} of 2. Blink again.`);
        }
        return next;
      });
      return;
    }

    if (isTracking) {
      const targetButton = navButtons[focusedIndex];
      announce(`Navigating to ${targetButton.label}`);
      setTimeout(() => {
        navigate(targetButton.path);
      }, 500);
    }
  }, [isCalibrated, isTracking, focusedIndex, announce, navigate]);

  const toggleTracking = async () => {
    if (isTracking) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setIsTracking(false);
      setStatus("Camera Off");
      announce("Eye tracking disabled.");
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setStream(newStream);
        setIsTracking(true);
        setStatus("Tracking Active");
        announce("Eye tracking enabled. Please calibrate by blinking twice.");
      } catch (err) {
        console.error("Error accessing webcam:", err);
        announce("Error accessing camera. Please check permissions.");
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTracking) return;

      switch (e.key.toLowerCase()) {
        case "b":
          handleBlink();
          break;
        case "arrowleft":
          setHeadDirection("Left");
          announce("Head moved Left");
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          setCursorPos(prev => ({ ...prev, x: Math.max(0, prev.x - 5) }));
          break;
        case "arrowright":
          setHeadDirection("Right");
          announce("Head moved Right");
          setFocusedIndex((prev) => (prev < navButtons.length - 1 ? prev + 1 : prev));
          setCursorPos(prev => ({ ...prev, x: Math.min(100, prev.x + 5) }));
          break;
        case "arrowup":
          setHeadDirection("Up");
          announce("Head moved Up");
          window.scrollBy({ top: -150, behavior: "smooth" });
          setCursorPos(prev => ({ ...prev, y: Math.max(0, prev.y - 5) }));
          break;
        case "arrowdown":
          setHeadDirection("Down");
          announce("Head moved Down");
          window.scrollBy({ top: 150, behavior: "smooth" });
          setCursorPos(prev => ({ ...prev, y: Math.min(100, prev.y + 5) }));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(e.key.toLowerCase())) {
        setHeadDirection("Center");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isTracking, handleBlink, navButtons.length]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#00FFFF]/30 pt-32 pb-20 px-6 overflow-x-hidden">
      {/* Gaze Cursor Simulation */}
      {isTracking && isCalibrated && (
        <motion.div 
          animate={{ x: `${cursorPos.x}vw`, y: `${cursorPos.y}vh` }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="fixed top-0 left-0 w-8 h-8 pointer-events-none z-[9999]"
        >
          <div className="relative w-full h-full">
            <div className="absolute inset-0 bg-[#00FFFF]/20 rounded-full blur-md" />
            <div className="absolute inset-2 border-2 border-[#00FFFF] rounded-full" />
            <div className="absolute inset-[40%] bg-[#00FFFF] rounded-full shadow-[0_0_10px_#00FFFF]" />
          </div>
        </motion.div>
      )}

      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white/40 hover:text-[#00FFFF] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Terminal
          </Link>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-white/5 border-white/10 text-white/60 hover:text-white"
              >
                <Languages className="w-4 h-4 mr-2" />
                {LANGUAGES[lang]}
                <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#151619] border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-[100]">
                {(Object.keys(LANGUAGES) as SALanguage[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`w-full text-left px-4 py-3 text-xs font-mono uppercase tracking-wider hover:bg-white/5 transition-colors ${
                      lang === l ? "text-[#00FFFF]" : "text-white/60"
                    }`}
                  >
                    {LANGUAGES[l]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Info & Controls */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-[#00FFFF]/20 border border-[#00FFFF]/40 flex items-center justify-center">
                <Eye className="w-8 h-8 text-[#00FFFF]" />
              </div>
              <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
                Eye Control <br />
                <span className="text-[#00FFFF]">Navigation</span>
              </h1>
              <p className="text-xl text-white/50 max-w-2xl leading-relaxed">
                Hands-free navigation designed for accessibility. Control the interface using blinks and head movements.
              </p>
            </div>

            <div className="p-8 bg-[#151619] rounded-3xl border border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isTracking ? "bg-[#00FFFF] shadow-[0_0_10px_#00FFFF]" : "bg-white/20"}`} />
                  <span className="font-mono text-sm uppercase tracking-wider">{status}</span>
                </div>
                <Button 
                  onClick={toggleTracking}
                  variant={isTracking ? "outline" : "primary"}
                  className={isTracking ? "border-red-500/50 text-red-500 hover:bg-red-500/10" : "bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80"}
                >
                  {isTracking ? <CameraOff className="w-4 h-4 mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                  {isTracking ? "Disable Tracking" : "Enable Eye Tracking"}
                </Button>
              </div>

              {!isCalibrated && isTracking && (
                <div className="p-4 bg-[#00FFFF]/10 border border-[#00FFFF]/20 rounded-2xl flex items-center gap-4 animate-pulse">
                  <RefreshCw className="w-5 h-5 text-[#00FFFF] animate-spin" />
                  <p className="text-sm font-bold text-[#00FFFF]">
                    CALIBRATION: Press 'B' twice to calibrate blink detection. ({calibrationStep}/2)
                  </p>
                </div>
              )}

              {isCalibrated && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center gap-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <p className="text-sm font-bold text-green-500 uppercase tracking-widest">
                    System Calibrated & Active
                  </p>
                </div>
              )}
            </div>

            {/* Interaction Guide */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-[#00FFFF]">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Blink (Key B)</span>
                </div>
                <p className="text-sm text-white/40">Select / Click focused element</p>
              </div>
              <div className="p-6 bg-[#151619] rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-[#00FFFF]">
                  <MousePointer2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Head (Arrows)</span>
                </div>
                <p className="text-sm text-white/40">Navigate focus and scroll page</p>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Feedback & Camera */}
          <div className="space-y-6 sticky top-32">
            <div className="relative aspect-video bg-black rounded-[40px] overflow-hidden border-2 border-white/10 shadow-2xl group">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover grayscale opacity-60 group-hover:opacity-100 transition-opacity"
              />
              
              {/* Overlay Feedback */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Simulated Face Tracking Box */}
                {isTracking && (
                  <motion.div 
                    animate={{ 
                      x: headDirection === "Left" ? -50 : headDirection === "Right" ? 50 : 0,
                      y: headDirection === "Up" ? -50 : headDirection === "Down" ? 50 : 0,
                    }}
                    className="w-48 h-48 border-2 border-[#00FFFF]/50 rounded-3xl flex items-center justify-center"
                  >
                    <div className="w-2 h-2 bg-[#00FFFF] rounded-full" />
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00FFFF]" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00FFFF]" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00FFFF]" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00FFFF]" />
                  </motion.div>
                )}
              </div>

              {/* Status HUD */}
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                <AnimatePresence>
                  {blinkDetected && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="px-4 py-2 bg-[#00FFFF] text-black font-black text-xs uppercase tracking-[0.2em] rounded-full shadow-[0_0_20px_#00FFFF]"
                    >
                      Blink Detected
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-3">
                  <span className="text-[10px] font-mono text-white/40 uppercase">Direction:</span>
                  <span className="text-[10px] font-mono text-[#00FFFF] uppercase font-bold">{headDirection}</span>
                </div>
              </div>
            </div>

            {/* Sample Interaction Elements */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/30 px-4">Navigation Menu</h3>
              <div className="grid grid-cols-1 gap-3">
                {navButtons.map((btn, idx) => (
                  <motion.div
                    key={btn.label}
                    animate={{ 
                      scale: focusedIndex === idx ? 1.02 : 1,
                      x: focusedIndex === idx ? 10 : 0
                    }}
                    className={`p-6 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                      focusedIndex === idx 
                        ? "bg-[#00FFFF]/10 border-[#00FFFF] shadow-[0_0_30px_rgba(0,255,255,0.1)]" 
                        : "bg-[#151619] border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        focusedIndex === idx ? "bg-[#00FFFF] text-black" : "bg-white/5 text-white/40"
                      }`}>
                        {idx === 0 && <ShieldCheck className="w-5 h-5" />}
                        {idx === 1 && <Eye className="w-5 h-5" />}
                        {idx === 2 && <Zap className="w-5 h-5" />}
                        {idx === 3 && <ArrowLeft className="w-5 h-5" />}
                      </div>
                      <span className={`text-lg font-bold transition-colors ${
                        focusedIndex === idx ? "text-[#00FFFF]" : "text-white/60"
                      }`}>
                        {btn.label}
                      </span>
                    </div>
                    {focusedIndex === idx && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#00FFFF] uppercase animate-pulse">Ready to Blink</span>
                        <ChevronRight className="w-5 h-5 text-[#00FFFF]" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Technical Note */}
        <div className="p-12 bg-[#151619] rounded-[40px] border border-white/5">
          <div className="max-w-3xl mx-auto space-y-6 text-center">
            <h2 className="text-2xl font-bold uppercase tracking-tighter">Implementation Roadmap</h2>
            <p className="text-white/40 leading-relaxed">
              This prototype simulates AI-driven navigation. In a production environment, we would integrate 
              <span className="text-white"> MediaPipe Face Mesh</span> or <span className="text-white">TensorFlow.js</span> to 
              perform real-time landmark detection.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="space-y-2">
                <h4 className="text-[#00FFFF] font-bold text-sm">Landmark Detection</h4>
                <p className="text-xs text-white/30">Track 468+ facial landmarks to determine eye aspect ratio (EAR) for blink detection.</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-[#00FFFF] font-bold text-sm">Head Pose Estimation</h4>
                <p className="text-xs text-white/30">Calculate pitch, yaw, and roll from face landmarks to determine head direction.</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-[#00FFFF] font-bold text-sm">Gaze Prediction</h4>
                <p className="text-xs text-white/30">Use eye-region crops and neural networks to predict screen coordinates of the user's gaze.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Directional Indicators (Visual Only) */}
      <div className="fixed bottom-8 right-8 flex flex-col items-center gap-2 pointer-events-none opacity-20">
        <ChevronUp className={`w-8 h-8 ${headDirection === "Up" ? "text-[#00FFFF] opacity-100" : "text-white"}`} />
        <div className="flex gap-2">
          <ChevronLeft className={`w-8 h-8 ${headDirection === "Left" ? "text-[#00FFFF] opacity-100" : "text-white"}`} />
          <div className="w-8 h-8 rounded-full border-2 border-white/20" />
          <ChevronRight className={`w-8 h-8 ${headDirection === "Right" ? "text-[#00FFFF] opacity-100" : "text-white"}`} />
        </div>
        <ChevronDown className={`w-8 h-8 ${headDirection === "Down" ? "text-[#00FFFF] opacity-100" : "text-white"}`} />
      </div>
    </div>
  );
}
