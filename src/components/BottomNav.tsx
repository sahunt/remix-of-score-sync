import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useScrollDirection } from '@/hooks/useScrollDirection';

export function BottomNav() {
  const { isVisible } = useScrollDirection({ threshold: 15 });

  return (
    <nav 
      className={cn(
        "fixed bottom-[46px] left-[28px] right-[28px] z-50 flex items-center justify-between",
        "transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "translate-y-[120px]"
      )}
    >
      {/* Home - Circle button, anchored left */}
      <NavLink
        to="/home"
        className="flex h-11 w-11 items-center justify-center rounded-full transition-all bg-secondary/90 backdrop-blur-md text-foreground"
      >
        <Icon name="home" size={24} />
      </NavLink>

      {/* Scores - Wide pill button, centered */}
      <NavLink
        to="/scores"
        className="flex h-11 items-center justify-center gap-2.5 rounded-full px-[22px] transition-all bg-secondary/90 backdrop-blur-md text-foreground"
      >
        <Icon name="star_shine" size={24} />
        <span className="font-medium">Scores</span>
      </NavLink>

      {/* Upload - Circle button, anchored right */}
      <NavLink
        to="/upload"
        className="flex h-11 w-11 items-center justify-center rounded-full transition-all bg-secondary/90 backdrop-blur-md text-foreground"
      >
        <Icon name="upload" size={24} />
      </NavLink>
    </nav>
  );
}
