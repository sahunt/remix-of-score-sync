import { NavLink } from 'react-router-dom';
import { Home, ListMusic, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/scores', icon: ListMusic, label: 'Scores' },
  { to: '/upload', icon: Upload, label: 'Upload' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'rounded-lg p-1.5 transition-all',
                    isActive && 'bg-primary/10 glow-primary'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
