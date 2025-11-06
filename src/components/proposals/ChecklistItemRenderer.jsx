import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, Circle, ExternalLink, Sparkles, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActionConfig, isNavigateAction, isModalAction, isAIAction } from "./ChecklistActionRegistry";

export default function ChecklistItemRenderer({ item, isCompleted, onItemClick, proposal }) {
  const navigate = useNavigate();
  const actionConfig = getActionConfig(item.associated_action);
  
  const handleClick = () => {
    if (!item.associated_action) {
      // Manual checkbox - just toggle
      onItemClick(item);
      return;
    }

    // Get action configuration
    const action = getActionConfig(item.associated_action);
    
    if (!action) {
      console.error(`Action not found: ${item.associated_action}`);
      onItemClick(item);
      return;
    }

    // Handle different action types
    if (isNavigateAction(item.associated_action)) {
      // Navigate to the specified page with proposal ID
      const pageName = action.page;
      const url = `${createPageUrl(pageName)}?id=${proposal?.id || ''}`;
      navigate(url);
    } else if (isModalAction(item.associated_action)) {
      // Trigger modal (handled by parent component)
      onItemClick(item);
    } else if (isAIAction(item.associated_action)) {
      // Trigger AI action (handled by parent component)
      onItemClick(item);
    } else {
      // Default: manual check
      onItemClick(item);
    }
  };

  // Determine icon based on action type
  const getIcon = () => {
    if (isCompleted) {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }

    if (!item.associated_action || item.type === 'manual_check') {
      return <Circle className="w-4 h-4 text-slate-400" />;
    }

    if (isNavigateAction(item.associated_action)) {
      return <ExternalLink className="w-4 h-4 text-blue-500" />;
    }

    if (isAIAction(item.associated_action)) {
      return <Sparkles className="w-4 h-4 text-purple-500" />;
    }

    if (isModalAction(item.associated_action)) {
      return <FileEdit className="w-4 h-4 text-indigo-500" />;
    }

    return <Circle className="w-4 h-4 text-slate-400" />;
  };

  // Determine if this is clickable
  const isClickable = !isCompleted && (item.associated_action || item.type === 'manual_check');

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded transition-colors",
        isClickable && "cursor-pointer hover:bg-slate-50",
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
      {actionConfig && actionConfig.status && (
        <span className="text-xs text-slate-400">{actionConfig.status}</span>
      )}
    </div>
  );
}