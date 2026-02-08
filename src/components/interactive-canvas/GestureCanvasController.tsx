/**
 * GestureCanvasController
 * 
 * This component integrates hand gesture recognition directly into the canvas.
 * When gestures are detected, it dynamically spawns GestureDataExplorer components
 * onto the canvas based on the gesture sequence.
 */

import * as React from "react";
import { useSensing } from "@/components/SensingProvider";
import { GestureDataExplorer } from "@/components/tambo/GestureDataExplorer";
import { emitTamboShowComponent } from "@/lib/tambo-canvas-events";
import { cn } from "@/lib/utils";
import {
    Hand,
    Sparkles,
    Camera,
    CameraOff,
    RefreshCw,
    Eye,
    EyeOff,
} from "lucide-react";
import type { HandGesture } from "@/lib/hand-gestures";

const GESTURE_SEQUENCE_TIMEOUT_MS = 2000;
const MAX_SEQUENCE_LENGTH = 3;
const GESTURE_DEBOUNCE_MS = 400;
const AUTO_SPAWN_DELAY_MS = 800; // Delay before auto-spawning component

// Gesture sequence to action mapping
type GestureAction =
    | "show_summary"
    | "show_by_category"
    | "show_by_region"
    | "show_top_products"
    | "show_trends"
    | "show_recent_orders"
    | "filter_profitable"
    | "compare_regions";

const gestureSequenceMapping: Record<string, GestureAction> = {
    openPalm: "show_summary",
    thumbsUp: "show_top_products",
    peaceSign: "show_by_category",
    "openPalm_thumbsUp": "show_trends",
    "openPalm_peaceSign": "show_by_region",
    "thumbsUp_peaceSign": "filter_profitable",
    "peaceSign_thumbsUp": "compare_regions",
    "thumbsUp_openPalm": "show_recent_orders",
};

const actionLabels: Record<GestureAction, string> = {
    show_summary: "Sales Overview",
    show_by_category: "Category Breakdown",
    show_by_region: "Regional Analysis",
    show_top_products: "Top Products",
    show_trends: "Monthly Trends",
    show_recent_orders: "Recent Orders",
    filter_profitable: "Most Profitable",
    compare_regions: "Region Comparison",
};

const gestureEmojis: Record<HandGesture, string> = {
    openPalm: "✋",
    thumbsUp: "👍",
    peaceSign: "✌️",
    pinch: "🤏",
};

function getActionFromSequence(sequence: HandGesture[]): GestureAction {
    if (sequence.length === 0) return "show_summary";

    if (sequence.length >= 2) {
        const lastTwo = `${sequence[sequence.length - 2]}_${sequence[sequence.length - 1]}`;
        if (lastTwo in gestureSequenceMapping) {
            return gestureSequenceMapping[lastTwo];
        }
    }

    const lastGesture = sequence[sequence.length - 1];
    if (lastGesture in gestureSequenceMapping) {
        return gestureSequenceMapping[lastGesture];
    }

    return "show_summary";
}

export function GestureCanvasController() {
    const {
        handTrackingEnabled,
        setHandTrackingEnabled,
        handTrackingInitializing,
        handTrackingError,
        handGesture,
        handPosition,
        gestureMappingEnabled,
        setGestureMappingEnabled,
    } = useSensing();

    const [gestureSequence, setGestureSequence] = React.useState<HandGesture[]>([]);
    const [lastGestureTime, setLastGestureTime] = React.useState(0);
    const [isActive, setIsActive] = React.useState(false);
    const [lastSpawnedAction, setLastSpawnedAction] = React.useState<GestureAction | null>(null);
    const [pendingAction, setPendingAction] = React.useState<GestureAction | null>(null);
    const [showMiniStatus, setShowMiniStatus] = React.useState(true);

    const lastProcessedGestureRef = React.useRef<HandGesture | null>(null);
    const gestureDebounceRef = React.useRef<number | null>(null);
    const autoSpawnTimeoutRef = React.useRef<number | null>(null);
    const spawnCounterRef = React.useRef(0);

    // Track gesture sequences
    React.useEffect(() => {
        if (!isActive || !handGesture) return;

        const now = performance.now();

        // Reset sequence if too much time has passed
        if (now - lastGestureTime > GESTURE_SEQUENCE_TIMEOUT_MS && gestureSequence.length > 0) {
            setGestureSequence([]);
            lastProcessedGestureRef.current = null;
            setPendingAction(null);
        }

        // Clear any pending auto-spawn when new gesture detected
        if (autoSpawnTimeoutRef.current) {
            window.clearTimeout(autoSpawnTimeoutRef.current);
            autoSpawnTimeoutRef.current = null;
        }

        // Debounce gesture detection
        if (gestureDebounceRef.current) {
            window.clearTimeout(gestureDebounceRef.current);
        }

        gestureDebounceRef.current = window.setTimeout(() => {
            if (handGesture !== lastProcessedGestureRef.current) {
                setGestureSequence((prev) => {
                    const newSequence = [...prev, handGesture].slice(-MAX_SEQUENCE_LENGTH);
                    const action = getActionFromSequence(newSequence);
                    setPendingAction(action);

                    // Set up auto-spawn after a delay
                    autoSpawnTimeoutRef.current = window.setTimeout(() => {
                        spawnComponentForAction(action, newSequence);
                    }, AUTO_SPAWN_DELAY_MS);

                    return newSequence;
                });
                setLastGestureTime(performance.now());
                lastProcessedGestureRef.current = handGesture;
            }
        }, GESTURE_DEBOUNCE_MS);

        return () => {
            if (gestureDebounceRef.current) {
                window.clearTimeout(gestureDebounceRef.current);
            }
        };
    }, [handGesture, isActive, lastGestureTime, gestureSequence.length]);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (gestureDebounceRef.current) {
                window.clearTimeout(gestureDebounceRef.current);
            }
            if (autoSpawnTimeoutRef.current) {
                window.clearTimeout(autoSpawnTimeoutRef.current);
            }
        };
    }, []);

    const spawnComponentForAction = React.useCallback((action: GestureAction, sequence: HandGesture[]) => {
        spawnCounterRef.current += 1;
        const messageId = `gesture-explorer-${action}-${Date.now()}-${spawnCounterRef.current}`;

        // Calculate spawn position - center of viewport with slight offset based on count
        const offsetX = (spawnCounterRef.current % 3) * 60 - 60;
        const offsetY = (spawnCounterRef.current % 3) * 40 - 40;

        emitTamboShowComponent({
            messageId,
            component: (
                <GestureDataExplorer
                    gestureSequence={sequence}
                    action={action}
                />
            ),
            clientX: window.innerWidth / 2 + offsetX,
            clientY: window.innerHeight / 2 + offsetY,
            surfaceMeta: {
                domain: "research",
                intent: "analyze",
                query: { action, title: actionLabels[action] },
                actions: ["analyze", "summarize"],
            },
        });

        setLastSpawnedAction(action);
        setPendingAction(null);
        setGestureSequence([]);
        lastProcessedGestureRef.current = null;
    }, []);

    const handleToggleActive = React.useCallback(() => {
        if (!isActive) {
            setIsActive(true);
            if (!handTrackingEnabled) {
                setHandTrackingEnabled(true);
            }
            setGestureMappingEnabled(true);
        } else {
            setIsActive(false);
            setGestureSequence([]);
            setPendingAction(null);
            lastProcessedGestureRef.current = null;
            if (autoSpawnTimeoutRef.current) {
                window.clearTimeout(autoSpawnTimeoutRef.current);
                autoSpawnTimeoutRef.current = null;
            }
        }
    }, [isActive, handTrackingEnabled, setHandTrackingEnabled, setGestureMappingEnabled]);

    const handleCancelPending = React.useCallback(() => {
        if (autoSpawnTimeoutRef.current) {
            window.clearTimeout(autoSpawnTimeoutRef.current);
            autoSpawnTimeoutRef.current = null;
        }
        setPendingAction(null);
        setGestureSequence([]);
        lastProcessedGestureRef.current = null;
    }, []);

    const gestureLabel = React.useMemo(() => {
        if (!handTrackingEnabled) return "Camera off";
        if (handTrackingInitializing) return "Starting...";
        if (!handPosition) return "No hand detected";
        if (!handGesture) return "Waiting...";
        return `${gestureEmojis[handGesture]} ${handGesture}`;
    }, [handTrackingEnabled, handTrackingInitializing, handPosition, handGesture]);

    return (
        <>
            {/* Floating Control Panel - Bottom Left */}
            <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
                {/* Main Toggle Button */}
                <button
                    type="button"
                    onClick={handleToggleActive}
                    disabled={handTrackingInitializing}
                    className={cn(
                        "group flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm transition-all duration-300",
                        "shadow-lg hover:shadow-xl backdrop-blur-xl border",
                        isActive
                            ? "bg-gradient-to-r from-emerald-500/90 to-blue-500/90 text-white border-emerald-400/30"
                            : "bg-card/90 text-foreground border-border/50 hover:bg-card",
                        handTrackingInitializing && "opacity-60 cursor-wait"
                    )}
                >
                    {handTrackingInitializing ? (
                        <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : isActive ? (
                        <Sparkles className="h-5 w-5" />
                    ) : (
                        <Hand className="h-5 w-5" />
                    )}
                    <span>
                        {handTrackingInitializing
                            ? "Starting camera..."
                            : isActive
                                ? "Gesture Mode Active"
                                : "Enable Gesture Mode"}
                    </span>
                    {isActive && (
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                        </span>
                    )}
                </button>

                {/* Status Panel - Shows when active */}
                {isActive && showMiniStatus && (
                    <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-xl overflow-hidden">
                        {/* Current Gesture Status */}
                        <div className="px-4 py-3 border-b border-border/30">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "h-2 w-2 rounded-full",
                                        handPosition ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                                    )} />
                                    <span className="text-sm font-medium text-foreground">
                                        {gestureLabel}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowMiniStatus(false)}
                                    className="p-1 rounded hover:bg-muted/50 text-muted-foreground transition-colors"
                                >
                                    <EyeOff className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Gesture Sequence Display */}
                        {gestureSequence.length > 0 && (
                            <div className="px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-blue-500/10">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Sequence:</span>
                                    <div className="flex items-center gap-1">
                                        {gestureSequence.map((g, idx) => (
                                            <React.Fragment key={idx}>
                                                <span className="text-lg">{gestureEmojis[g]}</span>
                                                {idx < gestureSequence.length - 1 && (
                                                    <span className="text-muted-foreground">→</span>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pending Action Preview */}
                        {pendingAction && (
                            <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-t border-border/20">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <div className="text-xs text-muted-foreground">
                                            Spawning in...
                                        </div>
                                        <div className="text-sm font-semibold text-foreground">
                                            {actionLabels[pendingAction]}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCancelPending}
                                        className="px-2 py-1 rounded-lg text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-2 h-1 rounded-full bg-muted/30 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse"
                                        style={{
                                            width: '100%',
                                            animation: `shrink ${AUTO_SPAWN_DELAY_MS}ms linear forwards`
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Quick Reference */}
                        <div className="px-4 py-2 text-[10px] text-muted-foreground">
                            <span className="font-medium text-foreground">Gestures:</span>{" "}
                            ✋ Overview · 👍 Products · ✌️ Categories
                        </div>
                    </div>
                )}

                {/* Minimized status indicator */}
                {isActive && !showMiniStatus && (
                    <button
                        type="button"
                        onClick={() => setShowMiniStatus(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/90 backdrop-blur-xl border border-border/50 text-sm hover:bg-card transition-colors"
                    >
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Show status</span>
                        {gestureSequence.length > 0 && (
                            <span className="flex items-center gap-0.5">
                                {gestureSequence.map((g, idx) => (
                                    <span key={idx} className="text-base">{gestureEmojis[g]}</span>
                                ))}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Error Toast */}
            {handTrackingError && (
                <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm max-w-xs backdrop-blur-xl shadow-lg">
                    <div className="font-medium">Camera Error</div>
                    <div className="text-xs mt-1 opacity-80">{handTrackingError}</div>
                </div>
            )}

            {/* CSS Animation for progress bar */}
            <style>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </>
    );
}
