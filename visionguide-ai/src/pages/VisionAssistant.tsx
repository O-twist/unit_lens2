import { useRef, useState, useEffect } from "react";
import { CameraView } from "../components/CameraView";
import { DetectionOverlay } from "../components/DetectionOverlay";
import { useObjectDetection } from "../hooks/useObjectDetection";
import { useSpeech } from "../hooks/useSpeech";
import { getNavigationInstruction, getAlertColor } from "../utils/navigation";
import type { NavigationResult, AlertLevel } from "../utils/navigation";
import { Loader2, Languages, ChevronDown, ShieldAlert, Navigation, AlertCircle, ArrowLeft, ArrowRight, MoveUp, CircleStop, Eye, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SALanguage, LANGUAGES, TRANSLATIONS } from "../types";
import { translateText } from "../services/geminiService";
import { Button } from "../components/Button";
import { logActivity } from "../services/firebase";

export default function VisionAssistant() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lang, setLang] = useState<SALanguage>("en-ZA");
  const [cameraReady, setCameraReady] = useState(0);
  const { detections, isLoading, fps } = useObjectDetection(videoRef, cameraReady);
  const { speak } = useSpeech(2000, lang);
  const [navResult, setNavResult] = useState<NavigationResult | null>(null);
  const lastSpokenRef = useRef<string | null>(null);

  const t = TRANSLATIONS[lang];

  // Process navigation instructions in real-time
  useEffect(() => {
    if (detections.length > 0 && videoRef.current) {
      const result = getNavigationInstruction(detections, videoRef.current.videoWidth, lang);

      setNavResult(result);

      if (result && result.instruction !== lastSpokenRef.current) {
        // Speak the instruction
        speak(result.instruction);
        lastSpokenRef.current = result.instruction;

        // Log critical alerts to Firebase
        if (result.alertLevel === "critical" || result.alertLevel === "warning") {
          logActivity("vision_alert", {
            instruction: result.instruction,
            alertLevel: result.alertLevel,
            object: result.objectName,
            distance: result.distance,
            position: result.position,
            language: lang,
          });
        }

        // Translate for non-English languages
        if (lang !== "en-ZA") {
          translateText(result.instruction, lang).then(translated => {
            setTimeout(() => speak(translated, lang), 1500);
          }).catch(() => {});
        }
      }
    } else {
      setNavResult(null);
      lastSpokenRef.current = null;
    }
  }, [detections, speak, lang]);

  // Get the directional icon based on the current instruction
  const getDirectionIcon = (result: NavigationResult | null) => {
    if (!result) return null;
    if (result.alertLevel === "critical" && result.position === "center") {
      return <CircleStop className="w-6 h-6" />;
    }
    if (result.instruction.toLowerCase().includes("right") || result.position === "left") {
      return <ArrowRight className="w-6 h-6" />;
    }
    if (result.instruction.toLowerCase().includes("left") || result.position === "right") {
      return <ArrowLeft className="w-6 h-6" />;
    }
    return <MoveUp className="w-6 h-6" />;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[#00FF00]/30 pt-20">
      <main className="pb-12 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase">
              Vision<span className="text-[#00FF00]">Assistant</span>
            </h1>
            <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Real-Time Neural Navigation Engine</p>
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
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#151619] border border-white/10 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-[100]">
                {(Object.keys(LANGUAGES) as SALanguage[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`w-full text-left px-4 py-3 text-xs font-mono uppercase tracking-wider hover:bg-white/5 transition-colors ${lang === l ? "text-[#00FF00]" : "text-white/60"
                      }`}
                  >
                    {LANGUAGES[l]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Camera Section */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative h-[50vh] min-h-[350px] w-full rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-black">
            <CameraView
              videoRef={videoRef}
              onStreamReady={() => setCameraReady(prev => prev + 1)}
            />
            <DetectionOverlay detections={detections} videoRef={videoRef} />

            {/* Loading overlay */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80"
                >
                  <Loader2 className="w-10 h-10 text-[#00FF00] animate-spin mb-4" />
                  <p className="text-sm font-mono text-white/50 uppercase tracking-widest">
                    Initializing Neural Engine...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ===== CRITICAL ALERT BANNER (top of camera) ===== */}
            <AnimatePresence>
              {navResult && (navResult.alertLevel === "critical" || navResult.alertLevel === "warning") && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="absolute top-4 left-4 right-4 z-30"
                >
                  <div
                    className="px-6 py-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 shadow-2xl"
                    style={{
                      backgroundColor: navResult.alertLevel === "critical" ? "rgba(255,34,34,0.85)" : "rgba(255,136,0,0.85)",
                      borderColor: navResult.alertLevel === "critical" ? "#FF4444" : "#FFaa00",
                      boxShadow: `0 0 40px ${navResult.alertLevel === "critical" ? "rgba(255,34,34,0.5)" : "rgba(255,136,0,0.4)"}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center animate-pulse">
                        {getDirectionIcon(navResult)}
                      </div>
                      <div>
                        <p className="text-base font-black uppercase tracking-wider text-white leading-tight">
                          {navResult.instruction}
                        </p>
                        <p className="text-[10px] font-mono text-white/60 uppercase mt-1">
                          {navResult.objectName} • {navResult.distance.toFixed(1)}m • {navResult.position}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ===== CAUTION INDICATOR (bottom of camera) ===== */}
            <AnimatePresence>
              {navResult && navResult.alertLevel === "caution" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-4 left-4 right-4 z-30"
                >
                  <div className="px-5 py-3 rounded-xl bg-black/70 backdrop-blur-md border border-yellow-500/30 flex items-center gap-3">
                    {getDirectionIcon(navResult)}
                    <p className="text-sm font-bold text-yellow-400">
                      {navResult.instruction}
                    </p>
                    <span className="text-[10px] font-mono text-white/30 ml-auto uppercase">
                      {navResult.distance.toFixed(1)}m
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ===== LIVE STATS BAR ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "FPS", value: fps.toString(), unit: "hz", color: fps > 10 ? "#00FF00" : "#FF8800" },
              { label: "Latency", value: fps > 0 ? Math.round(1000 / fps).toString() : "—", unit: "ms", color: "#00FF00" },
              { label: "Objects", value: detections.length.toString(), unit: "qty", color: detections.length > 0 ? "#00FFFF" : "#FFFFFF" },
              { label: "Alert", value: navResult ? navResult.alertLevel.toUpperCase() : "CLEAR", unit: "", color: navResult ? getAlertColor(navResult.alertLevel) : "#00FF00" },
            ].map((stat) => (
              <div key={stat.label} className="p-4 bg-[#151619] rounded-xl border border-white/5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-mono font-bold" style={{ color: stat.color }}>{stat.value}</span>
                  {stat.unit && <span className="text-[10px] font-mono text-white/20 uppercase">{stat.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* ===== NAVIGATION INSTRUCTION CARD ===== */}
          <div className="p-6 bg-[#151619] rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#00FF00]" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                  Navigation System
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-3 h-3 text-white/30" />
                  <span className="text-xs font-mono text-white/50">COCO-SSD v2</span>
                  <span className="text-xs font-mono text-[#00FF00]">Ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00FF00] animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#00FF00]">
                    Live Active
                  </span>
                </div>
              </div>
            </div>

            <motion.div
              initial={false}
              animate={{
                backgroundColor: navResult
                  ? getAlertColor(navResult.alertLevel) + "15"
                  : "rgba(255, 255, 255, 0.02)",
                borderColor: navResult
                  ? getAlertColor(navResult.alertLevel) + "40"
                  : "rgba(255, 255, 255, 0.1)",
              }}
              className="min-h-[90px] flex items-center p-5 rounded-xl border border-dashed transition-colors"
            >
              {navResult ? (
                <div className="flex items-center gap-4 w-full">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: getAlertColor(navResult.alertLevel) + "20", color: getAlertColor(navResult.alertLevel) }}
                  >
                    {getDirectionIcon(navResult)}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-mono font-bold text-white tracking-tight leading-tight">
                      {navResult.instruction}
                    </p>
                    <p className="text-xs font-mono text-white/30 mt-1">
                      {navResult.objectName} detected {navResult.distance.toFixed(1)}m away ({navResult.position})
                    </p>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase"
                    style={{
                      backgroundColor: getAlertColor(navResult.alertLevel) + "20",
                      color: getAlertColor(navResult.alertLevel),
                    }}
                  >
                    {navResult.alertLevel}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full justify-center">
                  <Activity className="w-5 h-5 text-[#00FF00]/40" />
                  <p className="text-sm font-mono text-white/30">
                    {t.scanning || "Scanning environment..."}
                  </p>
                </div>
              )}
            </motion.div>

            {/* Detection list */}
            {detections.length > 0 && (
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Detected Objects</p>
                <div className="flex flex-wrap gap-2">
                  {detections.map((det, i) => (
                    <span
                      key={`${det.class}-${i}`}
                      className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase border"
                      style={{
                        borderColor: getAlertColor(
                          (det.distance ?? 10) < 1.2 ? "critical" :
                          (det.distance ?? 10) < 2.5 ? "warning" :
                          (det.distance ?? 10) < 4.0 ? "caution" : "clear"
                        ) + "40",
                        color: getAlertColor(
                          (det.distance ?? 10) < 1.2 ? "critical" :
                          (det.distance ?? 10) < 2.5 ? "warning" :
                          (det.distance ?? 10) < 4.0 ? "caution" : "clear"
                        ),
                      }}
                    >
                      {det.class} {det.distance?.toFixed(1)}m
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
            VisionGuide AI v2.0 // TensorFlow.js + COCO-SSD
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00FF00]" />
              <span className="text-[10px] font-mono text-white/40 uppercase">
                {fps > 0 ? `${fps} FPS` : "Initializing"}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
