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
import { GESTURE_STABILITY_MS } from "@/lib/gesture-timing";

interface SensingContextType {
    handPosition: { x: number; y: number } | null;
    hoveredElement: HTMLElement | null;
    handGesture: HandGesture | null;
    handTrackingEnabled: boolean;
    setHandTrackingEnabled: (enabled: boolean) => void;
    handTrackingInitializing: boolean;
    handTrackingError: string | null;
    gestureMappingEnabled: boolean;
    setGestureMappingEnabled: (enabled: boolean) => void;
}

const SensingContext = createContext<SensingContextType | undefined>(undefined);

export const SensingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
    const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
    const [handGesture, setHandGestureState] = useState<HandGesture | null>(null);
    const [handTrackingEnabled, setHandTrackingEnabledState] = useState(false);
    const [handTrackingInitializing, setHandTrackingInitializing] = useState(false);
    const [handTrackingError, setHandTrackingError] = useState<string | null>(null);
    const [gestureMappingEnabled, setGestureMappingEnabledState] = useState(false);
    const handTrackingEnabledRef = useRef(handTrackingEnabled);
    const handGestureRef = useRef<HandGesture | null>(handGesture);
    const gestureCandidateRef = useRef<HandGesture | null>(null);
    const gestureCandidateSinceRef = useRef<number | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastPredictionTimeRef = useRef(0);
    const sensingSurfaceRef = useRef<HTMLElement | null>(null);

    const predictionIntervalMs = 33;

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
    }, []);

    const setHandGestureSynced = useCallback((gesture: HandGesture | null) => {
        handGestureRef.current = gesture;
        setHandGestureState(gesture);
    }, []);

    const resetGestureState = useCallback(() => {
        setHandGestureSynced(null);
        gestureCandidateRef.current = null;
        gestureCandidateSinceRef.current = null;
    }, [setHandGestureSynced]);

    // `gestureMappingEnabled` is only consumed in React render/effects (not inside the
    // prediction loop), so it doesn't need a ref-backed mirror like hand tracking.
    const setGestureMappingEnabled = useCallback((enabled: boolean) => {
        setGestureMappingEnabledState(enabled);
    }, []);

    // Gesture smoothing state machine:
    // - When `detectedGesture` changes, start (or restart) a candidate window.
    // - Once the candidate remains unchanged for `GESTURE_STABILITY_MS`, promote it
    //   to `handGesture`.
    const updateGestureStability = useCallback(
        (detectedGesture: HandGesture | null, now: number) => {
            // Invariant: `gestureCandidateSinceRef` marks when we first observed
            // `gestureCandidateRef.current` (including `null`, which represents
            // "no gesture" / "no hand" and is also smoothed).
            if (detectedGesture !== gestureCandidateRef.current) {
                gestureCandidateRef.current = detectedGesture;
                gestureCandidateSinceRef.current = now;
                return;
            }

            // Candidate gesture is unchanged; start the stability window if needed.
            if (gestureCandidateSinceRef.current === null) {
                gestureCandidateSinceRef.current = now;
                return;
            }

            if (now - gestureCandidateSinceRef.current < GESTURE_STABILITY_MS) {
                return;
            }

            if (detectedGesture !== handGestureRef.current) {
                setHandGestureSynced(detectedGesture);
            }
        },
        [setHandGestureSynced],
    );

    const stopHandTracking = useCallback(() => {
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

        setHandPosition(null);
        setHoveredElement(null);
        resetGestureState();
    }, [resetGestureState]);

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
        if (!handTrackingEnabled) {
            setHandTrackingInitializing(false);
            stopHandTracking();
            return;
        }

        const service = HandLandmarkerService.getInstance();
        let canceled = false;

        lastPredictionTimeRef.current = 0;
        sensingSurfaceRef.current = document.querySelector(
            '[data-sensing-surface="true"]',
        );
        resetGestureState();

        const predict = () => {
            if (canceled || !handTrackingEnabledRef.current) return;

            const now = performance.now();
            if (now - lastPredictionTimeRef.current < predictionIntervalMs) {
                animationFrameRef.current = requestAnimationFrame(predict);
                return;
            }

            lastPredictionTimeRef.current = now;

            try {
                if (videoRef.current && videoRef.current.readyState >= 2) {
                    const results = service.predict(videoRef.current, now);
                    if (results && results.landmarks && results.landmarks.length > 0) {
                        const indexFingerTip = results.landmarks[0][8];

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

                        updateGestureStability(
                            detectHandGesture(results.landmarks[0]),
                            now,
                        );
                    } else {
                        setHandPosition(null);
                        setHoveredElement(null);
                        // Treat `null` as a candidate as well, so we only clear the
                        // stable gesture after `GESTURE_STABILITY_MS` of no hand/gesture.
                        updateGestureStability(null, now);
                    }
                }
            } catch (err) {
                console.error("Hand tracking prediction failed:", err);
                disableHandTracking("Hand tracking encountered an error.");
                return;
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
    }, [
        disableHandTracking,
        handTrackingEnabled,
        resetGestureState,
        stopHandTracking,
        updateGestureStability,
    ]);

    return (
        <SensingContext.Provider
            value={{
                handPosition,
                hoveredElement,
                handGesture,
                handTrackingEnabled,
                setHandTrackingEnabled,
                handTrackingInitializing,
                handTrackingError,
                gestureMappingEnabled,
                setGestureMappingEnabled,
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
