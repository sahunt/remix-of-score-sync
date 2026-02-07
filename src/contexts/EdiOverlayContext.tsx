import { createContext, useContext, useState, useCallback, useRef } from 'react';

interface EdiOverlayState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Used internally by the overlay to track animation phase */
  phase: 'idle' | 'opening' | 'open' | 'closing';
  setPhase: (phase: EdiOverlayState['phase']) => void;
}

const EdiOverlayContext = createContext<EdiOverlayState | null>(null);

export function EdiOverlayProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<EdiOverlayState['phase']>('idle');

  const open = useCallback(() => {
    setIsOpen(true);
    setPhase('opening');
  }, []);

  const close = useCallback(() => {
    setPhase('closing');
    setIsOpen(false);
  }, []);

  // Called when close animation finishes
  const setPhaseWrapped = useCallback((p: EdiOverlayState['phase']) => {
    setPhase(p);
    if (p === 'idle') {
      setIsOpen(false);
    }
  }, []);

  return (
    <EdiOverlayContext.Provider value={{ isOpen, open, close, phase, setPhase: setPhaseWrapped }}>
      {children}
    </EdiOverlayContext.Provider>
  );
}

export function useEdiOverlay() {
  const ctx = useContext(EdiOverlayContext);
  if (!ctx) throw new Error('useEdiOverlay must be used within EdiOverlayProvider');
  return ctx;
}
