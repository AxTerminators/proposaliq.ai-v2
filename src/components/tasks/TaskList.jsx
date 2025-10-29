import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar, 
  Clock, 
  MoreVertical, 
  Pencil, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  Flag
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function TaskList({ tasks, onTaskClick, onTaskEdit, onTaskDelete, onTaskStatusChange, currentUser }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-700 border-red-300";
      case "high": return "bg-orange-100 text-orange-700 border-orange-300";
      case "medium": return "bg-blue-100 text-blue-700 border-blue-300";
      case "low": return "bg-slate-100 text-slate-700 border-slate-300";
      default: return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-700";
      case "in_progress": return "bg-blue-100 text-blue-700";
      case "review": return "bg-purple-100 text-purple-700";
      case "todo": return "bg-slate-100 text-slate-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const isDueToday = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate).toDateString() === new Date().toDateString();
  };

  const handleToggleComplete = (task, e) => {
    e.stopPropagation();
    const newStatus = task.status === "completed" ? "todo" : "completed";
    onTaskStatusChange(task, newStatus);
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <p className="text-lg font-medium">No tasks yet</p>
        <p className="text-sm">Create your first task to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const overdue = isOverdue(task.due_date);
        const dueToday = isDueToday(task.due_date);
        const isCompleted = task.status === "completed";

        return (
          <Card
            key={task.id}
            className={cn(
              "border hover:shadow-md transition-all cursor-pointer",
              isCompleted && "opacity-60",
              overdue && !isCompleted && "border-l-4 border-l-red-500"
            )}
            onClick={() => onTaskClick(task)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={(e) => handleToggleComplete(task, e)}
                  className="mt-1"
                  onClick={(e) => e.stopPropagation()}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className={cn(
                      "font-semibold text-slate-900",
                      isCompleted && "line-through text-slate-500"
                    )}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      {task.priority && (
                        <Badge variant="outline" className={getPriorityColor(task.priority)}>
                          <Flag className="w-3 h-3 mr-1" />
                          {task.priority}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTaskEdit(task); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Task
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); onTaskDelete(task); }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>

                    {task.assigned_to_name && (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                            {task.assigned_to_name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-600">{task.assigned_to_name}</span>
                      </div>
                    )}

                    {task.due_date && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs",
                        overdue && !isCompleted ? "text-red-600 font-semibold" :
                        dueToday && !isCompleted ? "text-amber-600 font-semibold" :
                        "text-slate-500"
                      )}>
                        <Calendar className="w-3 h-3" />
                        {format(new Date(task.due_date), 'MMM d, yyyy')}
                        {overdue && !isCompleted && (
                          <AlertCircle className="w-3 h-3 ml-1" />
                        )}
                      </div>
                    )}

                    {task.estimated_hours && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {task.estimated_hours}h
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}