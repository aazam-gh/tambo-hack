import React, { useEffect } from "react";
import { useSensing } from "./SensingProvider";

export const VoiceCommandHandler: React.FC = () => {
    const { lastVoiceCommand, hoveredElement } = useSensing();

    useEffect(() => {
        if (!lastVoiceCommand) return;

        const command = lastVoiceCommand.toLowerCase();
        console.log("Processing voice command:", command);

        // Context-aware commands
        if (hoveredElement) {
            const interactableId = hoveredElement.getAttribute("data-interactable");
            console.log("Hovered element:", interactableId);

            if (command.includes("click") || command.includes("open") || command.includes("select")) {
                hoveredElement.click();
                return;
            }

            if (command.includes("what is this") || command.includes("tell me more")) {
                // Here we could integrate with TamboUI to show a generative explanation
                alert(`This is the ${interactableId}.`);
            }
        }
    }, [lastVoiceCommand, hoveredElement]);

    return null;
};

