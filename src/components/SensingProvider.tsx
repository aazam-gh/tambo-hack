import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { HandLandmarkerService } from "../services/HandLandmarker";
import { detectHandGesture, type HandGesture } from "@/lib/hand-gestures";
import type { GestureAction } from "@/lib/gesture-mapping";

const PREDICTION_INTERVAL_MS = 33;
const GESTURE_STABILITY_MS = 350;
const MAX_CONSECUTIVE_PREDICTION_ERRORS = 3;
const NO_LANDMARKS_RESET_MS = 200;
const MISSING_VIDEO_LOG_EVERY_MS = 5000;
const MISSING_VIDEO_CLEAR_STATE_AFTER_MS = 2000;

interface SensingContextType {
    handPosition: { x: number; y: number } | null;
    hoveredElement: HTMLElement | null;
    handTrackingEnabled: boolean;
    setHandTrackingEnabled: (enabled: boolean) => void;
    handTrackingInitializing: boolean;
    handTrackingError: string | null;
    handGesture: HandGesture | null;
    gestureMappingEnabled: boolean;
    setGestureMappingEnabled: (enabled: boolean) => void;
    gestureAction: GestureAction | null;
}

const SensingContext = createContext<SensingContextType | undefined>(undefined);

export const SensingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
    const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
    const [handTrackingEnabled, setHandTrackingEnabledState] = useState(false);
    const [handTrackingInitializing, setHandTrackingInitializing] = useState(false);
    const [handTrackingError, setHandTrackingError] = useState<string | null>(null);
    const [handGesture, setHandGesture] = useState<HandGesture | null>(null);
    const [gestureMappingEnabled, setGestureMappingEnabledState] = useState(false);
    const gestureMappingEnabledRef = useRef(gestureMappingEnabled);
    const [gestureAction, setGestureAction] = useState<GestureAction | null>(null);
    const gestureActionIdRef = useRef(0);

    // Gesture detection is intentionally conservative:
    // - `gestureCandidateRef` tracks the most recent detected gesture + when it started.
    // - `gestureSessionRef` ensures we only fire once per continuous gesture hold.
    const gestureCandidateRef = useRef<{ gesture: HandGesture | null; since: number }>({
        gesture: null,
        since: 0,
    });
    const gestureSessionRef = useRef<{ gesture: HandGesture | null; triggered: boolean }>({
        gesture: null,
        triggered: false,
    });
    const handTrackingEnabledRef = useRef(handTrackingEnabled);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastPredictionTimeRef = useRef(0);
    const predictionErrorCountRef = useRef(0);
    const lastLandmarksTimeRef = useRef(0);
    const missingVideoCountRef = useRef(0);
    const lastMissingVideoLogAtRef = useRef(0);
    const missingVideoSinceRef = useRef<number | null>(null);
    const missingVideoClearedRef = useRef(false);
    const sensingSurfaceRef = useRef<HTMLElement | null>(null);

    const getCameraErrorMessage = (err: unknown): string => {
        if (err instanceof DOMException) {
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                return "Camera access was denied. Enable it in your browser settings.";
            }

            if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                return "No camera device was found.";
            }
        }

        return "Unable to access the camera.";
    };

    const setHandTrackingEnabledSynced = useCallback((enabled: boolean) => {
        handTrackingEnabledRef.current = enabled;
        setHandTrackingEnabledState(enabled);

        if (!enabled) {
            gestureMappingEnabledRef.current = false;
            setGestureMappingEnabledState(false);
        }
    }, []);

    const setGestureMappingEnabled = useCallback((enabled: boolean) => {
        if (!handTrackingEnabledRef.current) {
            return;
        }
        gestureMappingEnabledRef.current = enabled;
        setGestureMappingEnabledState(enabled);
    }, []);

    const resetGestureDetection = useCallback((now: number) => {
        gestureCandidateRef.current = { gesture: null, since: now };
        gestureSessionRef.current = { gesture: null, triggered: false };
        setHandGesture(null);
    }, []);

    const stopHandTracking = useCallback(() => {
        const now = performance.now();

        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (videoRef.current) {
            try {
                videoRef.current.pause();
            } catch {
                // Ignore pause errors.
            }

            videoRef.current.srcObject = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        predictionErrorCountRef.current = 0;
        lastLandmarksTimeRef.current = 0;
        missingVideoCountRef.current = 0;
        lastMissingVideoLogAtRef.current = 0;
        missingVideoSinceRef.current = null;
        missingVideoClearedRef.current = false;
        gestureActionIdRef.current = 0;

        setHandPosition(null);
        setHoveredElement(null);
        resetGestureDetection(now);
        setGestureAction(null);
    }, [resetGestureDetection]);

    const disableHandTracking = useCallback(
        (message: string) => {
            setHandTrackingError(message);
            setHandTrackingInitializing(false);
            setHandTrackingEnabledSynced(false);
            stopHandTracking();
        },
        [setHandTrackingEnabledSynced, stopHandTracking],
    );

    const setHandTrackingEnabled = useCallback(
        (enabled: boolean) => {
            if (enabled) {
                setHandTrackingError(null);
                setHandTrackingEnabledSynced(true);
                return;
            }

            setHandTrackingError(null);
            setHandTrackingInitializing(false);
            setHandTrackingEnabledSynced(false);
            stopHandTracking();
        },
        [setHandTrackingEnabledSynced, stopHandTracking],
    );

    useEffect(() => {
        return () => {
            stopHandTracking();
            HandLandmarkerService.getInstance().dispose();
        };
    }, [stopHandTracking]);

    useEffect(() => {
        // This effect owns the camera + prediction loop lifecycle.
        // Avoid adding new dependencies that could cause unnecessary restarts.
        if (!handTrackingEnabled) {
            setHandTrackingInitializing(false);
            stopHandTracking();
            return;
        }

        const service = HandLandmarkerService.getInstance();
        let canceled = false;

        lastPredictionTimeRef.current = 0;
        predictionErrorCountRef.current = 0;
        lastLandmarksTimeRef.current = 0;
        missingVideoCountRef.current = 0;
        lastMissingVideoLogAtRef.current = 0;
        missingVideoSinceRef.current = null;
        missingVideoClearedRef.current = false;
        sensingSurfaceRef.current = document.querySelector(
            '[data-sensing-surface="true"]',
        );

        const predict = () => {
            if (canceled || !handTrackingEnabledRef.current) return;

            const now = performance.now();
            if (now - lastPredictionTimeRef.current < PREDICTION_INTERVAL_MS) {
                animationFrameRef.current = requestAnimationFrame(predict);
                return;
            }

            lastPredictionTimeRef.current = now;

            try {
                const video = videoRef.current;
                if (!video) {
                    animationFrameRef.current = requestAnimationFrame(predict);
                    return;
                }

                if (!document.body.contains(video)) {
                    missingVideoCountRef.current += 1;

                    const isFirstMissingFrame = missingVideoCountRef.current === 1;
                    if (isFirstMissingFrame) {
                        missingVideoSinceRef.current = now;
                        missingVideoClearedRef.current = false;
                    }

                    const isLogIntervalElapsed =
                        now - lastMissingVideoLogAtRef.current >=
                        MISSING_VIDEO_LOG_EVERY_MS;
                    const shouldLog = isFirstMissingFrame || isLogIntervalElapsed;

                    if (shouldLog) {
                        lastMissingVideoLogAtRef.current = now;
                        console.warn(
                            "Hand tracking video element missing from DOM",
                            {
                                count: missingVideoCountRef.current,
                            },
                        );
                    }

                    // If the video node is missing for a while, clear gesture/cursor
                    // state so the UI doesn't show stale information.
                    const missingSince = missingVideoSinceRef.current;
                    const shouldClearState =
                        !missingVideoClearedRef.current &&
                        missingSince !== null &&
                        now - missingSince >= MISSING_VIDEO_CLEAR_STATE_AFTER_MS;

                    if (shouldClearState) {
                        missingVideoClearedRef.current = true;
                        setHandPosition(null);
                        setHoveredElement(null);
                        resetGestureDetection(now);
                    }

                    animationFrameRef.current = requestAnimationFrame(predict);
                    return;
                }

                if (missingVideoCountRef.current > 0) {
                    missingVideoCountRef.current = 0;
                    lastMissingVideoLogAtRef.current = 0;
                    missingVideoSinceRef.current = null;
                    missingVideoClearedRef.current = false;
                }

                if (video.readyState >= 2) {
                    const results = service.predict(video, now);
                    if (results && results.landmarks && results.landmarks.length > 0) {
                        const handLandmarks = results.landmarks[0];
                        const indexFingerTip = handLandmarks[8];

                        if (!indexFingerTip) {
                            setHandPosition(null);
                            setHoveredElement(null);
                            setHandGesture(null);
                            if (
                                now - lastLandmarksTimeRef.current >
                                NO_LANDMARKS_RESET_MS
                            ) {
                                resetGestureDetection(now);
                            }
                            animationFrameRef.current = requestAnimationFrame(predict);
                            return;
                        }

                        lastLandmarksTimeRef.current = now;

                        const gesture = detectHandGesture(handLandmarks);
                        setHandGesture(gesture);

                        if (!gesture) {
                            resetGestureDetection(now);
                        } else {
                            const candidate = gestureCandidateRef.current;
                            if (candidate.gesture !== gesture) {
                                candidate.gesture = gesture;
                                candidate.since = now;
                            }

                            const session = gestureSessionRef.current;
                            if (session.gesture !== gesture) {
                                session.gesture = gesture;
                                session.triggered = false;
                            }

                            if (
                                gestureMappingEnabledRef.current &&
                                !session.triggered &&
                                now - candidate.since >= GESTURE_STABILITY_MS
                            ) {
                                gestureActionIdRef.current += 1;
                                session.triggered = true;
                                setGestureAction({
                                    id: gestureActionIdRef.current,
                                    gesture,
                                    at: now,
                                });
                            }
                        }

                        const surfaceRect =
                            sensingSurfaceRef.current?.getBoundingClientRect();

                        // MediaPipe coordinates are normalized 0-1
                        // We flip X because camera is mirrored
                        const x =
                            (surfaceRect?.left ?? 0) +
                            (1 - indexFingerTip.x) *
                            (surfaceRect?.width ?? window.innerWidth);
                        const y =
                            (surfaceRect?.top ?? 0) +
                            indexFingerTip.y *
                            (surfaceRect?.height ?? window.innerHeight);

                        setHandPosition({ x, y });

                        const element = document.elementFromPoint(x, y) as HTMLElement;
                        if (element) {
                            setHoveredElement(
                                (element.closest(
                                    "[data-interactable]",
                                ) as HTMLElement) ||
                                null,
                            );
                        } else {
                            setHoveredElement(null);
                        }
                    } else {
                        setHandPosition(null);
                        setHoveredElement(null);
                        setHandGesture(null);
                        if (
                            now - lastLandmarksTimeRef.current >
                            NO_LANDMARKS_RESET_MS
                        ) {
                            resetGestureDetection(now);
                        }
                    }
                }

                predictionErrorCountRef.current = 0;
            } catch (err) {
                predictionErrorCountRef.current += 1;
                console.error("Hand tracking prediction failed:", err);

                if (
                    predictionErrorCountRef.current >=
                    MAX_CONSECUTIVE_PREDICTION_ERRORS
                ) {
                    disableHandTracking("Hand tracking encountered an error.");
                    return;
                }
            }

            animationFrameRef.current = requestAnimationFrame(predict);
        };

        const startCamera = async () => {
            setHandTrackingError(null);

            if (!navigator.mediaDevices?.getUserMedia) {
                disableHandTracking(
                    "Camera access is not supported in this browser.",
                );
                return;
            }

            setHandTrackingInitializing(true);

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720 },
                });

                if (canceled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                try {
                    await service.initialize();
                } catch (err) {
                    console.error("Hand landmarker initialization failed:", err);
                    disableHandTracking("Hand tracking failed to initialize.");
                    return;
                }

                if (!canceled) {
                    animationFrameRef.current = requestAnimationFrame(predict);
                }
            } catch (err) {
                console.error("Camera access denied:", err);
                disableHandTracking(getCameraErrorMessage(err));
            } finally {
                setHandTrackingInitializing(false);
            }
        };

        startCamera();

        return () => {
            canceled = true;
            stopHandTracking();
        };
    }, [disableHandTracking, handTrackingEnabled, stopHandTracking]);

    return (
        <SensingContext.Provider
            value={{
                handPosition,
                hoveredElement,
                handTrackingEnabled,
                setHandTrackingEnabled,
                handTrackingInitializing,
                handTrackingError,
                handGesture,
                gestureMappingEnabled,
                setGestureMappingEnabled,
                gestureAction,
            }}
        >
            {children}
            <video
                ref={videoRef}
                style={{ display: "none" }}
                playsInline
                muted
            />
        </SensingContext.Provider>
    );
};

export const useSensing = () => {
    const context = useContext(SensingContext);
    if (!context) throw new Error("useSensing must be used within SensingProvider");
    return context;
};
