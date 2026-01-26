import { useState, useEffect, useRef } from 'react';

type ScrollDirection = 'up' | 'down' | null;

interface UseScrollDirectionOptions {
  threshold?: number; // Minimum scroll delta before triggering direction change
  initialVisible?: boolean;
}

export function useScrollDirection({ 
  threshold = 10, 
  initialVisible = true 
}: UseScrollDirectionOptions = {}) {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollY.current;

      // Only update if we've scrolled past the threshold
      if (Math.abs(delta) < threshold) {
        ticking.current = false;
        return;
      }

      // At the very top of the page, always show
      if (scrollY < 10) {
        setIsVisible(true);
        setScrollDirection(null);
        lastScrollY.current = scrollY;
        ticking.current = false;
        return;
      }

      const newDirection = delta > 0 ? 'down' : 'up';
      
      if (newDirection !== scrollDirection) {
        setScrollDirection(newDirection);
        setIsVisible(newDirection === 'up');
      }

      lastScrollY.current = scrollY;
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, scrollDirection]);

  return { isVisible, scrollDirection };
}
