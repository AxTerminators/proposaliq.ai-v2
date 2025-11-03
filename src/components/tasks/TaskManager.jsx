
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

export default function TaskManager({ user, organization, proposalId = null, embedded = false }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("list");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch tasks - filter by proposalId if provided
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['proposal-tasks', organization?.id, proposalId],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const filter = { organization_id: organization.id };
      if (proposalId) {
        filter.proposal_id = proposalId;
      }
      
      return base44.entities.ProposalTask.filter(filter, '-created_date');
    },
    enabled: !!organization?.id,
    initialData: []
  });

  // Fetch subtasks - filter by proposalId if provided
  const { data: subtasks = [] } = useQuery({
    queryKey: ['proposal-subtasks', organization?.id, proposalId],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const filter = { organization_id: organization.id };
      if (proposalId) {
        filter.proposal_id = proposalId;
      }
      
      return base44.entities.ProposalSubtask.filter(filter, '-created_date');
    },
    enabled: !!organization?.id,
    initialData: []
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      await base44.entities.ProposalTask.delete(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks', organization?.id, proposalId] });
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
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks', organization?.id, proposalId] });
    }
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (subtaskId) => {
      await base44.entities.ProposalSubtask.delete(subtaskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-subtasks', organization?.id, proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks', organization?.id, proposalId] }); // Parent task might need re-evaluation
    }
  });

  const updateSubtaskStatusMutation = useMutation({
    mutationFn: async ({ subtaskId, status }) => {
      const updateData = { status };
      if (status === "completed") {
        updateData.completed_date = new Date().toISOString();
      }
      await base44.entities.ProposalSubtask.update(subtaskId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-subtasks', organization?.id, proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks', organization?.id, proposalId] }); // Parent task might need re-evaluation
    }
  });

  const handleTaskSave = () => { // This will be passed as onSubmit for TaskForm
    queryClient.invalidateQueries({ queryKey: ['proposal-tasks', organization?.id, proposalId] });
    queryClient.invalidateQueries({ queryKey: ['proposal-subtasks', organization?.id, proposalId] }); // In case a task creation involves subtasks in the future
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleTaskSubmit = handleTaskSave; // Alias for embedded mode consistency

  const handleCloseTaskForm = () => { // New handler for onCancel/onOpenChange
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleEditTask = (task) => { // Used by both embedded and non-embedded TaskList
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskClick = handleEditTask; // Alias for backward compatibility if needed

  const handleDeleteTask = async (task) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleTaskStatusChange = (task, newStatus) => {
    updateTaskStatusMutation.mutate({ taskId: task.id, status: newStatus });
  };

  const handleEditSubtask = (subtask) => {
    // For now, the TaskForm is primarily designed for ProposalTask.
    // If subtasks need editing via a form, it would likely be a separate component
    // or a heavily modified TaskForm. For this implementation, we'll just log.
    console.warn("Editing subtasks not fully implemented via TaskForm yet.", subtask);
    // If TaskForm were generic:
    // setEditingTask(subtask);
    // setShowTaskForm(true);
  };

  const handleDeleteSubtask = async (subtask) => {
    if (confirm(`Delete subtask "${subtask.title}"?`)) {
      deleteSubtaskMutation.mutate(subtask.id);
    }
  };

  const handleSubtaskStatusChange = (subtask, newStatus) => {
    updateSubtaskStatusMutation.mutate({ subtaskId: subtask.id, status: newStatus });
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

  // For embedded mode, show simplified view
  if (embedded) {
    return (
      <div className="space-y-4">
        {/* Simplified header for embedded mode */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            Tasks {tasks.length > 0 && `(${tasks.filter(t => t.status === 'completed').length}/${tasks.length})`}
          </h3>
          <Button
            size="sm"
            onClick={() => { setEditingTask(null); setShowTaskForm(true); }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        </div>

        {/* Task List */}
        <TaskList
          tasks={tasks} // Using unfiltered tasks as per outline for embedded view
          subtasks={subtasks}
          proposals={[]} // As per outline
          onEditTask={handleEditTask}
          onEditSubtask={handleEditSubtask}
          onDeleteTask={handleDeleteTask}
          onDeleteSubtask={handleDeleteSubtask}
          onStatusChange={handleTaskStatusChange}
          onSubtaskStatusChange={handleSubtaskStatusChange}
          embedded={true}
          currentUser={user} // Explicitly pass currentUser for TaskList
        />

        {/* Task Form Dialog */}
        {showTaskForm && (
          <TaskForm
            open={showTaskForm} // Keep open prop for shadcn/ui dialog management
            task={editingTask}
            proposals={proposalId ? [{ id: proposalId }] : []}
            onSubmit={handleTaskSubmit}
            onCancel={handleCloseTaskForm}
            organization={organization}
            defaultProposalId={proposalId}
            user={user} // Pass user to TaskForm for assignee selection etc.
          />
        )}
      </div>
    );
  }

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

          {uniqueAssignees.length > 0 && ( // Changed from > 1 to > 0 to show dropdown if only one assignee
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
            subtasks={subtasks} // Pass subtasks to the main TaskList view as well
            onEditTask={handleEditTask} // Consistent prop name
            onDeleteTask={handleDeleteTask} // Consistent prop name
            onStatusChange={handleTaskStatusChange} // Consistent prop name
            currentUser={user}
            onTaskClick={handleTaskClick} // Keep for backward compatibility with specific list item click
          />
        ) : (
          <TaskBoard
            tasks={filteredTasks}
            subtasks={subtasks} // Pass subtasks to TaskBoard
            onTaskStatusChange={handleTaskStatusChange}
            onTaskEdit={handleEditTask} // Consistent prop name
            onTaskDelete={handleDeleteTask} // Consistent prop name
            onTaskClick={handleTaskClick}
          />
        )}
      </CardContent>

      {/* Task Form Dialog */}
      {showTaskForm && (
        <TaskForm
          open={showTaskForm}
          onCancel={handleCloseTaskForm} // Changed from onOpenChange
          defaultProposalId={proposalId} // Changed from proposal prop
          proposals={proposalId ? [{ id: proposalId }] : []} // Added for consistency with embedded mode
          task={editingTask}
          onSubmit={handleTaskSave} // Changed from onSave
          user={user}
          organization={organization}
        />
      )}
    </Card>
  );
}
