import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { HandLandmarkerService } from "../services/HandLandmarker";

interface SensingContextType {
    handPosition: { x: number; y: number } | null;
    hoveredElement: HTMLElement | null;
    handTrackingEnabled: boolean;
    setHandTrackingEnabled: (enabled: boolean) => void;
    handTrackingError: string | null;
}

const SensingContext = createContext<SensingContextType | undefined>(undefined);

export const SensingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
    const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
    const [handTrackingEnabled, setHandTrackingEnabledState] = useState(false);
    const [handTrackingError, setHandTrackingError] = useState<string | null>(null);
    const handTrackingEnabledRef = useRef(handTrackingEnabled);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastPredictionTimeRef = useRef(0);

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

    const setHandTrackingEnabled = useCallback((enabled: boolean) => {
        if (enabled) {
            setHandTrackingError(null);
        }

        handTrackingEnabledRef.current = enabled;
        setHandTrackingEnabledState(enabled);
    }, []);

    useEffect(() => {
        handTrackingEnabledRef.current = handTrackingEnabled;
    }, [handTrackingEnabled]);

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
    }, []);

    useEffect(() => {
        return () => {
            stopHandTracking();
            HandLandmarkerService.getInstance().dispose();
        };
    }, [stopHandTracking]);

    useEffect(() => {
        if (!handTrackingEnabled) {
            stopHandTracking();
            return;
        }

        const service = HandLandmarkerService.getInstance();
        let canceled = false;

        lastPredictionTimeRef.current = 0;

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

                        // MediaPipe coordinates are normalized 0-1
                        // We flip X because camera is mirrored
                        const x = (1 - indexFingerTip.x) * window.innerWidth;
                        const y = indexFingerTip.y * window.innerHeight;

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
                    }
                }
            } catch (err) {
                console.error("Hand tracking prediction failed:", err);
                setHandTrackingError("Hand tracking encountered an error.");
                    handTrackingEnabledRef.current = false;
                setHandTrackingEnabledState(false);
                return;
            }

            animationFrameRef.current = requestAnimationFrame(predict);
        };

        const startCamera = async () => {
            setHandTrackingError(null);

            if (!navigator.mediaDevices?.getUserMedia) {
                setHandTrackingError(
                    "Camera access is not supported in this browser.",
                );
                handTrackingEnabledRef.current = false;
                setHandTrackingEnabledState(false);
                return;
            }

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
                    setHandTrackingError("Hand tracking failed to initialize.");
                    stream.getTracks().forEach((track) => track.stop());
                    streamRef.current = null;
                    handTrackingEnabledRef.current = false;
                    setHandTrackingEnabledState(false);
                    return;
                }

                if (!canceled) {
                    animationFrameRef.current = requestAnimationFrame(predict);
                }
            } catch (err) {
                console.error("Camera access denied:", err);
                setHandTrackingError(getCameraErrorMessage(err));
                handTrackingEnabledRef.current = false;
                setHandTrackingEnabledState(false);
            }
        };

        startCamera();

        return () => {
            canceled = true;
            stopHandTracking();
        };
    }, [handTrackingEnabled, stopHandTracking]);

    return (
        <SensingContext.Provider
            value={{
                handPosition,
                hoveredElement,
                handTrackingEnabled,
                setHandTrackingEnabled,
                handTrackingError,
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
