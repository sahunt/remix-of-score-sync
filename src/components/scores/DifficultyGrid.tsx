import { DifficultyChip } from './DifficultyChip';

interface DifficultyGridProps {
  selectedLevel: number | null;
  onSelectLevel: (level: number | null) => void;
}

const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export function DifficultyGrid({ selectedLevel, onSelectLevel }: DifficultyGridProps) {
  const handleClick = (level: number) => {
    // Toggle selection - clicking same level deselects
    onSelectLevel(selectedLevel === level ? null : level);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-[14px] font-semibold text-white">Rating</h2>
      <div className="flex flex-wrap gap-2">
        {DIFFICULTY_LEVELS.map((level) => (
          <DifficultyChip
            key={level}
            level={level}
            selected={selectedLevel === level}
            onClick={() => handleClick(level)}
          />
        ))}
      </div>
    </section>
  );
}
