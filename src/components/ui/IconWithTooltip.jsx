import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * IconWithTooltip - Universal component for showing icon descriptions on hover
 * 
 * Usage:
 * <IconWithTooltip icon={Settings} label="Settings" />
 * <IconWithTooltip icon={Plus} label="Create new proposal" className="w-5 h-5" />
 */
export default function IconWithTooltip({ 
  icon: Icon, 
  label, 
  className = "w-4 h-4",
  side = "top",
  ...props 
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center cursor-help">
            <Icon className={className} {...props} />
          </span>
        </TooltipTrigger>
        <TooltipContent side={side}>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * ButtonWithTooltip - For icons inside buttons
 * 
 * Usage:
 * <Button>
 *   <ButtonIconTooltip icon={Save} label="Save changes" />
 *   Save
 * </Button>
 */
export function ButtonIconTooltip({ 
  icon: Icon, 
  label, 
  className = "w-4 h-4",
  side = "top"
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className={className} />
        </TooltipTrigger>
        <TooltipContent side={side}>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}