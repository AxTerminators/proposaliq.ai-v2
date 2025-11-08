import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  User,
  AlertCircle,
  ChevronRight,
  Search,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MobileTaskView({ organization, user }) {
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['mobile-tasks', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const allTasks = await base44.entities.ProposalTask.filter(
        { organization_id: organization.id },
        '-due_date'
      );
      
      return allTasks;
    },
    enabled: !!organization?.id,
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }) => {
      return base44.entities.ProposalTask.update(taskId, {
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-tasks'] });
    }
  });

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleToggleTask = (task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    toggleTaskMutation.mutate({ taskId: task.id, newStatus });
  };

  const myTasks = filteredTasks.filter(t => t.assigned_to_email === user?.email);
  const overdueTasks = myTasks.filter(t => {
    if (t.status === 'completed') return false;
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date();
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600 mt-3">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Badge className="bg-blue-600 text-white whitespace-nowrap">
            {myTasks.length} Total
          </Badge>
          <Badge className="bg-green-600 text-white whitespace-nowrap">
            {myTasks.filter(t => t.status === 'completed').length} Done
          </Badge>
          {overdueTasks.length > 0 && (
            <Badge className="bg-red-600 text-white whitespace-nowrap">
              {overdueTasks.length} Overdue
            </Badge>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="p-4 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No tasks found</h3>
            <p className="text-sm text-slate-600">
              {searchQuery || filterStatus !== "all" 
                ? "Try adjusting your filters" 
                : "You're all caught up!"}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isCompleted = task.status === 'completed';
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;
            
            return (
              <Card
                key={task.id}
                className={cn(
                  "border-2 transition-all active:scale-95",
                  isCompleted ? "bg-slate-50 border-slate-200" : "border-slate-200"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                        isCompleted 
                          ? "bg-green-100 text-green-600" 
                          : "bg-slate-100 text-slate-400 active:bg-blue-100 active:text-blue-600"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-semibold text-slate-900 mb-1",
                        isCompleted && "line-through text-slate-500"
                      )}>
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs">
                        {task.due_date && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1",
                              isOverdue && "bg-red-100 text-red-700 border-red-300"
                            )}
                          >
                            <Calendar className="w-3 h-3" />
                            {moment(task.due_date).format('MMM D')}
                          </Badge>
                        )}

                        {task.priority && (
                          <Badge className={cn(
                            task.priority === 'urgent' ? 'bg-red-600' :
                            task.priority === 'high' ? 'bg-orange-600' :
                            task.priority === 'medium' ? 'bg-blue-600' :
                            'bg-slate-600',
                            "text-white"
                          )}>
                            {task.priority}
                          </Badge>
                        )}

                        {task.status && task.status !== 'completed' && (
                          <Badge variant="outline">
                            {task.status}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}