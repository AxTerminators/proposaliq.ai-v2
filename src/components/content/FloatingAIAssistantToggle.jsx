import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Floating AI Assistant Toggle Button
 * 
 * A minimized floating button that expands the AI Assistant when clicked
 * Positioned in the bottom-right corner of the screen
 */
export default function FloatingAIAssistantToggle({ onExpand }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onExpand}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 z-50 transition-all duration-300 hover:scale-110"
            size="icon"
          >
            <Sparkles className="h-6 w-6 text-white" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-slate-900 text-white">
          <p>Open AI Writing Assistant</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}