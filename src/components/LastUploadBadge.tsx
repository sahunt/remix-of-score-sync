import { formatDistanceToNow } from 'date-fns';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useLastUpload } from '@/hooks/useLastUpload';
import { cn } from '@/lib/utils';

interface LastUploadBadgeProps {
  className?: string;
}

export function LastUploadBadge({ className }: LastUploadBadgeProps) {
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

  const timeAgo = formatDistanceToNow(new Date(lastUpload.created_at), { addSuffix: true });
  const isParsed = lastUpload.parse_status === 'parsed';
  const isFailed = lastUpload.parse_status === 'failed';

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      {isParsed ? (
        <CheckCircle className="h-3 w-3 text-success" />
      ) : isFailed ? (
        <XCircle className="h-3 w-3 text-destructive" />
      ) : (
        <Loader2 className="h-3 w-3 animate-spin text-warning" />
      )}
      <span className="text-muted-foreground">
        Last upload: <span className="text-foreground">{timeAgo}</span>
      </span>
    </div>
  );
}
