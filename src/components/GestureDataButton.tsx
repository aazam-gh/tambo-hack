import * as React from "react";
import { cn } from "@/lib/utils";
import { useSensing } from "@/components/SensingProvider";
import { GestureDataExplorer } from "@/components/tambo/GestureDataExplorer";
import {
    Hand,
    X,
    Sparkles,
    RefreshCw,
    Camera,
    CameraOff,
    Wand2,
} from "lucide-react";
import type { HandGesture } from "@/lib/hand-gestures";

const GESTURE_SEQUENCE_TIMEOUT_MS = 2000; // Time window to build a sequence
const MAX_SEQUENCE_LENGTH = 3;

export type GestureDataButtonProps = {
    className?: string;
};

export function GestureDataButton({ className }: GestureDataButtonProps) {
    const {
        handTrackingEnabled,
        setHandTrackingEnabled,
        handTrackingInitializing,
        handTrackingError,
        handGesture,
        gestureMappingEnabled,
        setGestureMappingEnabled,
        handPosition,
    } = useSensing();

    const [isOpen, setIsOpen] = React.useState(false);
    const [gestureSequence, setGestureSequence] = React.useState<HandGesture[]>([]);
    const [lastGestureTime, setLastGestureTime] = React.useState(0);
    const [isRecording, setIsRecording] = React.useState(false);
    const lastProcessedGestureRef = React.useRef<HandGesture | null>(null);
    const gestureDebounceRef = React.useRef<number | null>(null);

    // Track gesture sequences when recording
    React.useEffect(() => {
        if (!isRecording || !handGesture) return;

        const now = performance.now();

        // Reset sequence if too much time has passed
        if (now - lastGestureTime > GESTURE_SEQUENCE_TIMEOUT_MS && gestureSequence.length > 0) {
            setGestureSequence([]);
            lastProcessedGestureRef.current = null;
        }

        // Debounce gesture detection to avoid duplicates
        if (gestureDebounceRef.current) {
            window.clearTimeout(gestureDebounceRef.current);
        }

        gestureDebounceRef.current = window.setTimeout(() => {
            // Only add if it's a new gesture (not the same as the last one in sequence)
            if (handGesture !== lastProcessedGestureRef.current) {
                setGestureSequence((prev) => {
                    const newSequence = [...prev, handGesture];
                    // Keep only the last MAX_SEQUENCE_LENGTH gestures
                    return newSequence.slice(-MAX_SEQUENCE_LENGTH);
                });
                setLastGestureTime(performance.now());
                lastProcessedGestureRef.current = handGesture;
            }
        }, 350); // 350ms debounce

        return () => {
            if (gestureDebounceRef.current) {
                window.clearTimeout(gestureDebounceRef.current);
            }
        };
    }, [handGesture, isRecording, lastGestureTime, gestureSequence.length]);

    // Handle button click to toggle the feature
    const handleButtonClick = React.useCallback(() => {
        if (!isOpen) {
            // Opening the panel
            setIsOpen(true);
            if (!handTrackingEnabled) {
                setHandTrackingEnabled(true);
            }
            setIsRecording(true);
        } else {
            // Closing the panel
            setIsOpen(false);
            setIsRecording(false);
            setGestureSequence([]);
            lastProcessedGestureRef.current = null;
        }
    }, [isOpen, handTrackingEnabled, setHandTrackingEnabled]);

    const handleStartTracking = React.useCallback(() => {
        setHandTrackingEnabled(true);
        setGestureMappingEnabled(true);
        setIsRecording(true);
    }, [setHandTrackingEnabled, setGestureMappingEnabled]);

    const handleStopTracking = React.useCallback(() => {
        setIsRecording(false);
        setGestureSequence([]);
        lastProcessedGestureRef.current = null;
    }, []);

    const handleResetSequence = React.useCallback(() => {
        setGestureSequence([]);
        lastProcessedGestureRef.current = null;
        setLastGestureTime(0);
    }, []);

    const gestureLabel = React.useMemo(() => {
        if (!handTrackingEnabled) return "Off";
        if (!handPosition) return "No hand detected";
        if (!handGesture) return "Waiting for gesture...";
        const labels: Record<HandGesture, string> = {
            openPalm: "✋ Open Palm",
            thumbsUp: "👍 Thumbs Up",
            peaceSign: "✌️ Peace Sign",
            pinch: "🤏 Pinch",
        };
        return labels[handGesture] || handGesture;
    }, [handTrackingEnabled, handPosition, handGesture]);

    return (
        <div className={cn("relative", className)}>
            {/* Floating Action Button */}
            <button
                type="button"
                onClick={handleButtonClick}
                disabled={handTrackingInitializing}
                className={cn(
                    "group relative flex items-center gap-2 px-4 py-3 rounded-2xl font-medium text-sm transition-all duration-300",
                    "shadow-lg hover:shadow-xl",
                    isOpen
                        ? "bg-gradient-to-r from-emerald-500 to-blue-500 text-white"
                        : "bg-gradient-to-r from-emerald-500/90 to-blue-500/90 text-white hover:from-emerald-500 hover:to-blue-500",
                    handTrackingInitializing && "opacity-60 cursor-wait"
                )}
            >
                {handTrackingInitializing ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                ) : isOpen ? (
                    <Sparkles className="h-5 w-5" />
                ) : (
                    <Hand className="h-5 w-5" />
                )}
                <span>
                    {handTrackingInitializing
                        ? "Starting camera..."
                        : isOpen
                            ? "Gesture Explorer Active"
                            : "Gesture Data Explorer"}
                </span>

                {/* Pulse indicator when active */}
                {isOpen && isRecording && (
                    <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                    </span>
                )}
            </button>

            {/* Error Toast */}
            {handTrackingError && (
                <div className="absolute top-full left-0 mt-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm max-w-xs">
                    {handTrackingError}
                </div>
            )}

            {/* Panel */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="relative flex flex-col gap-4">
                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={handleButtonClick}
                            className="absolute -top-2 -right-2 z-10 h-8 w-8 rounded-full bg-card border border-border/50 shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {/* Status Bar */}
                        <div className="w-[380px] rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                                        {isRecording ? (
                                            <>
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                Recording Gestures
                                            </>
                                        ) : (
                                            <>
                                                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                                                Ready
                                            </>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {gestureLabel}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Recording Toggle */}
                                    {handTrackingEnabled ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleResetSequence}
                                                disabled={gestureSequence.length === 0}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                                Reset
                                            </button>
                                            {isRecording ? (
                                                <button
                                                    type="button"
                                                    onClick={handleStopTracking}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                                                >
                                                    <CameraOff className="h-3 w-3" />
                                                    Pause
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsRecording(true)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                                >
                                                    <Camera className="h-3 w-3" />
                                                    Record
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleStartTracking}
                                            disabled={handTrackingInitializing}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                        >
                                            <Wand2 className="h-3 w-3" />
                                            Enable Camera
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Data Explorer */}
                        <GestureDataExplorer gestureSequence={gestureSequence} />

                        {/* Instructions */}
                        <div className="w-[380px] rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl p-4">
                            <div className="text-xs text-muted-foreground space-y-2">
                                <div className="font-semibold text-foreground mb-2">
                                    How it works:
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">✋</span>
                                        <span>Open Palm → Overview</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">👍</span>
                                        <span>Thumbs Up → Top Products</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">✌️</span>
                                        <span>Peace Sign → Categories</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">✋→👍</span>
                                        <span>Combo → Trends</span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border/30 mt-2">
                                    <span className="text-emerald-400">Pro tip:</span> Combine gestures
                                    for more views! Try ✋→✌️ for regions or 👍→✌️ for profitability.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
