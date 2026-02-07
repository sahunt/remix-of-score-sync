import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [animStyle, setAnimStyle] = useState<React.CSSProperties>({});

  // Opening animation
  useEffect(() => {
    if (phase !== 'opening') return;
    const container = containerRef.current;
    const iconCenter = getEdiIconCenter();
    if (!container || !iconCenter) {
      setPhase('open');
      return;
    }

    const rect = container.getBoundingClientRect();
    const dx = iconCenter.x - (rect.left + rect.width / 2);
    const dy = iconCenter.y - (rect.top + rect.height / 2);

    // Start from icon position
    setAnimStyle({
      transform: `translate(${dx}px, ${dy}px) scale(0.05)`,
      opacity: 0,
    });

    // Force reflow then animate to full
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimStyle({
          transform: 'translate(0, 0) scale(1)',
          opacity: 1,
          transition: 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms cubic-bezier(0.4, 0, 0.2, 1)',
        });
        setTimeout(() => setPhase('open'), 320);
      });
    });
  }, [phase, setPhase]);

  const handleMinimize = useCallback(() => {
    const container = containerRef.current;
    const iconCenter = getEdiIconCenter();
    if (!container || !iconCenter) {
      setPhase('idle');
      triggerEdiBounce();
      return;
    }

    const rect = container.getBoundingClientRect();
    const dx = iconCenter.x - (rect.left + rect.width / 2);
    const dy = iconCenter.y - (rect.top + rect.height / 2);

    setAnimStyle({
      transform: `translate(${dx}px, ${dy}px) scale(0.05)`,
      opacity: 0,
      transition: 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: 'none',
    });

    setTimeout(() => {
      setPhase('idle');
      setAnimStyle({});
      triggerEdiBounce();
    }, 320);
  }, [setPhase]);

  // When phase is set to 'closing', trigger the minimize animation
  useEffect(() => {
    if (phase === 'closing') {
      handleMinimize();
    }
  }, [phase, handleMinimize]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-background w-full max-w-[720px] mx-auto"
      style={animStyle}
    >
      <Edi onMinimize={close} />
    </div>
  );
}

export { EDI_BOUNCE_EVENT };
