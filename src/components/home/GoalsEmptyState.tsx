import { Button } from '@/components/ui/button';
import rinonEmpty from '@/assets/rinon-empty.png';

interface GoalsEmptyStateProps {
  onCreateGoal: () => void;
}

export function GoalsEmptyState({ onCreateGoal }: GoalsEmptyStateProps) {
  return (
    <div className="card-base w-full flex flex-col items-center text-center !p-0 overflow-hidden">
      {/* Content area with padding */}
      <div className="pt-8 px-6 pb-6 flex flex-col items-center">
        <h2 className="text-foreground text-xl font-bold mb-2">No goals yet!</h2>
        <p className="text-muted-foreground text-base mb-6">
          Make your first goal to get started
        </p>
        <Button onClick={onCreateGoal} size="lg">
          Make a goal
        </Button>
      </div>
      
      {/* Character image centered and flush to bottom */}
      <img
        src={rinonEmpty}
        alt="Rinon character"
        className="w-[120px] h-auto object-contain mt-2 mx-auto"
      />
    </div>
  );
}
