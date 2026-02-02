import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './Icon';

interface BackToTopButtonProps {
  threshold?: number; // Pixels scrolled before showing
  className?: string;
}

export function BackToTopButton({ threshold = 600, className }: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        'fixed bottom-[180px] right-[28px] z-40 h-11 w-11 rounded-full',
        'bg-secondary/90 backdrop-blur-md text-foreground shadow-lg',
        'flex items-center justify-center',
        'transition-all duration-300 ease-out',
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4 pointer-events-none',
        'active:scale-95',
        className
      )}
      aria-label="Back to top"
    >
      <Icon name="arrow_upward" size={24} />
    </button>
  );
}
