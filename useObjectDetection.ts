import { useState, useEffect, RefObject } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export interface DetectedObject {
    class: string;
    score: number;
    bbox: [number, number, number, number]; // [x, y, width, height]
}

export default function useObjectDetection(videoRef: RefObject<HTMLVideoElement>) {
    const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
    const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadModel() {
            try {
                const loadedModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
                setModel(loadedModel);
                setIsLoading(false);
            } catch (err) {
                console.error('Failed to load COCO-SSD model:', err);
            }
        }
        loadModel().catch((e) => console.error(e));
    }, []);

    useEffect(() => {
        let isMounted = true;
        let animationFrameId: number = 0;

        async function detect() {
            if (!isMounted) return;

            const video = videoRef.current;
            if (model && video && video.readyState >= 3) {
                // Cast to 'any' to avoid strict DOM type mismatches with tfjs
                const predictions = await model.detect(video as any);
                setDetectedObjects(predictions as unknown as DetectedObject[]);
            }
            if (isMounted) {
                animationFrameId = requestAnimationFrame(() => {
                    detect().catch((e) => console.error(e));
                });
            }
        }

        if (!isLoading && model) {
            detect().catch((e) => console.error(e));
        }

        return () => {
            isMounted = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [model, isLoading, videoRef]);

    return { detectedObjects, isLoading };
}