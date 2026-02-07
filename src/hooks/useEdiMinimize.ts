import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Custom event for Edi icon bounce
export const EDI_BOUNCE_EVENT = 'edi-icon-bounce';
export const EDI_ICON_ID = 'edi-nav-icon';

export function getEdiIconRect(): DOMRect | null {
  const el = document.getElementById(EDI_ICON_ID);
  return el ? el.getBoundingClientRect() : null;
}

export function triggerEdiBounce() {
  window.dispatchEvent(new CustomEvent(EDI_BOUNCE_EVENT));
}

/**
 * Hook that returns a minimize handler for the Edi chat.
 * Animates the chat container shrinking toward the Edi nav icon,
 * then navigates away.
 */
export function useEdiMinimize(containerRef: React.RefObject<HTMLDivElement | null>) {
  const navigate = useNavigate();

  const minimize = useCallback(() => {
    const container = containerRef.current;
    const iconRect = getEdiIconRect();

    if (!container || !iconRect) {
      navigate('/home');
      return;
    }

    const containerRect = container.getBoundingClientRect();

    // Calculate translate to move center of container to center of icon
    const dx = (iconRect.left + iconRect.width / 2) - (containerRect.left + containerRect.width / 2);
    const dy = (iconRect.top + iconRect.height / 2) - (containerRect.top + containerRect.height / 2);

    // Set transform origin to center
    container.style.transformOrigin = 'center center';
    container.style.transition = 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 320ms cubic-bezier(0.4, 0, 0.2, 1)';
    container.style.transform = `translate(${dx}px, ${dy}px) scale(0.05)`;
    container.style.opacity = '0';

    setTimeout(() => {
      triggerEdiBounce();
      navigate('/home');
    }, 320);
  }, [containerRef, navigate]);

  return minimize;
}
