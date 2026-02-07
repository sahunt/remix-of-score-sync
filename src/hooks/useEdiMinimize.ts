import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Custom event for Edi icon bounce
export const EDI_BOUNCE_EVENT = 'edi-icon-bounce';
export const EDI_ICON_ID = 'edi-nav-icon';

// Key for persisting icon position across route changes
const ICON_POS_KEY = 'edi-icon-pos';

export function getEdiIconRect(): DOMRect | null {
  const el = document.getElementById(EDI_ICON_ID);
  return el ? el.getBoundingClientRect() : null;
}

/** Save the Edi icon's position so the Edi page can animate from it */
export function saveEdiIconPosition() {
  const rect = getEdiIconRect();
  if (rect) {
    sessionStorage.setItem(ICON_POS_KEY, JSON.stringify({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }));
  }
}

/** Get the saved icon center position (works even when icon is unmounted) */
export function getSavedIconCenter(): { x: number; y: number } | null {
  const raw = sessionStorage.getItem(ICON_POS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function triggerEdiBounce() {
  window.dispatchEvent(new CustomEvent(EDI_BOUNCE_EVENT));
}

/**
 * Hook that returns a minimize handler for the Edi chat.
 * Animates the chat container shrinking toward the saved Edi nav icon position,
 * then navigates away and triggers a bounce on arrival.
 */
export function useEdiMinimize(containerRef: React.RefObject<HTMLDivElement | null>) {
  const navigate = useNavigate();

  const minimize = useCallback(() => {
    const container = containerRef.current;
    const iconCenter = getSavedIconCenter();

    if (!container || !iconCenter) {
      navigate('/home');
      // Bounce after nav settles
      setTimeout(() => triggerEdiBounce(), 50);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const dx = iconCenter.x - (containerRect.left + containerRect.width / 2);
    const dy = iconCenter.y - (containerRect.top + containerRect.height / 2);

    // Animate shrink
    container.style.transformOrigin = 'center center';
    container.style.transition = 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms cubic-bezier(0.4, 0, 0.2, 1)';
    container.style.transform = `translate(${dx}px, ${dy}px) scale(0.05)`;
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';

    setTimeout(() => {
      navigate('/home');
      // Bounce after the home page mounts and renders the nav
      setTimeout(() => triggerEdiBounce(), 100);
    }, 320);
  }, [containerRef, navigate]);

  return minimize;
}
