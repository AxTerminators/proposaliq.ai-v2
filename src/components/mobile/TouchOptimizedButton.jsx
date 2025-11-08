import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Touch-optimized button component for mobile
 * - Minimum 44x44px touch target (Apple/Google guidelines)
 * - Active state feedback
 * - Haptic-style visual feedback
 */
export default function TouchOptimizedButton({ 
  children, 
  className,
  size = "default",
  ...props 
}) {
  const sizeClasses = {
    sm: "min-h-[44px] min-w-[44px] px-4 text-sm",
    default: "min-h-[48px] min-w-[48px] px-5 text-base",
    lg: "min-h-[52px] min-w-[52px] px-6 text-lg",
    icon: "h-[44px] w-[44px]"
  };

  return (
    <Button
      className={cn(
        sizeClasses[size],
        "active:scale-95 transition-transform touch-manipulation",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}