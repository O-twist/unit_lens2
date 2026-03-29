import { DetectedObject, SALanguage, TRANSLATIONS } from "../types";

/**
 * Priority levels for navigation instructions.
 */
export type AlertLevel = "critical" | "warning" | "caution" | "clear";

export interface NavigationResult {
  instruction: string;
  alertLevel: AlertLevel;
  objectName: string;
  distance: number;
  position: "left" | "center" | "right";
}

/**
 * Generates smart, real-time navigation instructions based on detections.
 * Uses a 3-zone (left / center / right) spatial model combined with
 * distance thresholds to produce actionable voice commands.
 *
 * Zone layout (from the camera's perspective):
 * ┌──────────┬──────────┬──────────┐
 * │  LEFT    │  CENTER  │   RIGHT  │
 * │  < 33%   │ 33%–67%  │  > 67%   │
 * └──────────┴──────────┴──────────┘
 */
export function getNavigationInstruction(
  detections: DetectedObject[],
  canvasWidth: number,
  lang: SALanguage
): NavigationResult | null {
  if (detections.length === 0) return null;

  const t = TRANSLATIONS[lang];
  const isLocal = lang !== "en-ZA";

  // Sort by distance (closest first), then by confidence
  const sorted = [...detections]
    .filter(d => d.score > 0.45)
    .sort((a, b) => {
      const distA = a.distance ?? 99;
      const distB = b.distance ?? 99;
      if (Math.abs(distA - distB) < 0.3) return b.score - a.score;
      return distA - distB;
    });

  if (sorted.length === 0) return null;

  const primary = sorted[0];
  const dist = primary.distance ?? 10;
  const objClass = primary.class;
  const objName = t[objClass.replace(/ /g, "_")] || objClass;

  // Determine position
  const [x, , width] = primary.bbox;
  const centerX = x + width / 2;
  const relativeX = centerX / canvasWidth;

  let position: "left" | "center" | "right";
  if (relativeX < 0.33) position = "left";
  else if (relativeX > 0.67) position = "right";
  else position = "center";

  // ===== CRITICAL: < 1.2 meters =====
  if (dist < 1.2) {
    if (position === "center") {
      return {
        instruction: isLocal
          ? `YIMA! I-${objName} iseduze kakhulu phambili!`
          : `STOP! ${objClass} directly ahead, very close!`,
        alertLevel: "critical",
        objectName: objClass,
        distance: dist,
        position,
      };
    }
    if (position === "left") {
      return {
        instruction: isLocal
          ? `Gudlukela kwesokudla! I-${objName} iseduze kwesobunxele.`
          : `Move right! ${objClass} close on your left.`,
        alertLevel: "critical",
        objectName: objClass,
        distance: dist,
        position,
      };
    }
    // right
    return {
      instruction: isLocal
        ? `Gudlukela kwesobunxele! I-${objName} iseduze kwesokudla.`
        : `Move left! ${objClass} close on your right.`,
      alertLevel: "critical",
      objectName: objClass,
      distance: dist,
      position,
    };
  }

  // ===== WARNING: 1.2 – 2.5 meters =====
  if (dist < 2.5) {
    if (position === "center") {
      return {
        instruction: isLocal
          ? `Qaphela, i-${objName} phambili. Nciphisa ijubane.`
          : `Caution, ${objClass} ahead. Slow down.`,
        alertLevel: "warning",
        objectName: objClass,
        distance: dist,
        position,
      };
    }
    if (position === "left") {
      return {
        instruction: isLocal
          ? `I-${objName} kwesobunxele. Qhubeka uqaphele.`
          : `${objClass} on your left. Keep going, stay right.`,
        alertLevel: "caution",
        objectName: objClass,
        distance: dist,
        position,
      };
    }
    // right
    return {
      instruction: isLocal
        ? `I-${objName} kwesokudla. Qhubeka uqaphele.`
        : `${objClass} on your right. Keep going, stay left.`,
      alertLevel: "caution",
      objectName: objClass,
      distance: dist,
      position,
    };
  }

  // ===== CAUTION: 2.5 – 4.0 meters =====
  if (dist < 4.0) {
    if (position === "center") {
      return {
        instruction: isLocal
          ? `I-${objName} phambili, kodwa usekude. Qhubeka.`
          : `${objClass} ahead but far. Keep going straight.`,
        alertLevel: "caution",
        objectName: objClass,
        distance: dist,
        position,
      };
    }
    // Object on the side and far — no concern
    return null;
  }

  // ===== CLEAR: > 4.0 meters =====
  return null;
}

/**
 * Returns color for a given alert level.
 */
export function getAlertColor(level: AlertLevel): string {
  switch (level) {
    case "critical": return "#FF2222";
    case "warning": return "#FF8800";
    case "caution": return "#FFCC00";
    case "clear": return "#00FF00";
  }
}

/**
 * Returns color based on distance.
 */
export function getDistanceColor(distance: number): string {
  if (distance < 1.2) return "#FF2222";
  if (distance < 2.5) return "#FF8800";
  if (distance < 4.0) return "#FFCC00";
  return "#00FF00";
}