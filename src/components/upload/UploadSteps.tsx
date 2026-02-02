import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

type UploadStep = 'uploading' | 'parsing' | 'matching' | 'complete';

interface UploadStepsProps {
  currentStep: UploadStep;
}

const STEPS: { id: UploadStep; label: string; icon: string }[] = [
  { id: 'uploading', label: 'Upload', icon: 'cloud_upload' },
  { id: 'parsing', label: 'Parse', icon: 'description' },
  { id: 'matching', label: 'Match', icon: 'search' },
  { id: 'complete', label: 'Done', icon: 'check_circle' },
];

function getStepIndex(step: UploadStep): number {
  return STEPS.findIndex(s => s.id === step);
}

export function UploadSteps({ currentStep }: UploadStepsProps) {
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 w-full px-4">
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step indicator */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                  isCompleted && 'bg-success/20',
                  isActive && 'bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background',
                  isPending && 'bg-muted'
                )}
              >
                <Icon
                  name={isCompleted ? 'check' : step.icon}
                  size={20}
                  className={cn(
                    'transition-colors duration-300',
                    isCompleted && 'text-success',
                    isActive && 'text-primary animate-pulse',
                    isPending && 'text-muted-foreground'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-xs font-medium transition-colors duration-300',
                  isCompleted && 'text-success',
                  isActive && 'text-primary',
                  isPending && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 mx-1 mb-5 transition-colors duration-300',
                  index < currentIndex ? 'bg-success' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
