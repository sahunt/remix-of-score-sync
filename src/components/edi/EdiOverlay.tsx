import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EDI_ICON_ID } from "@/hooks/useEdiMinimize";
import { useEdiOverlay } from "@/contexts/EdiOverlayContext";
import Edi from "@/pages/Edi";

// Custom event for Edi icon bounce
const EDI_BOUNCE_EVENT = "edi-icon-bounce";

export function triggerEdiBounce() {
  window.dispatchEvent(new CustomEvent(EDI_BOUNCE_EVENT));
}

function getEdiIconCenter(): { x: number; y: number } | null {
  const el = document.getElementById(EDI_ICON_ID);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function EdiOverlay() {
  const { isOpen, phase, setPhase, close } = useEdiOverlay();
  const [originStyle, setOriginStyle] = useState<React.CSSProperties>({ transformOrigin: "50% 100%" });

  // Capture icon position when opening
  useEffect(() => {
    if (phase === "opening") {
      const center = getEdiIconCenter();
      if (center) {
        setOriginStyle({ transformOrigin: `${center.x}px ${center.y}px` });
      }
      setPhase("open");
    }
  }, [phase, setPhase]);

  const handleExitComplete = useCallback(() => {
    setPhase("idle");
    triggerEdiBounce();
  }, [setPhase]);

  const handleClose = useCallback(() => {
    // Recalculate icon position for exit animation
    const center = getEdiIconCenter();
    if (center) {
      setOriginStyle({ transformOrigin: `${center.x}px ${center.y}px` });
    }
    close();
  }, [close]);

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && (
        <motion.div
          key="edi-overlay"
          initial={{ opacity: 1, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 20 }}
          exit={{ opacity: 0.6, scale: 0.4, y: 500 }}
          transition={{
            type: "spring",
            damping: 28,
            stiffness: 220,
            mass: 0.8,
          }}
          style={originStyle}
          className="fixed inset-0 z-50 flex flex-col bg-background w-full max-w-[720px] mx-auto rounded-[20px] overflow-hidden"
        >
          <Edi onMinimize={handleClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { EDI_BOUNCE_EVENT };
