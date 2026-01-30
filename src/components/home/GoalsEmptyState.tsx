import { Button } from '@/components/ui/button';
import rinonEmpty from '@/assets/rinon-empty.png';

interface GoalsEmptyStateProps {
  onCreateGoal: () => void;
}

export function GoalsEmptyState({ onCreateGoal }: GoalsEmptyStateProps) {
  return (
    <div className="card-base w-full flex flex-col items-center text-center pt-8 pb-4">
      <h2 className="text-foreground text-xl font-bold mb-2">No goals yet!</h2>
      <p className="text-muted-foreground text-base mb-6">
        Make your first goal to get started
      </p>
      <Button onClick={onCreateGoal} size="lg" className="mb-4">
        Make a goal
      </Button>
      <img
        src={rinonEmpty}
        alt="Rinon character"
        className="w-[120px] h-auto object-contain"
      />
    </div>
  );
}
