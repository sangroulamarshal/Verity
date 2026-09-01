import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const variantClasses = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary-hover shadow-none",
  destructive:
    "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-elevated hover:text-foreground",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-elevated",
  ghost:
    "bg-transparent text-muted-foreground hover:bg-elevated hover:text-foreground",
  link:
    "bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto",
};

const sizeClasses = {
  default: "h-8 px-3.5 py-1.5 text-[13px] gap-1.5",
  sm:      "h-7 px-2.5 py-1 text-[12px] gap-1",
  lg:      "h-9 px-4 py-2 text-sm gap-2",
  icon:    "h-8 w-8 p-0",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium",
        "transition-colors duration-150 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-40",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
