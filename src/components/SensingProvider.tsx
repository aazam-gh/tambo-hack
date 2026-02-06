import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { HandLandmarkerService } from "../services/HandLandmarker";

interface SensingContextType {
    handPosition: { x: number; y: number } | null;
    hoveredElement: HTMLElement | null;
    lastVoiceCommand: string;
}

const SensingContext = createContext<SensingContextType | undefined>(undefined);

export const SensingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
    const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
    const [lastVoiceCommand, setLastVoiceCommand] = useState("");
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const service = HandLandmarkerService.getInstance();
        let isRunning = true;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720 }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    await service.initialize();
                    if (isRunning) requestAnimationFrame(predict);
                }
            } catch (err) {
                console.error("Camera access denied:", err);
            }
        };

        const predict = () => {
            if (!isRunning) return;

            if (videoRef.current && videoRef.current.readyState >= 2) {
                const results = service.predict(videoRef.current, performance.now());
                if (results && results.landmarks && results.landmarks.length > 0) {
                    const indexFingerTip = results.landmarks[0][8]; // Index finger tip

                    // MediaPipe coordinates are normalized 0-1
                    // We flip X because camera is mirrored
                    const x = (1 - indexFingerTip.x) * window.innerWidth;
                    const y = indexFingerTip.y * window.innerHeight;

                    setHandPosition({ x, y });

                    // Find the top-most interactable element at this point
                    const element = document.elementFromPoint(x, y) as HTMLElement;
                    if (element) {
                        setHoveredElement(element.closest("[data-interactable]") as HTMLElement || null);
                    } else {
                        setHoveredElement(null);
                    }
                } else {
                    setHandPosition(null);
                    setHoveredElement(null);
                }
            }
            requestAnimationFrame(predict);
        };

        const startVoice = () => {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.lang = "en-US";

                recognition.onresult = (event: any) => {
                    const current = event.resultIndex;
                    const transcript = event.results[current][0].transcript.toLowerCase().trim();
                    setLastVoiceCommand(transcript);
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech Recognition Error:", event.error);
                };

                recognition.onend = () => {
                    if (isRunning) recognition.start();
                };

                recognition.start();
                recognitionRef.current = recognition;
            }
        };

        startCamera();
        startVoice();

        return () => {
            isRunning = false;
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    return (
        <SensingContext.Provider value={{ handPosition, hoveredElement, lastVoiceCommand }}>
            {children}
            <video
                ref={videoRef}
                style={{ display: "none" }}
                playsInline
            />
        </SensingContext.Provider>
    );
};

export const useSensing = () => {
    const context = useContext(SensingContext);
    if (!context) throw new Error("useSensing must be used within SensingProvider");
    return context;
};
