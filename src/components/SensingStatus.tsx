import React from "react";
import { useSensing } from "./SensingProvider";
import { Mic, Hand, Camera } from "lucide-react";

export const SensingStatus: React.FC = () => {
    const { handPosition, lastVoiceCommand, handTrackingEnabled } = useSensing();

    const handClasses = handTrackingEnabled
        ? handPosition
            ? "bg-green-500/20 border-green-500 text-green-500"
            : "bg-yellow-500/15 border-yellow-500/60 text-yellow-300"
        : "bg-gray-500/20 border-gray-500 text-gray-500";

    const cameraClasses = handTrackingEnabled
        ? "bg-green-500/20 border-green-500 text-green-500"
        : "bg-gray-500/20 border-gray-500 text-gray-500";

    const micClasses = "bg-gray-500/20 border-gray-500 text-gray-500";

    return (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 items-end pointer-events-none z-[9999]">
            <div className="flex gap-2">
                <div className={`p-2 rounded-full backdrop-blur-md border ${handClasses} transition-colors shadow-lg`}>
                    <Hand size={20} />
                </div>
                <div className={`p-2 rounded-full backdrop-blur-md border ${cameraClasses} shadow-lg`}>
                    <Camera size={20} />
                </div>
                <div className={`p-2 rounded-full backdrop-blur-md border ${micClasses} shadow-lg`}>
                    <Mic size={20} />
                </div>
            </div>

            {lastVoiceCommand && (
                <div className="bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-md border border-white/20 text-sm animate-in fade-in slide-in-from-bottom-2">
                    " {lastVoiceCommand} "
                </div>
            )}
        </div>
    );
};
