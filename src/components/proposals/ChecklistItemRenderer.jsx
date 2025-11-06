import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, Circle, ExternalLink, Sparkles, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChecklistItemRenderer({ item, isCompleted, onItemClick, proposal }) {
  const navigate = useNavigate();
  
  const handleClick = (e) => {
    // CRITICAL: Stop event propagation to prevent card click
    e.stopPropagation();
    e.preventDefault();
    
    console.log('[ChecklistItem] 🔔 CLICKED:', {
      label: item.label,
      associated_action: item.associated_action,
      type: item.type,
      item: item
    });
    
    // ALWAYS call the parent handler - let it decide what to do
    if (onItemClick) {
      onItemClick(item);
    }
  };

  // Determine icon based on item type and completion
  const getIcon = () => {
    if (isCompleted) {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }

    // If has associated_action, show appropriate icon
    if (item.associated_action) {
      if (item.type === 'ai_trigger') {
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      }
      if (item.type === 'modal_trigger') {
        return <FileEdit className="w-4 h-4 text-indigo-500" />;
      }
      // Default for any action
      return <FileEdit className="w-4 h-4 text-blue-500" />;
    }

    // Manual checkbox
    return <Circle className="w-4 h-4 text-slate-400" />;
  };

  // Determine if this is clickable
  const isClickable = !isCompleted;

  return (
    <button
      onClick={isClickable ? handleClick : undefined}
      disabled={!isClickable}
      type="button"
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded transition-colors w-full text-left",
        isClickable && "cursor-pointer hover:bg-blue-50 active:bg-blue-100",
        isCompleted && "opacity-60",
        !isClickable && "cursor-default"
      )}
    >
      {getIcon()}
      <span className={cn(
        "text-sm flex-1",
        isCompleted && "line-through text-slate-500",
        !isCompleted && "text-slate-700"
      )}>
        {item.label}
      </span>
      {item.required && !isCompleted && (
        <span className="text-xs text-red-500 font-medium">Required</span>
      )}
    </button>
  );
}