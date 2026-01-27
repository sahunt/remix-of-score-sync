import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Icon, type IconProps } from "./Icon";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-primary bg-transparent text-foreground hover:bg-primary/10 hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5 text-sm rounded-full",
        sm: "h-9 px-4 text-sm rounded-full",
        lg: "h-12 px-6 text-base rounded-full",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Material Symbol icon name to show before text */
  iconLeft?: string;
  /** Material Symbol icon name to show after text */
  iconRight?: string;
  /** Icon size - defaults based on button size */
  iconSize?: IconProps["size"];
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, iconLeft, iconRight, iconSize, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    // Determine icon size based on button size
    const resolvedIconSize = iconSize ?? (size === "sm" ? 20 : size === "lg" ? 24 : 20);
    
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        {...props}
      >
        {iconLeft && <Icon name={iconLeft} size={resolvedIconSize} />}
        {children}
        {iconRight && <Icon name={iconRight} size={resolvedIconSize} />}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
