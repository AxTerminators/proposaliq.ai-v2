import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function TaskForm({ open, onOpenChange, task, proposal, onSave, user, organization }) {
  const proposalId = proposal?.id;
  const organizationId = organization?.id;
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to_email: "",
    assigned_to_name: "",
    status: "todo",
    priority: "medium",
    due_date: null,
    section_id: "",
    proposal_id: proposalId || "",
    task_category: "proposal",
    is_general_task: !proposalId,
    ...task
  });

  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherSectionName, setOtherSectionName] = useState("");

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: "",
        description: "",
        assigned_to_email: "",
        assigned_to_name: "",
        status: "todo",
        priority: "medium",
        due_date: null,
        section_id: "",
        proposal_id: proposalId || "",
        task_category: "proposal",
        is_general_task: !proposalId,
        ...task
      });
    } else {
      setFormData({
        title: "",
        description: "",
        assigned_to_email: user?.email || "",
        assigned_to_name: user?.full_name || "",
        status: "todo",
        priority: "medium",
        due_date: null,
        section_id: "",
        proposal_id: proposalId || "",
        task_category: "proposal",
        is_general_task: !proposalId,
      });
    }
  }, [task, proposalId, user]);

  // Fetch available sections for this proposal
  const { data: sections = [] } = useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalSection.filter(
        { proposal_id: proposalId },
        'order'
      );
    },
    enabled: !!proposalId
  });

  // Fetch team members for assignment - IMPROVED to always include current user
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', organizationId, user?.email],
    queryFn: async () => {
      if (!organizationId) {
        // Even without org, return current user
        return user ? [user] : [];
      }
      
      try {
        const allUsers = await base44.entities.User.list();
        const orgUsers = allUsers.filter(u => {
          const accesses = u.client_accesses || [];
          return accesses.some(a => a.organization_id === organizationId);
        });
        
        // Always ensure current user is included
        if (user && !orgUsers.find(u => u.email === user.email)) {
          orgUsers.unshift(user);
        }
        
        return orgUsers;
      } catch (error) {
        console.error('Error fetching team members:', error);
        // Fallback to at least current user
        return user ? [user] : [];
      }
    },
    enabled: !!organizationId || !!user
  });

  // Check if "Other" section is selected
  useEffect(() => {
    const selectedSection = sections.find(s => s.id === formData.section_id);
    if (selectedSection?.section_type === 'other') {
      setShowOtherInput(true);
      setOtherSectionName(selectedSection.section_name === 'Other' ? '' : selectedSection.section_name);
    } else {
      setShowOtherInput(false);
      setOtherSectionName("");
    }
  }, [formData.section_id, sections]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If "Other" is selected and user entered custom text, update the section name
    if (showOtherInput && otherSectionName.trim()) {
      const otherSection = sections.find(s => s.section_type === 'other');
      if (otherSection && otherSection.section_name === 'Other') {
        await base44.entities.ProposalSection.update(otherSection.id, {
          section_name: otherSectionName.trim()
        });
      }
    }
    
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription>
            {proposal ? `Task for ${proposal.proposal_name}` : 'General task'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add task details..."
              rows={3}
            />
          </div>

          {/* Related Section */}
          {proposalId && sections.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="section_id">Related Section</Label>
              <Select
                value={formData.section_id}
                onValueChange={(value) => setFormData({ ...formData, section_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a section (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.section_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Custom "Other" text input */}
              {showOtherInput && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  <Label htmlFor="other_section_name" className="text-sm font-medium text-amber-900">
                    Specify Section Name
                  </Label>
                  <Input
                    id="other_section_name"
                    value={otherSectionName}
                    onChange={(e) => setOtherSectionName(e.target.value)}
                    placeholder="e.g., Security Plan, Innovation Strategy..."
                    className="bg-white"
                  />
                  <p className="text-xs text-amber-700">
                    This will rename the "Other" section to your custom name
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Assign To */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assign To *</Label>
            <Select
              value={formData.assigned_to_email}
              onValueChange={(value) => {
                const member = teamMembers.find(m => m.email === value);
                setFormData({
                  ...formData,
                  assigned_to_email: value,
                  assigned_to_name: member?.full_name || value
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.length === 0 ? (
                  <SelectItem value="no-users" disabled>
                    No team members found
                  </SelectItem>
                ) : (
                  teamMembers.map((member) => (
                    <SelectItem key={member.email} value={member.email}>
                      {member.full_name || member.email} {member.email === user?.email ? '(You)' : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
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

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? format(new Date(formData.due_date), 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.due_date ? new Date(formData.due_date) : undefined}
                  onSelect={(date) => setFormData({ ...formData, due_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {formData.due_date && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFormData({ ...formData, due_date: null })}
                className="text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Clear date
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}