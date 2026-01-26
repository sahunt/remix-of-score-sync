import { cn } from "@/lib/utils";

export interface IconProps {
  /** Material Symbol name (e.g., "home", "search", "upload") */
  name: string;
  /** Size in pixels - defaults to 24 */
  size?: 16 | 20 | 24 | 28 | 32 | 40 | 48;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Material Symbols Rounded icon component.
 * Uses Google's Material Symbols with rounded, filled style.
 * 
 * @example
 * <Icon name="home" />
 * <Icon name="search" size={20} />
 * <Icon name="upload" className="text-primary" />
 */
export function Icon({ name, size = 24, className }: IconProps) {
  return (
    <span
      className={cn("material-symbols-rounded select-none", className)}
      style={{
        fontSize: size,
        width: size,
        height: size,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
