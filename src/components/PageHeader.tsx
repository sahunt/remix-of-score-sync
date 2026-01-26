import { ReactNode } from 'react';
import { LastUploadBadge } from './LastUploadBadge';

interface PageHeaderProps {
  title: string;
  description?: string;
  showLastUpload?: boolean;
  actions?: ReactNode;
}

export function PageHeader({ title, description, showLastUpload = true, actions }: PageHeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 px-4 py-4">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {showLastUpload && <LastUploadBadge className="mt-2" />}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
