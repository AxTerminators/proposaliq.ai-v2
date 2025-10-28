import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Plus,
  Edit,
  Trash2,
  Star,
  Upload
} from "lucide-react";
import { canEdit, canDelete, logAdminAction } from "./PermissionChecker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ContentLibraryModule({ currentUser }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContent, setSelectedContent] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: adminContent } = useQuery({
    queryKey: ['admin-content'],
    queryFn: () => base44.entities.AdminData.list('-created_date'),
    initialData: []
  });

  const createContentMutation = useMutation({
    mutationFn: async (contentData) => {
      await base44.entities.AdminData.create(contentData);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
      await logAdminAction('content_created', { type: 'admin_data' });
      setShowCreateDialog(false);
      alert("Content created successfully");
    }
  });

  const updateContentMutation = useMutation({
    mutationFn: async ({ contentId, updates }) => {
      await base44.entities.AdminData.update(contentId, updates);
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
      await logAdminAction('content_updated', variables.updates, variables.contentId);
      setShowEditDialog(false);
      alert("Content updated successfully");
    }
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (contentId) => {
      await base44.entities.AdminData.delete(contentId);
    },
    onSuccess: async (_, contentId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
      await logAdminAction('content_deleted', { contentId }, contentId);
      alert("Content deleted successfully");
    }
  });

  const handleCreateContent = () => {
    setSelectedContent({
      data_type: 'template',
      title: '',
      content: '',
      category: '',
      is_public: true,
      is_proprietary: false
    });
    setShowCreateDialog(true);
  };

  const handleEditContent = (content) => {
    setSelectedContent({...content});
    setShowEditDialog(true);
  };

  const filteredContent = adminContent.filter(content =>
    content.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userRole = currentUser.admin_role || currentUser.role;
  const canEditContent = canEdit(userRole, 'content');
  const canDeleteContent = canDelete(userRole, 'content');

  const contentByType = adminContent.reduce((acc, content) => {
    acc[content.data_type] = (acc[content.data_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Content Library</h2>
          <p className="text-slate-600">Manage templates, regulations, and training materials</p>
        </div>
        {canEditContent && (
          <Button onClick={handleCreateContent}>
            <Plus className="w-4 h-4 mr-2" />
            Add Content
          </Button>
        )}
      </div>

      {/* Content Stats */}
      <div className="grid md:grid-cols-5 gap-4">
        {Object.entries(contentByType).map(([type, count]) => (
          <Card key={type} className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-slate-600 capitalize">{type.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content List */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {filteredContent.map((content) => (
              <div key={content.id} className="p-4 border rounded-lg hover:border-blue-300 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{content.title}</h3>
                      <Badge variant="outline" className="capitalize">
                        {content.data_type.replace(/_/g, ' ')}
                      </Badge>
                      {content.is_proprietary && (
                        <Badge className="bg-amber-100 text-amber-700">
                          <Star className="w-3 h-3 mr-1" />
                          Proprietary
                        </Badge>
                      )}
                      {!content.is_public && (
                        <Badge variant="secondary">Private</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                      {content.content?.substring(0, 200)}...
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {content.category && (
                        <span className="bg-slate-100 px-2 py-1 rounded">
                          {content.category}
                        </span>
                      )}
                      {content.version && (
                        <span>Version: {content.version}</span>
                      )}
                      <span>{new Date(content.created_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {canEditContent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditContent(content)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDeleteContent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Delete this content?')) {
                            deleteContentMutation.mutate(content.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredContent.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>No content found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Content</DialogTitle>
            <DialogDescription>
              Add new templates, regulations, or training materials
            </DialogDescription>
          </DialogHeader>
          {selectedContent && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select
                  value={selectedContent.data_type}
                  onValueChange={(value) => setSelectedContent({...selectedContent, data_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="far_regulation">FAR Regulation</SelectItem>
                    <SelectItem value="dfars">DFARS</SelectItem>
                    <SelectItem value="training_material">Training Material</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="guideline">Guideline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={selectedContent.title}
                  onChange={(e) => setSelectedContent({...selectedContent, title: e.target.value})}
                  placeholder="Enter title..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={selectedContent.category}
                  onChange={(e) => setSelectedContent({...selectedContent, category: e.target.value})}
                  placeholder="e.g., Technical, Management, Past Performance..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={selectedContent.content}
                  onChange={(e) => setSelectedContent({...selectedContent, content: e.target.value})}
                  className="min-h-48"
                  placeholder="Enter content..."
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedContent.is_public}
                    onChange={(e) => setSelectedContent({...selectedContent, is_public: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label>Public (Available to all users)</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedContent.is_proprietary}
                    onChange={(e) => setSelectedContent({...selectedContent, is_proprietary: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label>Proprietary Content</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                createContentMutation.mutate(selectedContent);
              }}
            >
              Create Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
          </DialogHeader>
          {selectedContent && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select
                  value={selectedContent.data_type}
                  onValueChange={(value) => setSelectedContent({...selectedContent, data_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="far_regulation">FAR Regulation</SelectItem>
                    <SelectItem value="dfars">DFARS</SelectItem>
                    <SelectItem value="training_material">Training Material</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="guideline">Guideline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={selectedContent.title}
                  onChange={(e) => setSelectedContent({...selectedContent, title: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={selectedContent.category}
                  onChange={(e) => setSelectedContent({...selectedContent, category: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={selectedContent.content}
                  onChange={(e) => setSelectedContent({...selectedContent, content: e.target.value})}
                  className="min-h-48"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedContent.is_public}
                    onChange={(e) => setSelectedContent({...selectedContent, is_public: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label>Public</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedContent.is_proprietary}
                    onChange={(e) => setSelectedContent({...selectedContent, is_proprietary: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label>Proprietary</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateContentMutation.mutate({
                  contentId: selectedContent.id,
                  updates: {
                    data_type: selectedContent.data_type,
                    title: selectedContent.title,
                    content: selectedContent.content,
                    category: selectedContent.category,
                    is_public: selectedContent.is_public,
                    is_proprietary: selectedContent.is_proprietary
                  }
                });
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}