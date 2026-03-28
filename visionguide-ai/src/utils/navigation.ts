import { DetectedObject, SALanguage, TRANSLATIONS } from "../types";

/**
 * Determines the navigation instruction based on detected objects and language.
 */
export function getNavigationInstruction(
  objects: DetectedObject[], 
  videoWidth: number,
  lang: SALanguage = "en-ZA"
): string | null {
  const t = TRANSLATIONS[lang];
  
  // Filter for important objects
  const importantClasses = [
    "person", "chair", "table", "car", "bicycle", "motorcycle", "bus", "truck",
    "bottle", "cup", "laptop", "cell_phone", "backpack", "umbrella", "handbag",
    "suitcase", "couch", "potted_plant", "bed", "dining_table", "toilet", "tv",
    "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase"
  ];
  const relevantObjects = objects.filter(obj => importantClasses.includes(obj.class) && obj.score > 0.45);

  if (relevantObjects.length === 0) return null;

  // Sort by closest distance
  relevantObjects.sort((a, b) => (a.distance || 100) - (b.distance || 100));

  const closest = relevantObjects[0];
  const [x, , width] = closest.bbox;
  const centerX = x + width / 2;

  // Divide screen into 3 regions
  const leftBound = videoWidth / 3;
  const rightBound = (videoWidth / 3) * 2;

  let position: "left" | "center" | "right";
  if (centerX < leftBound) position = "left";
  else if (centerX > rightBound) position = "right";
  else position = "center";

  const objectName = t[closest.class] || closest.class;

  // Instruction logic
  if (closest.distance && closest.distance < 1.2) {
    if (position === "center") return `${t.obstacle_ahead} ${objectName}.`;
    if (position === "left") return `${t.obstacle_left} ${objectName}.`;
    if (position === "right") return `${t.obstacle_right} ${objectName}.`;
  } else if (closest.distance && closest.distance < 4) {
    return `${objectName} ${closest.distance.toFixed(1)} ${t.meters_ahead}.`;
  }

  return null;
}
