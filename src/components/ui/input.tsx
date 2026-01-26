import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";
import { Label } from "./label";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Label text displayed above the input */
  label?: string;
  /** Material Symbol icon name for left icon */
  iconLeft?: string;
  /** Material Symbol icon name for right icon */
  iconRight?: string;
  /** Error message to display */
  error?: string;
  /** Hint text displayed below the input */
  hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, iconLeft, iconRight, error, hint, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <Label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </Label>
        )}
        <div className="relative">
          {iconLeft && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Icon name={iconLeft} size={20} />
            </div>
          )}
          <input
            type={type}
            id={inputId}
            className={cn(
              "flex h-11 w-full rounded-[10px] border border-border bg-input px-3 py-2.5 text-base text-foreground ring-offset-background",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              iconLeft && "pl-10",
              iconRight && "pr-10",
              error && "border-destructive focus-visible:ring-destructive",
              className,
            )}
            ref={ref}
            {...props}
          />
          {iconRight && (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Icon name={iconRight} size={20} />
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {hint && !error && (
          <p className="text-sm text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
