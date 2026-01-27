import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SongCardPlaceholderProps {
  name: string;
  artist?: string;
  difficultyLevel: number | null;
  score: number | null;
  halo?: string | null;
  className?: string;
}

function getDifficultyClass(level: number | null): string {
  if (!level) return '';
  if (level <= 5) return 'difficulty-beginner';
  if (level <= 8) return 'difficulty-basic';
  if (level <= 12) return 'difficulty-difficult';
  if (level <= 16) return 'difficulty-expert';
  return 'difficulty-challenge';
}

export function SongCardPlaceholder({
  name,
  artist,
  difficultyLevel,
  score,
  halo,
  className,
}: SongCardPlaceholderProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[10px] bg-secondary p-3',
        className
      )}
    >
      {/* Album art placeholder */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
        <span className="text-muted-foreground text-xs">♪</span>
      </div>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate text-sm">{name}</p>
          {difficultyLevel && (
            <Badge
              variant="secondary"
              className={cn('text-xs px-1.5 py-0.5', getDifficultyClass(difficultyLevel))}
            >
              {difficultyLevel}
            </Badge>
          )}
        </div>
        <p className="text-lg font-bold text-foreground tabular-nums">
          {score?.toLocaleString() ?? '—'}
        </p>
      </div>

      {/* Halo indicator */}
      {halo && (
        <div className="flex-shrink-0">
          <Badge variant="outline" className="text-xs">
            {halo}
          </Badge>
        </div>
      )}

    </div>
  );
}
