import { cn } from '@/lib/utils';

interface QuickPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

// Stage-aware prompts will be selected based on player profile
// For now we show prompts suitable for intermediate/advanced players
const QUICK_PROMPTS = [
  { label: 'My strengths', message: 'What are my strengths? Be specific with numbers.' },
  { label: 'Weaknesses', message: 'What are my biggest weaknesses? Be honest.' },
  { label: 'Am I ready for the next level?', message: 'Am I ready to push into the next difficulty level, or should I lock in my current level first?' },
  { label: 'Songs for today', message: 'Give me 3-5 songs to play today based on what I need to work on.' },
];

export function QuickPrompts({ onSelect, disabled }: QuickPromptsProps) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3">
      {QUICK_PROMPTS.map((prompt) => (
        <button
          key={prompt.label}
          onClick={() => onSelect(prompt.message)}
          disabled={disabled}
          className={cn(
            'px-3 py-2 rounded-full text-sm font-medium transition-all',
            'bg-secondary text-foreground',
            'hover:bg-secondary/80 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {prompt.label}
        </button>
      ))}
    </div>
  );
}
