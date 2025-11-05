import React from "react";
import { CheckCircle2, Circle, ExternalLink, Sparkles, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActionConfig, isNavigateAction, isModalAction, isAIAction } from "./ChecklistActionRegistry";

export default function ChecklistItemRenderer({ item, isCompleted, onItemClick }) {
  const actionConfig = getActionConfig(item.associated_action);
  const isNavigate = isNavigateAction(item.associated_action);
  const isModal = isModalAction(item.associated_action);
  const isAI = isAIAction(item.associated_action);

  // Determine icon based on action type
  const getActionIcon = () => {
    if (isAI) return <Sparkles className="w-3 h-3 text-purple-500 opacity-0 group-hover/item:opacity-100 flex-shrink-0 mt-0.5" />;
    if (isModal) return <FileEdit className="w-3 h-3 text-blue-500 opacity-0 group-hover/item:opacity-100 flex-shrink-0 mt-0.5" />;
    if (isNavigate) return <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover/item:opacity-100 flex-shrink-0 mt-0.5" />;
    return null;
  };

  return (
    <button
      onClick={(e) => onItemClick(e, item)}
      className={cn(
        "w-full flex items-start gap-2 text-left hover:bg-slate-50 rounded p-1 -ml-1 transition-colors group/item",
        isCompleted && "opacity-75"
      )}
    >
      {/* Completion Status Icon */}
      {isCompleted ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : item.required ? (
        <Circle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
      )}

      {/* Checklist Item Label */}
      <span
        className={cn(
          "text-xs leading-tight flex-1",
          isCompleted
            ? "text-slate-400 line-through"
            : "text-slate-700 group-hover/item:text-blue-600"
        )}
      >
        {item.label}
      </span>

      {/* Action Type Icon */}
      {!isCompleted && getActionIcon()}
    </button>
  );
}