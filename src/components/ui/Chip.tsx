import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

const chipVariants = cva(
  "inline-flex items-center justify-center gap-1.5 font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground",
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border bg-transparent text-foreground",
        muted: "bg-muted text-muted-foreground",
      },
      size: {
        default: "h-[34px] px-4 text-sm rounded-[10px]",
        sm: "h-7 px-3 text-xs rounded-lg",
        lg: "h-10 px-5 text-base rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chipVariants> {
  /** Material Symbol icon name */
  icon?: string;
  /** Render as interactive/clickable */
  interactive?: boolean;
}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ className, variant, size, icon, interactive, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          chipVariants({ variant, size }),
          interactive && "cursor-pointer hover:opacity-80",
          className
        )}
        {...props}
      >
        {icon && <Icon name={icon} size={size === "sm" ? 16 : size === "lg" ? 24 : 20} />}
        {children}
      </div>
    );
  },
);
Chip.displayName = "Chip";

export { Chip, chipVariants };
