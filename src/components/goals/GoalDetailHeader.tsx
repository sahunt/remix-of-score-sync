import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GoalDetailHeaderProps {
  onBack: () => void;
}

export function GoalDetailHeader({ onBack }: GoalDetailHeaderProps) {
  return (
    <header className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="h-10 w-10 rounded-full"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-xl font-semibold text-foreground">Goal Details</h1>
    </header>
  );
}
