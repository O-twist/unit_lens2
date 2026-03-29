/**
 * Represents a detected object.
 */
export interface DetectedObject {
    bbox: [number, number, number, number]; // [x1, y1, x2, y2]
    class: string;
    confidence: number;
    distance: number;
    position: 'left' | 'center' | 'right';
}

const COCO_CLASSES: string[] = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
    'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
    'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
    'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
    'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
    'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard',
    'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase',
    'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

/**
 * Performs non-maximum suppression to filter out overlapping bounding boxes.
 * @param boxes The bounding boxes.
 * @param scores The corresponding confidence scores.
 * @param iouThreshold The intersection-over-union threshold.
 * @returns The indices of the boxes to keep.
 */
function nonMaxSuppression(boxes: number[][], scores: number[], iouThreshold: number): number[] {
    const sortedIndices = scores
        .map((_score, index) => index)
        .sort((a, b) => scores[b] - scores[a]);

    const keptIndices: number[] = [];
    while (sortedIndices.length > 0) {
        const currentIndex = sortedIndices.shift()!;
        keptIndices.push(currentIndex);

        const currentBox = boxes[currentIndex];
        const remainingIndices = [];

        for (const index of sortedIndices) {
            const box = boxes[index];
            const iou = intersectionOverUnion(currentBox, box);
            if (iou < iouThreshold) {
                remainingIndices.push(index);
            }
        }
        sortedIndices.splice(0, sortedIndices.length, ...remainingIndices);
    }
    return keptIndices;
}

/**
 * Calculates the intersection-over-union (IoU) of two bounding boxes.
 * @param box1 The first bounding box [x1, y1, x2, y2].
 * @param box2 The second bounding box [x1, y1, x2, y2].
 * @returns The IoU value.
 */
function intersectionOverUnion(box1: number[], box2: number[]): number {
    const [x1, y1, x2, y2] = box1;
    const [x3, y3, x4, y4] = box2;

    const interX1 = Math.max(x1, x3);
    const interY1 = Math.max(y1, y3);
    const interX2 = Math.min(x2, x4);
    const interY2 = Math.min(y2, y4);

    const interArea = Math.max(0, interX2 - interX1) * Math.max(0, interY2 - interY1);
    const box1Area = (x2 - x1) * (y2 - y1);
    const box2Area = (x4 - y3) * (y4 - y3);

    return interArea / (box1Area + box2Area - interArea);
}

/**
 * Post-processes the raw output from a YOLOv8 model.
 * @param output The raw output tensor from the model.
 * @param imageWidth The original width of the image.
 * @param imageHeight The original height of the image.
 * @returns An array of detected objects.
 */
export function yoloPostProcess(output: Float32Array, imageWidth: number, imageHeight: number): DetectedObject[] {
    const boxes: number[][] = [];
    const scores: number[] = [];
    const classIndices: number[] = [];

    const confidenceThreshold = 0.45;
    const iouThreshold = 0.5;

    for (let i = 0; i < 8400; i++) {
        const classProbs = output.slice(i * 84 + 4, (i + 1) * 84);
        const maxProb = Math.max(...classProbs);
        if (maxProb < confidenceThreshold) continue;

        const classIndex = classProbs.indexOf(maxProb);
        const score = maxProb;

        const [cx, cy, w, h] = [output[i * 84 + 0], output[i * 84 + 1], output[i * 84 + 2], output[i * 84 + 3]];
        const x1 = ((cx - w / 2) / 640) * imageWidth;
        const y1 = ((cy - h / 2) / 640) * imageHeight;
        const x2 = ((cx + w / 2) / 640) * imageWidth;
        const y2 = ((cy + h / 2) / 640) * imageHeight;

        boxes.push([x1, y1, x2, y2]);
        scores.push(score);
        classIndices.push(classIndex);
    }

    const keptIndices = nonMaxSuppression(boxes, scores, iouThreshold);

    return keptIndices.map(index => {
        const bbox = boxes[index] as [number, number, number, number];
        const boxWidth = bbox[2] - bbox[0];
        const distance = (1 - boxWidth / imageWidth) * 10; // Simple distance estimation
        const boxCenterX = bbox[0] + boxWidth / 2;
        const position = boxCenterX < imageWidth * 0.3 ? 'left' : boxCenterX > imageWidth * 0.7 ? 'right' : 'center';

        return {
            bbox,
            class: COCO_CLASSES[classIndices[index]],
            confidence: scores[index],
            distance,
            position,
        };
    });
}