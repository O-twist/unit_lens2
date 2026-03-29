import React, { useRef, useEffect } from "react";
import { DetectedObject } from "../types";
import { getDistanceColor } from "../utils/navigation";

interface DetectionOverlayProps {
  detections: DetectedObject[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * Draws detection boxes on a canvas overlay with:
 * - Color-coded boxes based on proximity (red/orange/yellow/green)
 * - Object name + confidence at top-left corner
 * - Distance badge at bottom-right corner
 * - Modern corner-accent styling
 */
export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({ detections, videoRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const video = videoRef.current;
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;

    detections.forEach(det => {
      const [x, y, width, height] = det.bbox;

      const rectX = x * scaleX;
      const rectY = y * scaleY;
      const rectW = width * scaleX;
      const rectH = height * scaleY;

      const dist = det.distance ?? 10;
      const color = getDistanceColor(dist);
      const cornerLen = Math.min(20, rectW * 0.2, rectH * 0.2);

      // ===== BOUNDING BOX (semi-transparent fill + solid corners) =====
      // Fill
      ctx.fillStyle = color + "15"; // very faint fill
      ctx.fillRect(rectX, rectY, rectW, rectH);

      // Thin full border
      ctx.strokeStyle = color + "60";
      ctx.lineWidth = 1;
      ctx.strokeRect(rectX, rectY, rectW, rectH);

      // Corner accents (thick)
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(rectX, rectY + cornerLen);
      ctx.lineTo(rectX, rectY);
      ctx.lineTo(rectX + cornerLen, rectY);
      ctx.stroke();

      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(rectX + rectW - cornerLen, rectY);
      ctx.lineTo(rectX + rectW, rectY);
      ctx.lineTo(rectX + rectW, rectY + cornerLen);
      ctx.stroke();

      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(rectX, rectY + rectH - cornerLen);
      ctx.lineTo(rectX, rectY + rectH);
      ctx.lineTo(rectX + cornerLen, rectY + rectH);
      ctx.stroke();

      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(rectX + rectW - cornerLen, rectY + rectH);
      ctx.lineTo(rectX + rectW, rectY + rectH);
      ctx.lineTo(rectX + rectW, rectY + rectH - cornerLen);
      ctx.stroke();

      // ===== OBJECT NAME LABEL (top-left corner) =====
      const label = `${det.class} ${(det.score * 100).toFixed(0)}%`;
      ctx.font = "bold 13px 'JetBrains Mono', 'SF Mono', monospace";
      const textMetrics = ctx.measureText(label);
      const textW = textMetrics.width + 12;
      const textH = 22;

      // Label background
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(rectX, rectY - textH - 2, textW, textH, [4, 4, 0, 0]);
      ctx.fill();

      // Label text
      ctx.fillStyle = "#000000";
      ctx.fillText(label, rectX + 6, rectY - 8);

      // ===== DISTANCE BADGE (bottom-right corner) =====
      const distLabel = `${dist.toFixed(1)}m`;
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      const distMetrics = ctx.measureText(distLabel);
      const distW = distMetrics.width + 10;
      const distH = 18;
      const distX = rectX + rectW - distW;
      const distY = rectY + rectH + 2;

      // Distance background
      ctx.fillStyle = color + "DD";
      ctx.beginPath();
      ctx.roundRect(distX, distY, distW, distH, [0, 0, 4, 4]);
      ctx.fill();

      // Distance text
      ctx.fillStyle = "#000000";
      ctx.fillText(distLabel, distX + 5, distY + 13);
    });
  }, [detections, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
    />
  );
};
