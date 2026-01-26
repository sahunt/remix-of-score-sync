import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export function BottomNav() {
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-3">
      {/* Home - Circle button */}
      <NavLink
        to="/home"
        className={({ isActive }) =>
          cn(
            'flex h-11 w-11 items-center justify-center rounded-full transition-all',
            'bg-secondary/90 backdrop-blur-md',
            isActive
              ? 'text-primary ring-2 ring-primary/50'
              : 'text-foreground hover:text-primary'
          )
        }
      >
        <Icon name="home" size={24} />
      </NavLink>

      {/* Scores - Wide pill button (center/main) */}
      <NavLink
        to="/scores"
        className={({ isActive }) =>
          cn(
            'flex h-11 items-center gap-2 rounded-full px-8 transition-all',
            'bg-secondary/90 backdrop-blur-md',
            isActive
              ? 'text-primary ring-2 ring-primary/50'
              : 'text-foreground hover:text-primary'
          )
        }
      >
        <Icon name="star" size={24} />
        <span className="font-medium">Scores</span>
      </NavLink>

      {/* Upload - Circle button */}
      <NavLink
        to="/upload"
        className={({ isActive }) =>
          cn(
            'flex h-11 w-11 items-center justify-center rounded-full transition-all',
            'bg-secondary/90 backdrop-blur-md',
            isActive
              ? 'text-primary ring-2 ring-primary/50'
              : 'text-foreground hover:text-primary'
          )
        }
      >
        <Icon name="upload" size={24} />
      </NavLink>
    </nav>
  );
}
