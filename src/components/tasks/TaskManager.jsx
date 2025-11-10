import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List, LayoutGrid } from "lucide-react";
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

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['proposal-tasks', organization?.id, proposalId],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const filter = {};
      if (proposalId) {
        filter.proposal_id = proposalId;
      }
      
      return base44.entities.ProposalTask.filter(filter, '-created_date');
    },
    enabled: !!organization?.id,
    initialData: []
  });

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

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals-for-tasks', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({ organization_id: organization.id }, '-created_date');
    },
    enabled: !!organization?.id && !proposalId,
    initialData: []
  });

  // Get the current proposal object
  const currentProposal = React.useMemo(() => {
    if (proposalId) {
      const foundProposal = proposals.find(p => p.id === proposalId);
      return foundProposal || { id: proposalId, proposal_name: 'Current Proposal' };
    }
    return null;
  }, [proposalId, proposals]);

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.ProposalTask.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProposalTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.ProposalTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks'] });
    }
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (subtaskData) => base44.entities.ProposalSubtask.create(subtaskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-subtasks'] });
    }
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProposalSubtask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-subtasks'] });
    }
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (id) => base44.entities.ProposalSubtask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-subtasks'] });
    }
  });

  const handleTaskSave = () => {
    queryClient.invalidateQueries({ queryKey: ['proposal-tasks'] });
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleEditSubtask = (subtask) => {
    // For now, just allow inline editing in the list
  };

  const handleDeleteTask = (taskId) => {
    if (confirm('Delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleDeleteSubtask = (subtaskId) => {
    if (confirm('Delete this subtask?')) {
      deleteSubtaskMutation.mutate(subtaskId);
    }
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    updateTaskMutation.mutate({ id: taskId, data: { status: newStatus } });
  };

  const handleSubtaskStatusChange = (subtaskId, newStatus) => {
    updateSubtaskMutation.mutate({ id: subtaskId, data: { status: newStatus } });
  };

  const handleCloseTaskForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            Tasks {tasks.length > 0 && `(${tasks.filter(t => t.status === 'completed').length}/${tasks.length})`}
          </h3>
          <Button
            size="sm"
            onClick={() => setShowTaskForm(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        </div>

        <TaskList
          tasks={tasks}
          subtasks={subtasks}
          proposals={proposalId ? [{ id: proposalId }] : []}
          onEditTask={handleEditTask}
          onEditSubtask={handleEditSubtask}
          onDeleteTask={handleDeleteTask}
          onDeleteSubtask={handleDeleteSubtask}
          onStatusChange={handleTaskStatusChange}
          onSubtaskStatusChange={handleSubtaskStatusChange}
          embedded={true}
        />

        <TaskForm
          open={showTaskForm}
          onOpenChange={setShowTaskForm}
          proposal={currentProposal}
          task={editingTask}
          onSave={handleTaskSave}
          user={user}
          organization={organization}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Tasks</h1>
          <p className="text-slate-600">Manage your proposal tasks and assignments</p>
        </div>
        <Button onClick={() => setShowTaskForm(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Create Task
        </Button>
      </div>

      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <List className="w-4 h-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-2">
            <LayoutGrid className="w-4 h-4" />
            Board
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <TaskList
            tasks={tasks}
            subtasks={subtasks}
            proposals={proposals}
            onEditTask={handleEditTask}
            onEditSubtask={handleEditSubtask}
            onDeleteTask={handleDeleteTask}
            onDeleteSubtask={handleDeleteSubtask}
            onStatusChange={handleTaskStatusChange}
            onSubtaskStatusChange={handleSubtaskStatusChange}
          />
        </TabsContent>

        <TabsContent value="board" className="mt-6">
          <TaskBoard
            tasks={tasks}
            subtasks={subtasks}
            proposals={proposals}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleTaskStatusChange}
            onSubtaskStatusChange={handleSubtaskStatusChange}
          />
        </TabsContent>
      </Tabs>

      <TaskForm
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        proposal={currentProposal}
        task={editingTask}
        onSave={handleTaskSave}
        user={user}
        organization={organization}
      />
    </div>
  );
}