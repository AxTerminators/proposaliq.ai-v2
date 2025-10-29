
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
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TaskComments from "../collaboration/TaskComments";

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
    estimated_hours: ""
  });

  const [isSaving, setIsSaving] = useState(false);

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
        estimated_hours: task.estimated_hours || ""
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
        estimated_hours: ""
      });
    }
  }, [task, user, open]);

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => {
        const accesses = u.client_accesses || [];
        return accesses.some(a => a.organization_id === organization.id);
      });
    },
    initialData: [],
    enabled: !!organization?.id
  });

  const { data: sections } = useQuery({
    queryKey: ['proposal-sections', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.ProposalSection.filter({ proposal_id: proposal.id });
    },
    initialData: [],
    enabled: !!proposal?.id
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const taskData = {
        ...formData,
        proposal_id: proposal.id,
        assigned_by_email: user.email,
        assigned_by_name: user.full_name,
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null
      };

      if (task) {
        await base44.entities.ProposalTask.update(task.id, taskData);
      } else {
        await base44.entities.ProposalTask.create(taskData);
      }

      // Create notification for assigned user
      if (formData.assigned_to_email && formData.assigned_to_email !== user.email) {
        await base44.entities.Notification.create({
          user_email: formData.assigned_to_email,
          notification_type: "task_assigned",
          title: "New Task Assigned",
          message: `You've been assigned: ${formData.title}`,
          related_proposal_id: proposal.id,
          from_user_email: user.email,
          from_user_name: user.full_name,
          action_url: `/app/ProposalBuilder?id=${proposal.id}`
        });
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Failed to save task. Please try again.");
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

  const taskFormFields = (
    <>
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
              <SelectValue placeholder="Select team member" />
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
        <Button type="submit" disabled={isSaving || !formData.title || !formData.assigned_to_email}>
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
            {task ? "Update task details and assignment" : "Add a new task to this proposal"}
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
                proposal={proposal}
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
