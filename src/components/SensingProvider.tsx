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
import { gestureMappings } from "@/lib/gesture-mapping";
import type { GestureSignal } from "@/lib/gesture-signals";

const PREDICTION_INTERVAL_MS = 33;
const GESTURE_STABILITY_MS = 350;
const MAX_CONSECUTIVE_PREDICTION_ERRORS = 3;
const NO_LANDMARKS_RESET_MS = 200;
const MISSING_VIDEO_LOG_EVERY_MS = 5000;
const MISSING_VIDEO_CLEAR_STATE_AFTER_MS = 2000;
// Small jitter tolerance: avoids repeated DOM hit-testing when the hand cursor is stable.
const HIT_TEST_CACHE_EPSILON_PX = 2;
// Keep the hover state fresh even if the cursor is stationary.
const HIT_TEST_CACHE_MAX_AGE_MS = 100;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

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
    gestureSignal: GestureSignal | null;
    clearGestureSignal: () => void;
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
    const [gestureSignal, setGestureSignal] = useState<GestureSignal | null>(null);
    const gestureSignalIdRef = useRef(0);
    const missingGestureMappingLoggedRef = useRef<Set<HandGesture>>(new Set());

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
    const lastMissingVideoLogAtRef = useRef(0);
    const missingVideoSinceRef = useRef<number | null>(null);
    const missingVideoClearedRef = useRef(false);
    const sensingSurfaceRef = useRef<HTMLElement | null>(null);
    const hitTestCacheRef = useRef<{
        x: number;
        y: number;
        at: number;
        interactable: HTMLElement | null;
        isOverCanvasDraggable: boolean;
    } | null>(null);

    const resetMissingVideoTracking = useCallback(() => {
        lastMissingVideoLogAtRef.current = 0;
        missingVideoSinceRef.current = null;
        missingVideoClearedRef.current = false;
    }, []);

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

    const clearGestureSignal = useCallback(() => {
        setGestureSignal(null);
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
        resetMissingVideoTracking();

        setHandPosition(null);
        setHoveredElement(null);
        hitTestCacheRef.current = null;
        resetGestureDetection(now);
        setGestureSignal(null);
    }, [resetGestureDetection, resetMissingVideoTracking]);

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
        resetMissingVideoTracking();
        sensingSurfaceRef.current = document.querySelector(
            '[data-sensing-surface="true"]',
        );

        const handleMissingVideo = (now: number) => {
            const isFirstMissingFrame = missingVideoSinceRef.current === null;
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
                console.warn("Hand tracking video element missing from DOM", {
                    missingForMs: missingVideoSinceRef.current
                        ? Math.round(now - missingVideoSinceRef.current)
                        : 0,
                });
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
                hitTestCacheRef.current = null;
                resetGestureDetection(now);
            }
        };

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
                    handleMissingVideo(now);

                    animationFrameRef.current = requestAnimationFrame(predict);
                    return;
                }

                if (missingVideoSinceRef.current !== null) {
                    resetMissingVideoTracking();
                }

                if (video.readyState >= 2) {
                    const results = service.predict(video, now);
                    if (results && results.landmarks && results.landmarks.length > 0) {
                        const handLandmarks = results.landmarks[0];
                        const indexFingerTip = handLandmarks[8];

                        if (!indexFingerTip) {
                            setHandPosition(null);
                            setHoveredElement(null);
                            hitTestCacheRef.current = null;
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

                        const surfaceRect =
                            sensingSurfaceRef.current?.getBoundingClientRect();

                        const left = surfaceRect?.left ?? 0;
                        const top = surfaceRect?.top ?? 0;
                        const width = surfaceRect?.width ?? window.innerWidth;
                        const height = surfaceRect?.height ?? window.innerHeight;

                        // MediaPipe coordinates are normalized 0-1
                        // We flip X because camera is mirrored
                        const normalizedX = clamp(1 - indexFingerTip.x, 0, 1);
                        const normalizedY = clamp(indexFingerTip.y, 0, 1);
                        const clientX = left + normalizedX * width;
                        const clientY = top + normalizedY * height;

                        setHandPosition({ x: clientX, y: clientY });

                        const maxHitTestX = Math.max(0, window.innerWidth - 1);
                        const maxHitTestY = Math.max(0, window.innerHeight - 1);
                        const hitTestX = clamp(clientX, 0, maxHitTestX);
                        const hitTestY = clamp(clientY, 0, maxHitTestY);

                        const cachedHit = hitTestCacheRef.current;
                        const cachedInteractable = cachedHit?.interactable ?? null;
                        const cachedIsOverCanvasDraggable =
                            cachedHit?.isOverCanvasDraggable ?? false;
                        const canReuseCachedHit =
                            cachedHit !== null &&
                            now - cachedHit.at < HIT_TEST_CACHE_MAX_AGE_MS &&
                            (!cachedInteractable || cachedInteractable.isConnected) &&
                            Math.hypot(hitTestX - cachedHit.x, hitTestY - cachedHit.y) <
                                HIT_TEST_CACHE_EPSILON_PX;

                        let interactable = cachedInteractable;
                        let isOverCanvasDraggable = cachedIsOverCanvasDraggable;

                        if (!canReuseCachedHit) {
                            const element = document.elementFromPoint(
                                hitTestX,
                                hitTestY,
                            ) as HTMLElement | null;

                            const canvasItem = element
                                ? ((element.closest(
                                      "[data-canvas-item-id]",
                                  ) as HTMLElement) ||
                                      null)
                                : null;

                            isOverCanvasDraggable = Boolean(canvasItem);

                            interactable = canvasItem
                                ? canvasItem
                                : element
                                  ? ((element.closest(
                                        "[data-interactable]",
                                    ) as HTMLElement) ||
                                        null)
                                  : null;

                            hitTestCacheRef.current = {
                                x: hitTestX,
                                y: hitTestY,
                                at: now,
                                interactable,
                                isOverCanvasDraggable,
                            };
                        }

                        setHoveredElement(interactable);

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

                            const mapping = Object.prototype.hasOwnProperty.call(
                                gestureMappings,
                                gesture,
                            )
                                ? gestureMappings[gesture]
                                : null;

                            if (import.meta.env.DEV && !mapping) {
                                const logged = missingGestureMappingLoggedRef.current;
                                if (!logged.has(gesture)) {
                                    logged.add(gesture);
                                    console.warn("Missing gesture mapping", { gesture });
                                }
                            }

                            const mappingSignalType = mapping?.signalType ?? null;
                            const shouldSuppressSignal = mappingSignalType === null;

                            if (
                                gestureMappingEnabledRef.current &&
                                !shouldSuppressSignal &&
                                !session.triggered &&
                                now - candidate.since >= GESTURE_STABILITY_MS
                            ) {
                                gestureSignalIdRef.current += 1;
                                session.triggered = true;

                                const confidence = clamp(
                                    (now - candidate.since) /
                                        (GESTURE_STABILITY_MS * 1.5),
                                    0,
                                    1,
                                );

                                setGestureSignal({
                                    id: gestureSignalIdRef.current,
                                    type: mappingSignalType,
                                    at: now,
                                    confidence,
                                    clientX,
                                    clientY,
                                });
                            }
                        }
                    } else {
                        setHandPosition(null);
                        setHoveredElement(null);
                        hitTestCacheRef.current = null;
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
    }, [disableHandTracking, handTrackingEnabled, resetMissingVideoTracking, stopHandTracking]);

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
                gestureSignal,
                clearGestureSignal,
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
