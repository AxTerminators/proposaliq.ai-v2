import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, Circle, ExternalLink, Sparkles, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActionConfig, isNavigateAction, isModalAction, isAIAction } from "./ChecklistActionRegistry";

export default function ChecklistItemRenderer({ item, isCompleted, onItemClick, proposal }) {
  const navigate = useNavigate();
  const actionConfig = getActionConfig(item.associated_action);
  
  const handleClick = (e) => {
    // CRITICAL: Stop event propagation to prevent card click
    e.stopPropagation();
    e.preventDefault();
    
    console.log('[ChecklistItem] Clicked:', item.label, 'Action:', item.associated_action);
    
    if (!item.associated_action) {
      // Manual checkbox - call parent handler
      console.log('[ChecklistItem] Manual checkbox - calling onItemClick');
      onItemClick(item);
      return;
    }

    // Get action configuration
    const action = getActionConfig(item.associated_action);
    
    if (!action) {
      console.error(`[ChecklistItem] Action not found: ${item.associated_action}`);
      onItemClick(item);
      return;
    }

    console.log('[ChecklistItem] Action config:', action);

    // Handle different action types
    if (isNavigateAction(item.associated_action)) {
      // Navigate to the specified page with proposal ID
      const url = `${createPageUrl(action.path)}?id=${proposal?.id || ''}`;
      console.log('[ChecklistItem] Navigating to:', url);
      navigate(url);
    } else if (isModalAction(item.associated_action) || isAIAction(item.associated_action)) {
      // Trigger modal/AI action - call parent handler
      console.log('[ChecklistItem] Modal/AI action - calling onItemClick');
      onItemClick(item);
    } else {
      // Default: manual check - call parent handler
      console.log('[ChecklistItem] Default - calling onItemClick');
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

  // Get button label based on action type
  const getButtonLabel = () => {
    if (isNavigateAction(item.associated_action)) {
      return 'Open';
    }
    if (isModalAction(item.associated_action)) {
      return 'Edit';
    }
    if (isAIAction(item.associated_action)) {
      return 'Run';
    }
    return 'Start';
  };

  return (
    <button
      onClick={isClickable ? handleClick : undefined}
      disabled={!isClickable}
      type="button"
      className={cn(
        "flex items-center gap-2 py-1.5 px-2 rounded transition-colors w-full text-left",
        isClickable && "cursor-pointer hover:bg-blue-50 active:bg-blue-100",
        isCompleted && "opacity-60",
        !isClickable && "cursor-default opacity-50"
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
      {isClickable && (
        <span className="text-xs text-blue-600 font-medium">{getButtonLabel()}</span>
      )}
    </button>
  );
}