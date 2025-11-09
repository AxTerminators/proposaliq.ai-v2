import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  Trash2,
  User,
  Calendar,
  AlertCircle,
  FileText,
  MessageSquare,
  Clock,
  Paperclip
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low Priority', color: 'bg-slate-100 text-slate-700' },
  { value: 'medium', label: 'Medium Priority', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High Priority', color: 'bg-amber-100 text-amber-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' }
];

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: 'bg-slate-100 text-slate-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'blocked', label: 'Blocked', color: 'bg-red-100 text-red-700' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700' }
];

export default function ProjectTaskModal({ task, isOpen, onClose, organization, kanbanConfig }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to_email: '',
    assigned_to_name: '',
    due_date: '',
    priority: 'medium',
    status: 'not_started',
    estimated_hours: '',
    tags: [],
    is_blocked: false,
    blocker_reason: ''
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assigned_to_email: task.assigned_to_email || '',
        assigned_to_name: task.assigned_to_name || '',
        due_date: task.due_date || '',
        priority: task.priority || 'medium',
        status: task.status || 'not_started',
        estimated_hours: task.estimated_hours || '',
        tags: task.tags || [],
        is_blocked: task.is_blocked || false,
        blocker_reason: task.blocker_reason || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        assigned_to_email: '',
        assigned_to_name: '',
        due_date: '',
        priority: 'medium',
        status: 'not_started',
        estimated_hours: '',
        tags: [],
        is_blocked: false,
        blocker_reason: ''
      });
    }
  }, [task, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (task) {
        return base44.entities.ProjectTask.update(task.id, data);
      } else {
        return base44.entities.ProjectTask.create({
          ...data,
          organization_id: organization.id,
          board_id: kanbanConfig?.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      onClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId) => {
      return base44.entities.ProjectTask.delete(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      onClose();
    }
  });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert("Please enter a task title");
      return;
    }

    await saveMutation.mutateAsync(formData);
  };

  const handleDelete = async () => {
    if (!task) return;
    if (confirm(`Delete task "${task.title}"?`)) {
      await deleteMutation.mutateAsync(task.id);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tagToRemove)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            {task ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription>
            {task ? 'Update task details and track progress' : 'Create a new project task'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Review technical documentation"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the task in detail..."
                rows={4}
              />
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <Badge className={option.color}>{option.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <Badge className={option.color}>{option.label}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignee and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned To (Email)</Label>
                <Input
                  type="email"
                  value={formData.assigned_to_email}
                  onChange={(e) => setFormData({...formData, assigned_to_email: e.target.value})}
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                />
              </div>
            </div>

            {/* Estimated Hours */}
            <div className="space-y-2">
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                placeholder="e.g., 8"
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            {/* Blocker Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_blocked"
                  checked={formData.is_blocked}
                  onChange={(e) => setFormData({...formData, is_blocked: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <Label htmlFor="is_blocked" className="cursor-pointer">
                  This task is blocked
                </Label>
              </div>

              {formData.is_blocked && (
                <div className="space-y-2">
                  <Label>Blocker Reason</Label>
                  <Textarea
                    value={formData.blocker_reason}
                    onChange={(e) => setFormData({...formData, blocker_reason: e.target.value})}
                    placeholder="Explain why this task is blocked..."
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag..."
                />
                <Button onClick={handleAddTag} variant="outline">
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          {task && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}