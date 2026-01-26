import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export function BottomNav() {
  return (
    <nav className="fixed bottom-[46px] left-[28px] right-[28px] z-50 flex items-center justify-between">
      {/* Home - Circle button, anchored left */}
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

      {/* Scores - Wide pill button, centered */}
      <NavLink
        to="/scores"
        className={({ isActive }) =>
          cn(
            'flex h-11 items-center justify-center gap-2.5 rounded-full px-[22px] transition-all',
            'bg-secondary/90 backdrop-blur-md',
            isActive
              ? 'text-primary ring-2 ring-primary/50'
              : 'text-foreground hover:text-primary'
          )
        }
      >
        <Icon name="stars" size={24} />
        <span className="font-medium">Scores</span>
      </NavLink>

      {/* Upload - Circle button, anchored right */}
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
