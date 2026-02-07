import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EDI_ICON_ID } from '@/hooks/useEdiMinimize';
import { useEdiOverlay } from '@/contexts/EdiOverlayContext';
import Edi from '@/pages/Edi';

// Custom event for Edi icon bounce  
const EDI_BOUNCE_EVENT = 'edi-icon-bounce';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [iconOrigin, setIconOrigin] = useState<{ x: string; y: string } | null>(null);

  // Capture icon position when opening
  useEffect(() => {
    if (phase === 'opening') {
      const center = getEdiIconCenter();
      if (center) {
        setIconOrigin({
          x: `${center.x}px`,
          y: `${center.y}px`,
        });
      } else {
        setIconOrigin({ x: '50%', y: '100%' });
      }
      // Immediately mark as open — framer-motion handles the animation
      setPhase('open');
    }
  }, [phase, setPhase]);

  const handleAnimationComplete = useCallback((definition: string) => {
    if (definition === 'exit') {
      setPhase('idle');
      triggerEdiBounce();
    }
  }, [setPhase]);

  // Compute transform-origin from icon center
  const originStyle = iconOrigin
    ? { transformOrigin: `${iconOrigin.x} ${iconOrigin.y}` }
    : { transformOrigin: '50% 100%' };

  return (
    <AnimatePresence onExitComplete={() => {}}>
      {isOpen && (
        <motion.div
          ref={containerRef}
          key="edi-overlay"
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 60 }}
          transition={{
            type: 'spring',
            damping: 28,
            stiffness: 320,
            mass: 0.8,
          }}
          onAnimationComplete={handleAnimationComplete}
          style={originStyle}
          className="fixed inset-0 z-50 flex flex-col bg-background w-full max-w-[720px] mx-auto rounded-[20px] overflow-hidden"
        >
          <Edi onMinimize={close} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { EDI_BOUNCE_EVENT };
