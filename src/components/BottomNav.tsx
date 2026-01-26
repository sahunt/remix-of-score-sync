import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/home', icon: 'home', label: 'Home' },
  { to: '/scores', icon: 'music_note', label: 'Scores' },
  { to: '/upload', icon: 'upload', label: 'Upload' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-secondary/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map(({ to, icon, label }) => (
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
                  <Icon name={icon} size={24} />
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
