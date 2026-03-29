import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { DetectedObject } from "../types";
import { estimateDistance } from "../utils/distance";

/**
 * Enhanced hook for real-time object detection using COCO-SSD.
 * Now includes position classification and FPS tracking.
 */
export function useObjectDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  trigger: any = null
) {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [detections, setDetections] = useState<DetectedObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fps, setFps] = useState(0);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  // Load model on mount
  useEffect(() => {
    async function loadModel() {
      try {
        await tf.ready();
        // Use WebGL backend for GPU acceleration
        if (tf.getBackend() !== "webgl") {
          try { await tf.setBackend("webgl"); } catch { /* fall back to default */ }
        }
        const loadedModel = await cocoSsd.load({
          base: "lite_mobilenet_v2",
        });
        setModel(loadedModel);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load model:", error);
      }
    }
    loadModel();
  }, []);

  // Detection loop
  useEffect(() => {
    if (!model || !videoRef.current) return;

    let isMounted = true;
    const detect = async () => {
      if (!isMounted) return;

      if (videoRef.current && videoRef.current.readyState === 4) {
        const video = videoRef.current;
        const predictions = await model.detect(video);
        const videoWidth = video.videoWidth;

        const processedDetections: DetectedObject[] = predictions
          .filter(pred => pred.score > 0.45) // Filter low-confidence early
          .map(pred => {
            const [x, , width] = pred.bbox;
            const centerX = x + width / 2;
            const relativeX = centerX / videoWidth;

            // Classify position in the frame
            let position: "left" | "center" | "right";
            if (relativeX < 0.33) position = "left";
            else if (relativeX > 0.67) position = "right";
            else position = "center";

            return {
              bbox: pred.bbox as [number, number, number, number],
              class: pred.class,
              score: pred.score,
              distance: estimateDistance(pred.class, pred.bbox[2]),
              position,
            };
          });

        setDetections(processedDetections);

        // FPS calculation (smoothed over multiple frames)
        frameCountRef.current++;
        const now = performance.now();
        const elapsed = now - lastTimeRef.current;
        if (elapsed >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / elapsed));
          frameCountRef.current = 0;
          lastTimeRef.current = now;
        }
      }
      
      // Run at ~15fps for real-time feel
      setTimeout(() => {
        if (isMounted) {
          requestRef.current = requestAnimationFrame(detect);
        }
      }, 66);
    };

    detect();

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [model, videoRef, trigger]);

  return { detections, isLoading, fps };
}
