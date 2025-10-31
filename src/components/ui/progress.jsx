import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => {
  // Determine color based on progress value - each phase completion turns more green
  const getProgressColor = (val) => {
    if (val >= 85) return "bg-green-600"; // Phase 6-7: Full green
    if (val >= 71) return "bg-green-500"; // Phase 5: Light green
    if (val >= 57) return "bg-blue-600"; // Phase 4: Blue (in progress)
    if (val >= 43) return "bg-blue-500"; // Phase 3: Light blue
    if (val >= 29) return "bg-indigo-500"; // Phase 2: Indigo
    return "bg-slate-600"; // Phase 1: Gray (just started)
  };

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-slate-200",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all duration-500",
          getProgressColor(value)
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }