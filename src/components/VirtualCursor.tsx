import React from "react";
import { useSensing } from "./SensingProvider";
import { motion, AnimatePresence } from "framer-motion";

export const VirtualCursor: React.FC = () => {
    const { handPosition, hoveredElement } = useSensing();

    return (
        <AnimatePresence>
            {handPosition && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        x: handPosition.x - 16,
                        y: handPosition.y - 16,
                        scale: hoveredElement ? 1.5 : 1,
                        opacity: 1,
                        backgroundColor: hoveredElement ? "rgba(59, 130, 246, 0.5)" : "rgba(255, 255, 255, 0.5)"
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300, mass: 0.5 }}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border: "2px solid white",
                        pointerEvents: "none",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backdropFilter: "blur(4px)",
                        boxShadow: "0 0 15px rgba(0,0,0,0.2)"
                    }}
                >
                    <div style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        backgroundColor: "white"
                    }} />
                </motion.div>
            )}
        </AnimatePresence>
    );
};
