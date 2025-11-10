import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2, Briefcase, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskComments from "../collaboration/TaskComments";
import { Badge } from "@/components/ui/badge";

export default function TaskForm({ open, onOpenChange, proposal, task, onSave, user, organization }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to_email: "",
    assigned_to_name: "",
    priority: "medium",
    status: "todo",
    due_date: null,
    section_id: "",
    estimated_hours: "",
    proposal_id: "",
    is_general_task: false,
    task_category: "proposal"
  });

  const [isSaving, setIsSaving] = useState(false);

  // Fetch all proposals if no proposal is pre-selected
  const { data: allProposals = [] } = useQuery({
    queryKey: ['all-proposals-for-task', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({ organization_id: organization.id }, '-created_date');
    },
    enabled: !!organization?.id && !proposal,
    initialData: []
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        assigned_to_email: task.assigned_to_email || "",
        assigned_to_name: task.assigned_to_name || "",
        priority: task.priority || "medium",
        status: task.status || "todo",
        due_date: task.due_date ? new Date(task.due_date) : null,
        section_id: task.section_id || "",
        estimated_hours: task.estimated_hours || "",
        proposal_id: task.proposal_id || "",
        is_general_task: task.is_general_task || false,
        task_category: task.task_category || "proposal"
      });
    } else {
      setFormData({
        title: "",
        description: "",
        assigned_to_email: user?.email || "",
        assigned_to_name: user?.full_name || "",
        priority: "medium",
        status: "todo",
        due_date: null,
        section_id: "",
        estimated_hours: "",
        proposal_id: proposal?.id || "",
        is_general_task: !proposal,
        task_category: proposal ? "proposal" : "administrative"
      });
    }
  }, [task, user, open, proposal]);

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => {
        const accesses = u.client_accesses || [];
        return accesses.some(a => a.organization_id === organization.id);
      });
    },
    enabled: !!organization?.id
  });

  // Get the selected proposal (either pre-selected or from dropdown)
  const selectedProposalId = proposal?.id || formData.proposal_id;
  const selectedProposal = proposal || allProposals.find(p => p.id === formData.proposal_id);

  const { data: sections = [] } = useQuery({
    queryKey: ['proposal-sections', selectedProposalId],
    queryFn: async () => {
      if (!selectedProposalId) return [];
      return base44.entities.ProposalSection.filter({ proposal_id: selectedProposalId });
    },
    enabled: !!selectedProposalId
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      alert("Please enter a task title");
      return;
    }
    
    if (!formData.assigned_to_email) {
      alert("Please assign the task to a team member");
      return;
    }
    
    setIsSaving(true);

    try {
      const targetProposalId = proposal?.id || formData.proposal_id;
      const isGeneralTask = formData.is_general_task || !targetProposalId;

      const taskData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || "",
        assigned_to_email: formData.assigned_to_email,
        assigned_to_name: formData.assigned_to_name,
        assigned_by_email: user.email,
        assigned_by_name: user.full_name,
        priority: formData.priority,
        status: formData.status,
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        is_general_task: isGeneralTask,
        task_category: formData.task_category
      };

      // Only add proposal-specific fields if it's not a general task
      if (!isGeneralTask && targetProposalId) {
        taskData.proposal_id = targetProposalId;
        taskData.section_id = formData.section_id || null;
      }

      if (task) {
        await base44.entities.ProposalTask.update(task.id, taskData);
      } else {
        await base44.entities.ProposalTask.create(taskData);
      }

      // Create notification for assigned user
      if (formData.assigned_to_email && formData.assigned_to_email !== user.email) {
        try {
          await base44.entities.Notification.create({
            user_email: formData.assigned_to_email,
            notification_type: "task_assigned",
            title: "New Task Assigned",
            message: `You've been assigned: ${formData.title}`,
            related_proposal_id: targetProposalId || null,
            from_user_email: user.email,
            from_user_name: user.full_name,
            action_url: targetProposalId ? `/app/ProposalBuilder?id=${targetProposalId}` : '/app/Tasks'
          });
        } catch (notifError) {
          console.warn("Failed to create notification:", notifError);
        }
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task: " + (error.message || "Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssigneeChange = (email) => {
    const member = teamMembers.find(m => m.email === email);
    setFormData({
      ...formData,
      assigned_to_email: email,
      assigned_to_name: member?.full_name || email
    });
  };

  const handleTaskTypeToggle = (isGeneral) => {
    setFormData({
      ...formData,
      is_general_task: isGeneral,
      proposal_id: isGeneral ? "" : (proposal?.id || ""),
      section_id: isGeneral ? "" : formData.section_id,
      task_category: isGeneral ? "administrative" : "proposal"
    });
  };

  const taskFormFields = (
    <>
      {/* NEW: Task Type Toggle (only shown when no proposal is pre-selected) */}
      {!proposal && (
        <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
          <Label className="text-sm font-semibold text-slate-900">Task Type</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={!formData.is_general_task ? "default" : "outline"}
              className={cn(
                "h-auto py-4 flex flex-col items-center gap-2",
                !formData.is_general_task && "bg-blue-600 hover:bg-blue-700"
              )}
              onClick={() => handleTaskTypeToggle(false)}
            >
              <Briefcase className="w-6 h-6" />
              <div>
                <div className="font-semibold">Proposal Task</div>
                <div className="text-xs opacity-80">Tied to a proposal</div>
              </div>
            </Button>
            <Button
              type="button"
              variant={formData.is_general_task ? "default" : "outline"}
              className={cn(
                "h-auto py-4 flex flex-col items-center gap-2",
                formData.is_general_task && "bg-purple-600 hover:bg-purple-700"
              )}
              onClick={() => handleTaskTypeToggle(true)}
            >
              <ListTodo className="w-6 h-6" />
              <div>
                <div className="font-semibold">General Task</div>
                <div className="text-xs opacity-80">No proposal needed</div>
              </div>
            </Button>
          </div>
        </div>
      )}

      {/* Proposal Dropdown (only shown for proposal tasks when no proposal is pre-selected) */}
      {!proposal && !formData.is_general_task && (
        <div className="space-y-2">
          <Label htmlFor="proposal">Proposal *</Label>
          <Select value={formData.proposal_id} onValueChange={(value) => setFormData({ ...formData, proposal_id: value })}>
            <SelectTrigger id="proposal">
              <SelectValue placeholder="Select a proposal" />
            </SelectTrigger>
            <SelectContent>
              {allProposals.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.proposal_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Task Category (only for general tasks) */}
      {formData.is_general_task && (
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={formData.task_category} onValueChange={(value) => setFormData({ ...formData, task_category: value })}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="administrative">Administrative</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Task Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Draft Executive Summary"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detailed task description..."
          rows={3}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="assignee">Assign To *</Label>
          <Select value={formData.assigned_to_email} onValueChange={handleAssigneeChange}>
            <SelectTrigger id="assignee">
              <SelectValue placeholder="Select team member">
                {formData.assigned_to_name || "Select team member"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map(member => (
                <SelectItem key={member.email} value={member.email}>
                  {member.full_name} ({member.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Only show section selector for proposal tasks */}
        {!formData.is_general_task && (
          <div className="space-y-2">
            <Label htmlFor="section">Related Section (Optional)</Label>
            <Select value={formData.section_id} onValueChange={(value) => setFormData({ ...formData, section_id: value })}>
              <SelectTrigger id="section">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.section_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority *</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hours">Est. Hours</Label>
          <Input
            id="hours"
            type="number"
            step="0.5"
            value={formData.estimated_hours}
            onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
            placeholder="e.g., 4"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Due Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.due_date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.due_date ? format(formData.due_date, 'PPP') : <span>Pick a date</span>}
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

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={
            isSaving || 
            !formData.title || 
            !formData.assigned_to_email || 
            (!proposal && !formData.is_general_task && !formData.proposal_id)
          }
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            task ? "Update Task" : "Create Task"
          )}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update task details and assignment" : "Add a new task - can be tied to a proposal or standalone"}
          </DialogDescription>
        </DialogHeader>

        {task ? (
          <Tabs defaultValue="details" className="py-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Task Details</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <form onSubmit={handleSubmit} className="space-y-4">
                {taskFormFields}
              </form>
            </TabsContent>

            <TabsContent value="comments">
              <TaskComments
                proposal={selectedProposal}
                task={task}
                user={user}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {taskFormFields}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}