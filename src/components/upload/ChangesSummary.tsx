import { useState } from 'react';
import { ScoreChangeRow, type ScoreChange } from './ScoreChangeRow';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ChangesSummaryProps {
  changes: ScoreChange[];
}

const INITIAL_VISIBLE = 5;

export function ChangesSummary({ changes }: ChangesSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!changes || changes.length === 0) {
    return null;
  }
  
  const hasMore = changes.length > INITIAL_VISIBLE;
  const visibleChanges = hasMore && !isOpen ? changes.slice(0, INITIAL_VISIBLE) : changes;
  const hiddenCount = changes.length - INITIAL_VISIBLE;

  return (
    <div className="w-full rounded-lg bg-[#3B3F51] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Icon name="trending_up" size={16} className="text-success" />
          <span className="text-sm font-medium text-foreground">
            Updated Scores
          </span>
          <span className="text-xs text-muted-foreground">
            ({changes.length})
          </span>
        </div>
      </div>
      
      {/* Changes list */}
      <div className="divide-y divide-border/20">
        {visibleChanges.map((change, idx) => (
          <ScoreChangeRow key={idx} change={change} />
        ))}
      </div>
      
      {/* See all toggle */}
      {hasMore && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-10 text-xs text-muted-foreground hover:text-foreground border-t border-border/30 rounded-none"
            >
              {isOpen ? (
                <>
                  <span>Show less</span>
                  <Icon name="expand_less" size={16} className="ml-1" />
                </>
              ) : (
                <>
                  <span>See all ({hiddenCount} more)</span>
                  <Icon name="expand_more" size={16} className="ml-1" />
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="divide-y divide-border/20">
              {changes.slice(INITIAL_VISIBLE).map((change, idx) => (
                <ScoreChangeRow key={idx + INITIAL_VISIBLE} change={change} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
