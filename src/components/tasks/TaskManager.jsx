import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List, LayoutGrid, Search, Filter, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskForm from "./TaskForm";
import TaskList from "./TaskList";
import TaskBoard from "./TaskBoard";

export default function TaskManager({ proposal, user, organization }) {
  const queryClient = useQueryClient();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [viewMode, setViewMode] = useState("list"); // list or board

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['proposal-tasks', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.ProposalTask.filter(
        { proposal_id: proposal.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!proposal?.id
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      await base44.entities.ProposalTask.delete(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks'] });
    }
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }) => {
      const updateData = { status };
      if (status === "completed") {
        updateData.completed_date = new Date().toISOString();
      }
      await base44.entities.ProposalTask.update(taskId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks'] });
    }
  });

  const handleTaskSave = () => {
    queryClient.invalidateQueries({ queryKey: ['proposal-tasks'] });
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleTaskEdit = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskDelete = async (task) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleTaskStatusChange = (task, newStatus) => {
    updateTaskStatusMutation.mutate({ taskId: task.id, status: newStatus });
  };

  const handleTaskClick = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesAssignee = filterAssignee === "all" || task.assigned_to_email === filterAssignee;

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  // Task stats
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
    overdue: tasks.filter(t => {
      if (t.status === "completed" || !t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length
  };

  // Get unique assignees for filter
  const uniqueAssignees = [...new Set(tasks.map(t => t.assigned_to_email))].filter(Boolean);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">Task Management</CardTitle>
            <div className="flex gap-4 mt-2">
              <div className="text-sm text-slate-600">
                <span className="font-semibold">{stats.total}</span> total
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-blue-600">{stats.inProgress}</span> in progress
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-semibold text-green-600">{stats.completed}</span> completed
              </div>
              {stats.overdue > 0 && (
                <div className="text-sm text-red-600">
                  <span className="font-semibold">{stats.overdue}</span> overdue
                </div>
              )}
            </div>
          </div>
          <Button onClick={() => { setEditingTask(null); setShowTaskForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {uniqueAssignees.length > 1 && (
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {uniqueAssignees.map(email => {
                  const task = tasks.find(t => t.assigned_to_email === email);
                  return (
                    <SelectItem key={email} value={email}>
                      {task?.assigned_to_name || email}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "board" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("board")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-600 mt-4">Loading tasks...</p>
          </div>
        ) : viewMode === "list" ? (
          <TaskList
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            onTaskStatusChange={handleTaskStatusChange}
            currentUser={user}
          />
        ) : (
          <TaskBoard
            tasks={filteredTasks}
            onTaskStatusChange={handleTaskStatusChange}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            onTaskClick={handleTaskClick}
          />
        )}
      </CardContent>

      {/* Task Form Dialog */}
      {showTaskForm && (
        <TaskForm
          open={showTaskForm}
          onOpenChange={(open) => {
            setShowTaskForm(open);
            if (!open) setEditingTask(null);
          }}
          proposal={proposal}
          task={editingTask}
          onSave={handleTaskSave}
          user={user}
          organization={organization}
        />
      )}
    </Card>
  );
}