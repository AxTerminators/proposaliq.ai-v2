
import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Flag, MoreVertical, Pencil, Trash2, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function TaskBoard({ tasks, subtasks = [], proposals = [], onEditTask, onDeleteTask, onStatusChange, onSubtaskStatusChange }) {
  const columns = [
    { id: "todo", label: "To Do", color: "bg-slate-50" },
    { id: "in_progress", label: "In Progress", color: "bg-blue-50" },
    { id: "review", label: "In Review", color: "bg-purple-50" },
    { id: "completed", label: "Completed", color: "bg-green-50" }
  ];

  const groupedTasks = columns.reduce((acc, column) => {
    acc[column.id] = tasks.filter(task => task.status === column.id);
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const task = tasks.find(t => t.id === draggableId);
    if (task) {
      onStatusChange(task.id, destination.droppableId);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent": return "text-red-600";
      case "high": return "text-orange-600";
      case "medium": return "text-blue-600";
      case "low": return "text-slate-600";
      default: return "text-slate-600";
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <Droppable key={column.id} droppableId={column.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col"
              >
                <Card className={cn(
                  "flex-1 border-2",
                  snapshot.isDraggingOver && "border-blue-400 bg-blue-50"
                )}>
                  <CardHeader className={cn("pb-3", column.color)}>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{column.label}</span>
                      <Badge variant="secondary">{groupedTasks[column.id].length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
                    {groupedTasks[column.id].map((task, index) => {
                      const overdue = isOverdue(task.due_date) && task.status !== "completed";
                      const isGeneralTask = task.is_general_task === true;
                      const taskProposal = task.proposal_id ? proposals.find(p => p.id === task.proposal_id) : null;
                      
                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "cursor-pointer hover:shadow-md transition-all",
                                snapshot.isDragging && "shadow-xl rotate-2",
                                overdue && "border-l-4 border-l-red-500",
                                isGeneralTask && "border-l-4 border-l-purple-500"
                              )}
                              onClick={() => onEditTask(task)}
                            >
                              <CardContent className="p-3">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-sm line-clamp-2">
                                        {task.title}
                                      </h4>
                                      
                                      {/* NEW: Show category for general tasks or proposal name for proposal tasks */}
                                      {isGeneralTask && task.task_category && (
                                        <Badge className="bg-purple-100 text-purple-700 text-xs mt-1">
                                          {task.task_category}
                                        </Badge>
                                      )}
                                      {taskProposal && (
                                        <p className="text-xs text-blue-600 mt-1 truncate">
                                          📋 {taskProposal.proposal_name}
                                        </p>
                                      )}
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e?.stopPropagation?.()}>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                          <MoreVertical className="w-3 h-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e?.stopPropagation?.(); onEditTask(task); }}>
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={(e) => { e?.stopPropagation?.(); onDeleteTask(task.id); }}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  {task.description && (
                                    <p className="text-xs text-slate-600 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-2 flex-wrap">
                                    {task.priority && (
                                      <Flag className={cn("w-3 h-3", getPriorityColor(task.priority))} />
                                    )}

                                    {task.assigned_to_name && (
                                      <Avatar className="w-5 h-5">
                                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                          {task.assigned_to_name[0]?.toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    )}

                                    {task.due_date && (
                                      <div className={cn(
                                        "flex items-center gap-1 text-xs ml-auto",
                                        overdue ? "text-red-600 font-semibold" : "text-slate-500"
                                      )}>
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(task.due_date), 'MMM d')}
                                        {overdue && <AlertCircle className="w-3 h-3" />}
                                      </div>
                                    )}
                                  </div>

                                  {task.estimated_hours && (
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                      <Clock className="w-3 h-3" />
                                      {task.estimated_hours}h
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {groupedTasks[column.id].length === 0 && (
                      <div className="text-center text-slate-400 text-sm py-8">
                        No tasks
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
