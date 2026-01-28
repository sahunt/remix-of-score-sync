import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Icon } from '@/components/ui/Icon';

interface ProfileSectionProps {
  number: number;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'default' | 'danger';
}

export function ProfileSection({ 
  number, 
  title, 
  children, 
  defaultOpen = false,
  variant = 'default'
}: ProfileSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-[10px] bg-[#262937] overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-4 p-5">
            {/* Number badge */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold flex-shrink-0",
              variant === 'danger' 
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            )}>
              {number}
            </div>
            
            {/* Title */}
            <span className={cn(
              "text-base font-medium flex-1 text-left",
              variant === 'danger' ? "text-destructive" : "text-foreground"
            )}>
              {title}
            </span>
            
            {/* Chevron */}
            <Icon 
              name={isOpen ? "expand_less" : "expand_more"} 
              size={24} 
              className="text-muted-foreground transition-transform duration-200"
            />
          </div>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-0">
            <div className="rounded-[10px] bg-[#3B3F51] p-4">
              {children}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
