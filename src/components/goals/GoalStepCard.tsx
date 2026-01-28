import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface GoalStepCardProps {
  stepNumber: number;
  title: string;
  summary?: string;
  isComplete: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function GoalStepCard({
  stepNumber,
  title,
  summary,
  isComplete,
  isExpanded,
  onToggle,
  children,
  disabled = false,
}: GoalStepCardProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={disabled ? undefined : onToggle}>
      <div
        className={cn(
          "rounded-[10px] transition-all duration-300",
          isExpanded
            ? "bg-[#262937] border-2 border-primary/30"
            : "bg-[#262937]/50 border-2 border-transparent",
          disabled && "opacity-50"
        )}
      >
        {/* Header - always visible */}
        <CollapsibleTrigger
          className={cn(
            "w-full flex items-center gap-3 p-4 text-left",
            disabled && "cursor-not-allowed"
          )}
          disabled={disabled}
        >
          {/* Step number or checkmark */}
          <div
            className={cn(
              "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
              isComplete
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isComplete ? (
              <Check className="w-4 h-4" />
            ) : (
              stepNumber
            )}
          </div>

          {/* Title and summary */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "font-medium text-sm",
              isComplete ? "text-foreground" : "text-muted-foreground"
            )}>
              {title}
            </p>
            {!isExpanded && summary && (
              <p className="text-xs text-primary truncate mt-0.5">
                {summary}
              </p>
            )}
          </div>

          {/* Expand/collapse indicator */}
          <ChevronDown
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          />
        </CollapsibleTrigger>

        {/* Content - collapsible */}
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <div className="px-4 pb-4 pt-0">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
