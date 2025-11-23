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
import { Plus, Edit, Trash2, Eye, EyeOff, Clock, Video, PlayCircle } from "lucide-react";
import { toast } from "sonner";

export default function TutorialVideoManager({ user }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'overview',
    video_url: '',
    thumbnail_url: '',
    duration_minutes: 0,
    transcript: '',
    difficulty_level: 'beginner',
    tags: '',
    is_published: false
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['tutorial-videos'],
    queryFn: () => base44.entities.TutorialVideo.filter({}, '-created_date')
  });

  const createVideoMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.TutorialVideo.create({
        ...data,
        tags: data.tags.split(',').map(t => t.trim()).filter(t => t)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorial-videos'] });
      setShowDialog(false);
      resetForm();
      toast.success('Tutorial video created');
    }
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }) => {
      return base44.entities.TutorialVideo.update(id, {
        ...data,
        tags: typeof data.tags === 'string'
          ? data.tags.split(',').map(t => t.trim()).filter(t => t)
          : data.tags
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorial-videos'] });
      setShowDialog(false);
      resetForm();
      toast.success('Tutorial video updated');
    }
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (id) => base44.entities.TutorialVideo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorial-videos'] });
      toast.success('Tutorial video deleted');
    }
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, is_published }) =>
      base44.entities.TutorialVideo.update(id, { is_published: !is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutorial-videos'] });
      toast.success('Publication status updated');
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'overview',
      video_url: '',
      thumbnail_url: '',
      duration_minutes: 0,
      transcript: '',
      difficulty_level: 'beginner',
      tags: '',
      is_published: false
    });
    setEditingVideo(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingVideo) {
      updateVideoMutation.mutate({ id: editingVideo.id, data: formData });
    } else {
      createVideoMutation.mutate(formData);
    }
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description || '',
      category: video.category,
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || '',
      duration_minutes: video.duration_minutes || 0,
      transcript: video.transcript || '',
      difficulty_level: video.difficulty_level || 'beginner',
      tags: Array.isArray(video.tags) ? video.tags.join(', ') : '',
      is_published: video.is_published
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tutorial Videos</CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Video
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-slate-500">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No tutorial videos yet</p>
                <Button onClick={() => setShowDialog(true)} className="mt-4" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Video
                </Button>
              </div>
            ) : (
              videos.map((video) => (
                <div key={video.id} className="border rounded-lg overflow-hidden hover:border-blue-300 transition-colors">
                  {video.thumbnail_url && (
                    <div className="relative aspect-video bg-slate-100">
                      <img 
                        src={video.thumbnail_url} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <PlayCircle className="w-12 h-12 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-slate-900 line-clamp-2">{video.title}</h4>
                      {video.is_published ? (
                        <Badge className="bg-green-600 text-white flex-shrink-0">
                          <Eye className="w-3 h-3 mr-1" />
                          Live
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex-shrink-0">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Draft
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{video.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {video.duration_minutes} min
                      </span>
                      <span>{video.view_count || 0} views</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePublishMutation.mutate({
                          id: video.id,
                          is_published: video.is_published
                        })}
                        className="flex-1"
                      >
                        {video.is_published ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                        {video.is_published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(video)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this video?')) {
                            deleteVideoMutation.mutate(video.id);
                          }
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVideo ? 'Edit Tutorial Video' : 'Add Tutorial Video'}
            </DialogTitle>
            <DialogDescription>
              Add a video tutorial to help users learn the platform
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Platform Overview & Getting Started"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what the video covers..."
                rows={2}
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
                    <SelectItem value="overview">Platform Overview</SelectItem>
                    <SelectItem value="proposals">Proposals</SelectItem>
                    <SelectItem value="kanban">Kanban Workflow</SelectItem>
                    <SelectItem value="collaboration">Collaboration</SelectItem>
                    <SelectItem value="ai_features">AI Features</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Duration (minutes)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  placeholder="5"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Video URL (YouTube, Vimeo, etc.)
              </label>
              <Input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Thumbnail URL (optional)
              </label>
              <Input
                type="url"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Transcript (optional)
              </label>
              <Textarea
                value={formData.transcript}
                onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                placeholder="Full transcript for accessibility..."
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Tags (comma-separated)
              </label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="tutorial, beginner, overview"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_published_video"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="is_published_video" className="text-sm text-slate-700">
                Publish immediately
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingVideo ? 'Update' : 'Add'} Video
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}