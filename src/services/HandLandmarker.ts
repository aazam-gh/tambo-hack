import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const VISION_WASM_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";

export class HandLandmarkerService {
    private handLandmarker: HandLandmarker | null = null;
    private static instance: HandLandmarkerService;

    private constructor() { }

    public static getInstance(): HandLandmarkerService {
        if (!HandLandmarkerService.instance) {
            HandLandmarkerService.instance = new HandLandmarkerService();
        }
        return HandLandmarkerService.instance;
    }

    public async initialize() {
        if (this.handLandmarker) return;

        const vision = await FilesetResolver.forVisionTasks(
            VISION_WASM_URL
        );

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
    }

    public predict(videoElement: HTMLVideoElement, timestamp: number) {
        if (!this.handLandmarker) return null;
        return this.handLandmarker.detectForVideo(videoElement, timestamp);
    }
}
