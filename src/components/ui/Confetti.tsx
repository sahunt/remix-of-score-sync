import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  color: string;
  size: number;
  duration: number;
}

const COLORS = [
  '#FFD700', // Gold
  '#FF69B4', // Hot pink
  '#00CED1', // Dark cyan
  '#9370DB', // Medium purple
  '#32CD32', // Lime green
  '#FF6347', // Tomato
  '#00BFFF', // Deep sky blue
];

interface ConfettiProps {
  isActive: boolean;
  duration?: number; // How long to show confetti in ms
  pieceCount?: number;
}

export function Confetti({ isActive, duration = 3000, pieceCount = 50 }: ConfettiProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isActive && !isShowing) {
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = Array.from({ length: pieceCount }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 8 + Math.random() * 8,
        duration: 2 + Math.random() * 1.5,
      }));
      
      setPieces(newPieces);
      setIsShowing(true);

      // Clean up after duration
      const timeout = setTimeout(() => {
        setIsShowing(false);
        setPieces([]);
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [isActive, duration, pieceCount, isShowing]);

  if (!isShowing || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        >
          <div
            className="rounded-sm"
            style={{
              width: piece.size,
              height: piece.size * 0.6,
              backgroundColor: piece.color,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
