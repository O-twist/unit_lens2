import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mic, 
  ArrowLeft, 
  MessageSquare, 
  Volume2, 
  Languages, 
  Camera, 
  Loader2, 
  Play, 
  RefreshCw,
  Hand,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { useMediaPipeHands } from "../hooks/useMediaPipeHands";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { SALanguage, LANGUAGES } from "../types";
import { translateText, getSmartResponse, getAvatarResponse, interpretSign, generateSign as generateSignService } from "../services/geminiService";

import { AIAvatar } from "../components/AIAvatar";

export default function SpeechHearing() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [mode, setMode] = useState<"sign-to-text" | "voice-to-sign">("sign-to-text");
  const [lang, setLang] = useState<SALanguage>("en-ZA");
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretedText, setInterpretedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isGeneratingSign, setIsGeneratingSign] = useState(false);
  const [signFrames, setSignFrames] = useState<any[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlayingSign, setIsPlayingSign] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const { results, isLoading: isHandsLoading } = useMediaPipeHands(videoRef);

  // --- Sign to Text Logic ---
  const handleInterpretSign = async () => {
    if (!results || !results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setInterpretedText("No hands detected. Please place your hands in view.");
      return;
    }

    setIsInterpreting(true);
    try {
      // Prepare landmark data for Gemini
      const landmarkData = results.multiHandLandmarks.map((hand, index) => ({
        handIndex: index,
        landmarks: hand.map(l => ({ x: l.x.toFixed(2), y: l.y.toFixed(2), z: l.z.toFixed(2) }))
      }));

      const text = await interpretSign(landmarkData);
      setInterpretedText(text);
      
      // Get a smart response based on the sign
      const { text: smartText, translatedText: translated } = await getAvatarResponse(`The user just signed: "${text}". Acknowledge this and ask if they need anything else.`, lang);
      
      setInterpretedText(smartText);
      if (lang !== "en-ZA") {
        setTranslatedText(translated);
      }
      
      // Speak English first, then translated
      speak(smartText);
      if (lang !== "en-ZA" && translated) {
        setTimeout(() => speak(translated, lang), 2000);
      }
    } catch (error) {
      console.error("Interpretation error:", error);
      setInterpretedText("Error interpreting sign. Please try again.");
    } finally {
      setIsInterpreting(false);
    }
  };

  // --- Voice to Sign Logic ---
  const startVoiceCapture = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(transcript);
      setIsInterpreting(true);
      
      // Get a smart response from Gemini with translation
      const { text, translatedText: translated } = await getAvatarResponse(transcript, lang);
      
      setInterpretedText(text);
      if (lang !== "en-ZA") {
        setTranslatedText(translated);
      }
      
      setIsInterpreting(false);
      
      // Speak English first, then translated
      speak(text);
      if (lang !== "en-ZA" && translated) {
        setTimeout(() => speak(translated, lang), 2000);
      }

      handleGenerateSign(text);
    };
    recognition.start();
  };

  const handleGenerateSign = async (text: string) => {
    if (!text) return;
    setIsGeneratingSign(true);
    setSignFrames([]);
    setCurrentFrameIndex(0);

    try {
      const frames = await generateSignService(text);
      setSignFrames(frames);
      if (frames.length > 0) {
        setIsPlayingSign(true);
      }
    } catch (error) {
      console.error("Sign generation error:", error);
    } finally {
      setIsGeneratingSign(false);
    }
  };

  // --- Animation Loop for Avatar ---
  useEffect(() => {
    if (isPlayingSign && signFrames.length > 0) {
      const interval = setInterval(() => {
        setCurrentFrameIndex(prev => {
          if (prev >= signFrames.length - 1) {
            setIsPlayingSign(false);
            return prev;
          }
          return prev + 1;
        });
      }, 200); // 200ms per frame
      return () => clearInterval(interval);
    }
  }, [isPlayingSign, signFrames]);

  // --- Drawing Logic ---
  const drawHands = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !results) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        // Draw connections
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 2;
        HAND_CONNECTIONS.forEach(([start, end]) => {
          const s = landmarks[start];
          const e = landmarks[end];
          ctx.beginPath();
          ctx.moveTo(s.x * canvas.width, s.y * canvas.height);
          ctx.lineTo(e.x * canvas.width, e.y * canvas.height);
          ctx.stroke();
        });

        // Draw landmarks
        ctx.fillStyle = "#FFFFFF";
        landmarks.forEach(l => {
          ctx.beginPath();
          ctx.arc(l.x * canvas.width, l.y * canvas.height, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    }
  }, [results]);

  useEffect(() => {
    drawHands();
  }, [drawHands]);

  const speak = (text: string, language: SALanguage = "en-ZA") => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#FF00FF]/30 pt-32 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white/40 hover:text-[#FF00FF] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Hub
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FF00FF]/20 border border-[#FF00FF]/40 flex items-center justify-center">
                <Hand className="w-6 h-6 text-[#FF00FF]" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter uppercase">
                Sign<span className="text-[#FF00FF]">Bridge</span>
              </h1>
            </div>
          </div>

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
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#151619] border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-[100]">
                {(Object.keys(LANGUAGES) as SALanguage[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`w-full text-left px-4 py-3 text-xs font-mono uppercase tracking-wider hover:bg-white/5 transition-colors ${
                      lang === l ? "text-[#FF00FF]" : "text-white/60"
                    }`}
                  >
                    {LANGUAGES[l]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
            <button 
              onClick={() => setMode("sign-to-text")}
              className={`px-6 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${
                mode === "sign-to-text" ? "bg-[#FF00FF] text-white" : "text-white/40 hover:text-white"
              }`}
            >
              Sign to Text
            </button>
            <button 
              onClick={() => setMode("voice-to-sign")}
              className={`px-6 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${
                mode === "voice-to-sign" ? "bg-[#FF00FF] text-white" : "text-white/40 hover:text-white"
              }`}
            >
              Voice to Sign
            </button>
          </div>
        </div>
      </div>

      {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section (Camera or Voice) */}
          <div className="space-y-6">
            <div className="relative aspect-video rounded-[32px] overflow-hidden border border-white/10 bg-black shadow-2xl">
              {mode === "sign-to-text" ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover opacity-40"
                  />
                  <canvas 
                    ref={canvasRef} 
                    width={640} 
                    height={360} 
                    className="absolute inset-0 w-full h-full"
                  />
                  <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                    <div className={`w-2 h-2 rounded-full ${isHandsLoading ? "bg-yellow-500" : "bg-green-500"} animate-pulse`} />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/60">
                      {isHandsLoading ? "Loading Engine..." : "Camera Active"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-8 bg-gradient-to-br from-[#151619] to-black">
                  <motion.div 
                    animate={isListening ? { scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className={`w-24 h-24 rounded-full flex items-center justify-center border-2 ${
                      isListening ? "border-[#FF00FF] bg-[#FF00FF]/20" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <Mic className={`w-10 h-10 ${isListening ? "text-[#FF00FF]" : "text-white/40"}`} />
                  </motion.div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">Voice Capture</h3>
                    <p className="text-sm text-white/40 max-w-xs">
                      Speak clearly in English or Zulu. The AI will translate your words into SASL.
                    </p>
                  </div>
                  <Button 
                    onClick={startVoiceCapture}
                    disabled={isListening}
                    className="bg-[#FF00FF] hover:bg-[#D000D0]"
                  >
                    {isListening ? "Listening..." : "Start Recording"}
                  </Button>
                </div>
              )}
            </div>

            {/* Controls & Output */}
            <div className="p-8 bg-[#151619] rounded-[32px] border border-white/5 space-y-6">
              {mode === "sign-to-text" ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-mono uppercase tracking-widest text-white/40">Interpretation Output</h3>
                    <Sparkles className="w-4 h-4 text-[#FF00FF]" />
                  </div>
                  <div className="min-h-[100px] flex flex-col items-center justify-center text-center space-y-4">
                    {isInterpreting ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-[#FF00FF] animate-spin" />
                        <p className="text-sm font-mono text-white/40 uppercase tracking-widest">Analyzing SASL Patterns...</p>
                      </div>
                    ) : (
                      <>
                        <p className={`text-4xl font-black tracking-tighter uppercase ${interpretedText ? "text-white" : "text-white/10"}`}>
                          {interpretedText || "Perform a sign..."}
                        </p>
                        {translatedText && lang !== "en-ZA" && (
                          <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xl font-bold text-[#FF00FF]"
                          >
                            {isTranslating ? "Translating..." : translatedText}
                          </motion.p>
                        )}
                      </>
                    )}
                  </div>
                  <Button 
                    onClick={handleInterpretSign}
                    disabled={isInterpreting || isHandsLoading}
                    className="w-full h-16 text-lg"
                  >
                    Interpret Current Gesture
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-mono uppercase tracking-widest text-white/40">Spoken Text</h3>
                    <MessageSquare className="w-4 h-4 text-[#FF00FF]" />
                  </div>
                  <div className="min-h-[100px] flex items-center justify-center text-center">
                    <p className={`text-2xl font-bold ${voiceText ? "text-white" : "text-white/10"}`}>
                      {voiceText || "Your words will appear here..."}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <input 
                      type="text" 
                      value={voiceText}
                      onChange={(e) => setVoiceText(e.target.value)}
                      placeholder="Type a word to sign..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-6 font-mono text-sm focus:outline-none focus:border-[#FF00FF]/50"
                    />
                    <Button 
                      onClick={() => handleGenerateSign(voiceText)}
                      disabled={isGeneratingSign || !voiceText}
                      className="bg-white/10 hover:bg-white/20 border border-white/10"
                    >
                      {isGeneratingSign ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Output Section (Avatar or Info) */}
          <div className="space-y-6">
            <div className="relative aspect-video">
              <AIAvatar 
                landmarks={signFrames[currentFrameIndex]} 
                isGenerating={isGeneratingSign} 
                isThinking={isGeneratingSign || isInterpreting}
              />
              
              <div className="absolute bottom-8 right-8 z-30 flex gap-2">
                <button 
                  onClick={() => setIsPlayingSign(true)}
                  disabled={signFrames.length === 0}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-20"
                >
                  <Play className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => { setSignFrames([]); setVoiceText(""); }}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-[#151619] rounded-3xl border border-white/5 space-y-3">
                <Volume2 className="w-5 h-5 text-[#FF00FF]" />
                <h4 className="text-xs font-bold uppercase">Voice Synthesis</h4>
                <p className="text-[10px] text-white/30 leading-relaxed">Interpreted signs are automatically read aloud for non-signers.</p>
              </div>
              <div className="p-6 bg-[#151619] rounded-3xl border border-white/5 space-y-3">
                <Languages className="w-5 h-5 text-[#FF00FF]" />
                <h4 className="text-xs font-bold uppercase">SASL Optimized</h4>
                <p className="text-[10px] text-white/30 leading-relaxed">Trained on South African Sign Language regional variations.</p>
              </div>
            </div>

            <div className="p-8 bg-gradient-to-br from-[#FF00FF]/10 to-transparent rounded-[32px] border border-[#FF00FF]/20">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#FF00FF] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold">Neural Translation</h4>
                  <p className="text-sm text-white/50 leading-relaxed">
                    SignBridge uses Gemini 3 Flash to understand the spatial relationships of hand landmarks, providing context-aware translations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
