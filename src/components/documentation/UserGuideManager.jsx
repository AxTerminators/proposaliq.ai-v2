import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye, EyeOff, Clock, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export default function UserGuideManager({ user }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'getting_started',
    content: '',
    excerpt: '',
    difficulty_level: 'beginner',
    tags: '',
    is_published: false
  });

  const { data: guides = [] } = useQuery({
    queryKey: ['user-guides'],
    queryFn: () => base44.entities.UserGuide.filter({}, '-created_date')
  });

  const createGuideMutation = useMutation({
    mutationFn: async (data) => {
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const wordCount = data.content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200); // Average reading speed
      
      return base44.entities.UserGuide.create({
        ...data,
        slug,
        reading_time: readingTime,
        tags: data.tags.split(',').map(t => t.trim()).filter(t => t),
        author_name: user?.full_name,
        author_email: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-guides'] });
      setShowDialog(false);
      resetForm();
      toast.success('User guide created');
    }
  });

  const updateGuideMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const wordCount = data.content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200);
      
      return base44.entities.UserGuide.update(id, {
        ...data,
        reading_time: readingTime,
        tags: typeof data.tags === 'string' 
          ? data.tags.split(',').map(t => t.trim()).filter(t => t)
          : data.tags,
        last_updated_by: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-guides'] });
      setShowDialog(false);
      resetForm();
      toast.success('User guide updated');
    }
  });

  const deleteGuideMutation = useMutation({
    mutationFn: (id) => base44.entities.UserGuide.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-guides'] });
      toast.success('User guide deleted');
    }
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, is_published }) => 
      base44.entities.UserGuide.update(id, { is_published: !is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-guides'] });
      toast.success('Publication status updated');
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'getting_started',
      content: '',
      excerpt: '',
      difficulty_level: 'beginner',
      tags: '',
      is_published: false
    });
    setEditingGuide(null);
    setPreviewMode(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingGuide) {
      updateGuideMutation.mutate({ id: editingGuide.id, data: formData });
    } else {
      createGuideMutation.mutate(formData);
    }
  };

  const handleEdit = (guide) => {
    setEditingGuide(guide);
    setFormData({
      title: guide.title,
      category: guide.category,
      content: guide.content,
      excerpt: guide.excerpt || '',
      difficulty_level: guide.difficulty_level || 'beginner',
      tags: Array.isArray(guide.tags) ? guide.tags.join(', ') : '',
      is_published: guide.is_published
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Guides</CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Guide
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {guides.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No user guides yet</p>
                <Button onClick={() => setShowDialog(true)} className="mt-4" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Guide
                </Button>
              </div>
            ) : (
              guides.map((guide) => (
                <div key={guide.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{guide.title}</h4>
                        {guide.is_published ? (
                          <Badge className="bg-green-600 text-white">
                            <Eye className="w-3 h-3 mr-1" />
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Draft
                          </Badge>
                        )}
                        <Badge variant="outline" className="capitalize">
                          {guide.difficulty_level}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{guide.excerpt}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {guide.reading_time} min read
                        </span>
                        <span>{guide.view_count || 0} views</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePublishMutation.mutate({ 
                          id: guide.id, 
                          is_published: guide.is_published 
                        })}
                      >
                        {guide.is_published ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(guide)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Delete this guide?')) {
                            deleteGuideMutation.mutate(guide.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGuide ? 'Edit User Guide' : 'Create User Guide'}
            </DialogTitle>
            <DialogDescription>
              Write comprehensive documentation to help users
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={!previewMode ? "default" : "outline"}
              onClick={() => setPreviewMode(false)}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant={previewMode ? "default" : "outline"}
              onClick={() => setPreviewMode(true)}
            >
              Preview
            </Button>
          </div>

          {!previewMode ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Title
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Getting Started with GovHQ.ai"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Category
                  </label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="getting_started">Getting Started</SelectItem>
                      <SelectItem value="proposals">Proposals</SelectItem>
                      <SelectItem value="kanban">Kanban Board</SelectItem>
                      <SelectItem value="collaboration">Collaboration</SelectItem>
                      <SelectItem value="ai_features">AI Features</SelectItem>
                      <SelectItem value="export">Export & Reporting</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Difficulty Level
                  </label>
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Excerpt (Brief Summary)
                </label>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="A brief description of what this guide covers..."
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Content (Markdown supported)
                </label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="# Introduction&#10;&#10;Write your guide content here using Markdown..."
                  rows={12}
                  required
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Tags (comma-separated)
                </label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="onboarding, setup, basics"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_published" className="text-sm text-slate-700">
                  Publish immediately
                </label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingGuide ? 'Update' : 'Create'} Guide
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="prose prose-slate max-w-none">
              <h1>{formData.title}</h1>
              <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
                <Badge className="capitalize">{formData.difficulty_level}</Badge>
                <span>•</span>
                <span>{Math.ceil(formData.content.split(/\s+/).length / 200)} min read</span>
              </div>
              {formData.excerpt && (
                <p className="text-lg text-slate-600 italic">{formData.excerpt}</p>
              )}
              <ReactMarkdown>{formData.content}</ReactMarkdown>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}