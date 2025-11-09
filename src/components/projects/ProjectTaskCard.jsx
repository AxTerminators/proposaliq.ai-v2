import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Paperclip,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-slate-100 text-slate-700", icon: Circle },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-700", icon: Circle },
  high: { label: "High", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700", icon: AlertCircle }
};

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" }
};

export default function ProjectTaskCard({ task, onClick, provided, snapshot, isSelected, onToggleSelection }) {
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.not_started;
  const PriorityIcon = priorityConfig.icon;

  const getDaysUntilDue = () => {
    if (!task.due_date) return null;
    const today = new Date();
    const dueDate = new Date(task.due_date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntil = getDaysUntilDue();
  const isOverdue = daysUntil !== null && daysUntil < 0;
  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;

  return (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      onClick={(e) => {
        if (e.target.type === 'checkbox') return;
        onClick(task);
      }}
      className={cn(
        "group",
        snapshot?.isDragging && "opacity-70"
      )}
    >
      <Card className={cn(
        "cursor-pointer transition-all hover:shadow-lg border-2",
        isSelected && "ring-2 ring-blue-500",
        task.is_blocked && "border-red-300 bg-red-50/30"
      )}>
        <CardContent className="p-4 space-y-3">
          {/* Header with selection and priority */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelection(task.id);
                }}
                className="mt-1 w-4 h-4 rounded border-slate-300"
              />
              <h4 className="font-semibold text-slate-900 line-clamp-2 flex-1">
                {task.title}
              </h4>
            </div>
            <PriorityIcon className={cn("w-4 h-4 flex-shrink-0", priorityConfig.color.split(' ')[1])} />
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-slate-600 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
            <Badge className={priorityConfig.color}>
              {priorityConfig.label}
            </Badge>
            {task.is_blocked && (
              <Badge className="bg-red-100 text-red-700">
                🚫 Blocked
              </Badge>
            )}
          </div>

          {/* Due Date */}
          {task.due_date && (
            <div className={cn(
              "flex items-center gap-2 text-sm",
              isOverdue && "text-red-600 font-semibold",
              isDueSoon && "text-amber-600 font-semibold",
              !isOverdue && !isDueSoon && "text-slate-600"
            )}>
              <Calendar className="w-4 h-4" />
              <span>
                {isOverdue ? `Overdue by ${Math.abs(daysUntil)}d` : 
                 isDueSoon ? `Due in ${daysUntil}d` :
                 format(new Date(task.due_date), 'MMM d, yyyy')}
              </span>
            </div>
          )}

          {/* Assignee */}
          {task.assigned_to_email && (
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                  {task.assigned_to_name?.[0]?.toUpperCase() || task.assigned_to_email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-slate-600 truncate">
                {task.assigned_to_name || task.assigned_to_email}
              </span>
            </div>
          )}

          {/* Estimated Hours */}
          {task.estimated_hours && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="w-4 h-4" />
              <span>{task.estimated_hours}h estimated</span>
            </div>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-3 text-xs text-slate-500 pt-2 border-t">
            {task.attachments?.length > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                <span>{task.attachments.length}</span>
              </div>
            )}
            {task.comment_count > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{task.comment_count}</span>
              </div>
            )}
            {task.subtask_count > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{task.subtasks_completed}/{task.subtask_count}</span>
              </div>
            )}
          </div>

          {task.is_sample_data && (
            <Badge className="bg-amber-100 text-amber-700 text-xs">
              SAMPLE DATA
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}