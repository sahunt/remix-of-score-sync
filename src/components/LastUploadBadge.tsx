import { formatDistanceToNow } from 'date-fns';
import { Clock, Loader2 } from 'lucide-react';
import { useLastUpload } from '@/hooks/useLastUpload';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

interface LastUploadBadgeProps {
  className?: string;
  variant?: 'default' | 'header';
}

export function LastUploadBadge({ className, variant = 'default' }: LastUploadBadgeProps) {
  const { lastUpload, loading } = useLastUpload();

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!lastUpload) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        <Clock className="h-3 w-3" />
        <span>No uploads yet</span>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(lastUpload.created_at));

  // Header variant - shows sync icon and "X AGO" format
  if (variant === 'header') {
    return (
      <div className="flex items-center gap-1.5 text-white">
        <Icon name="sync" size={16} />
        <span 
          className="font-bold uppercase"
          style={{ 
            fontSize: '10px', 
            letterSpacing: '1px' 
          }}
        >
          {timeAgo.toUpperCase()} AGO
        </span>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <Icon name="sync" size={16} />
      <span>
        {timeAgo} ago
      </span>
    </div>
  );
}
