
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  Flag,
  ExternalLink // Added icon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function TaskList({ tasks, subtasks = [], proposals = [], onEditTask, onEditSubtask, onDeleteTask, onDeleteSubtask, onStatusChange, onSubtaskStatusChange, embedded = false }) {
  const navigate = useNavigate(); // Added hook

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
        const isGeneralTask = task.is_general_task === true;
        const taskProposal = task.proposal_id ? proposals.find(p => p.id === task.proposal_id) : null;

        return (
          <Card
            key={task.id}
            className={cn(
              "border hover:shadow-md transition-all cursor-pointer",
              isCompleted && "opacity-60",
              overdue && !isCompleted && "border-l-4 border-l-red-500",
              isGeneralTask && "border-l-4 border-l-purple-500"
            )}
            onClick={() => onEditTask(task)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={() => {
                    const newStatus = task.status === "completed" ? "todo" : "completed";
                    onStatusChange(task.id, newStatus);
                  }}
                  className="mt-1"
                  onClick={(e) => e?.stopPropagation?.()}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className={cn(
                        "font-semibold text-slate-900",
                        isCompleted && "line-through text-slate-500"
                      )}>
                        {task.title}
                      </h4>
                      
                      {/* Show category badge for general tasks */}
                      {isGeneralTask && task.task_category && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs mt-1">
                          {task.task_category}
                        </Badge>
                      )}
                      
                      {/* Show proposal name for proposal tasks */}
                      {taskProposal && (
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-blue-600 truncate">
                            📋 {taskProposal.proposal_name}
                          </p>
                          {/* UPDATED: Go to Proposal button - navigates to Pipeline with proposalId */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`${createPageUrl("Pipeline")}?proposalId=${taskProposal.id}`);
                            }}
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View this proposal on the Kanban board"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Go to Proposal
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {task.priority && (
                        <Badge variant="outline" className={getPriorityColor(task.priority)}>
                          <Flag className="w-3 h-3 mr-1" />
                          {task.priority}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e?.stopPropagation?.()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e?.stopPropagation?.(); onEditTask(task); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Task
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e?.stopPropagation?.(); onDeleteTask(task.id); }}
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
