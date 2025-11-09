
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, List, LayoutGrid, CalendarIcon, X, Library } from "lucide-react";
import TaskForm from "./TaskForm"; // This component is still used for embedded view
import TaskList from "./TaskList";
import TaskBoard from "./TaskBoard";
import AttachFromLibraryButton from "../contentLibrary/AttachFromLibraryButton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function TaskManager({ user, organization, proposalId = null, embedded = false }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("list");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New state for inline task form fields
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: undefined,
    priority: "medium",
    status: "todo",
    assignee_id: user?.id || "",
    attachments: [],
    proposal_id: proposalId // Default for proposal context
  });
  const [isUploading, setIsUploading] = useState(false);

  // Sync editingTask with formData when editingTask changes
  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title || "",
        description: editingTask.description || "",
        due_date: editingTask.due_date ? new Date(editingTask.due_date) : undefined,
        priority: editingTask.priority || "medium",
        status: editingTask.status || "todo",
        assignee_id: editingTask.assignee_id || user?.id || "",
        attachments: editingTask.attachments || [],
        proposal_id: editingTask.proposal_id || proposalId
      });
    } else {
      setFormData({
        title: "",
        description: "",
        due_date: undefined,
        priority: "medium",
        status: "todo",
        assignee_id: user?.id || "",
        attachments: [],
        proposal_id: proposalId
      });
    }
  }, [editingTask, user?.id, proposalId]);


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
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({ organization_id: organization.id }, '-created_date');
    },
    enabled: !!organization?.id && !proposalId,
    initialData: []
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.ProposalTask.create({ ...taskData, organization_id: organization.id }),
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

  const handleTaskSubmit = async () => {
    const dataToSubmit = {
      ...formData,
      due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
      proposal_id: formData.proposal_id || proposalId, // Ensure proposal_id is set
      organization_id: organization.id
    };

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: dataToSubmit });
    } else {
      createTaskMutation.mutate(dataToSubmit);
    }
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
    setFormData({
      title: "",
      description: "",
      due_date: undefined,
      priority: "medium",
      status: "todo",
      assignee_id: user?.id || "",
      attachments: [],
      proposal_id: proposalId
    });
  };

  const handleAttachFromLibrary = (attachment) => {
    const currentAttachments = formData.attachments || [];
    const newAttachment = {
      file_name: attachment.file_name,
      file_url: attachment.file_url,
      uploaded_date: new Date().toISOString(),
      from_library: true,
      content_type: attachment.content_type
    };

    setFormData({
      ...formData,
      attachments: [...currentAttachments, newAttachment]
    });
  };

  const handleFileUpload = (event) => {
    // This is a placeholder for actual file upload logic.
    // In a real application, you'd handle file upload to storage (e.g., S3, your backend)
    // and then add the resulting URL/metadata to formData.attachments.
    // For this outline, we'll simulate adding a local file name.
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      // Simulate upload delay
      setTimeout(() => {
        const newAttachment = {
          file_name: file.name,
          file_url: URL.createObjectURL(file), // Use object URL for local display
          uploaded_date: new Date().toISOString(),
          from_library: false,
          content_type: file.type,
          size: file.size
        };
        setFormData({
          ...formData,
          attachments: [...(formData.attachments || []), newAttachment]
        });
        setIsUploading(false);
        event.target.value = ''; // Clear file input
      }, 1000);
    }
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

        {showTaskForm && (
          <TaskForm
            task={editingTask}
            proposals={proposalId ? [{ id: proposalId, title: 'Current Proposal' }] : proposals}
            onSubmit={handleTaskSubmit}
            onCancel={handleCloseTaskForm}
            organization={organization}
            defaultProposalId={proposalId}
            // Note: Attachments in embedded mode still rely on TaskForm's internal handling
            // if TaskForm component itself isn't modified to accept these props.
            // For now, the attachment feature is only fully implemented for the non-embedded view in this file.
          />
        )}
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

      {showTaskForm && (
        <Card className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 flex items-center justify-center">
          <CardContent className="p-6 w-full max-w-lg mx-auto bg-white rounded-lg shadow-xl relative overflow-y-auto max-h-[90vh]">
            <CardHeader className="p-0 mb-4 flex-row items-center justify-between">
              <CardTitle>{editingTask ? "Edit Task" : "Create New Task"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={handleCloseTaskForm}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.due_date ? format(formData.due_date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.due_date}
                        onSelect={(date) => setFormData({ ...formData, due_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assignee">Assignee</Label>
                  {/* For simplicity, this example doesn't fetch users.
                      In a real app, you'd use a Select with users from your organization. */}
                  <Input
                    id="assignee"
                    value={formData.assignee_id}
                    onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                    placeholder="Assignee ID (e.g., user.id)"
                    disabled // Assuming current user is assignee by default, or fetched from props
                  />
                </div>
              </div>

              {!proposalId && ( // Only show proposal selector if not already within a proposal context
                <div className="grid gap-2">
                  <Label htmlFor="proposal_id">Proposal</Label>
                  <Select
                    value={formData.proposal_id}
                    onValueChange={(value) => setFormData({ ...formData, proposal_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select proposal" />
                    </SelectTrigger>
                    <SelectContent>
                      {proposals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Attachments Section with Library Integration */}
              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <AttachFromLibraryButton
                    organization={organization}
                    onAttach={handleAttachFromLibrary}
                  />
                </div>

                {formData.attachments && formData.attachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {formData.attachments.map((attachment, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded border">
                        <span className="text-sm flex-1 truncate">{attachment.file_name}</span>
                        {attachment.from_library && (
                          <Badge variant="secondary" className="text-xs">
                            <Library className="w-3 h-3 mr-1" />
                            From Library
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const newAttachments = formData.attachments.filter((_, i) => i !== idx);
                            setFormData({...formData, attachments: newAttachments});
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleCloseTaskForm}>
                Cancel
              </Button>
              <Button onClick={handleTaskSubmit} disabled={createTaskMutation.isPending || updateTaskMutation.isPending}>
                {editingTask ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
