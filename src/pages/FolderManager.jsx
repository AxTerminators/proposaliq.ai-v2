import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  FolderPlus,
  FolderOpen,
  Trash2,
  Edit,
  ChevronRight,
  ChevronDown,
  Layers,
  Star,
  Archive,
  Plus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useOrganization } from "../components/layout/OrganizationContext";

const FOLDER_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'green', label: 'Green', class: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
];

const FOLDER_ICONS = [
  'Folder', 'FolderOpen', 'Briefcase', 'Package', 'Archive', 'Inbox', 'FileText'
];

export default function FolderManager() {
  const queryClient = useQueryClient();
  const { organization, user } = useOrganization();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [deletingFolder, setDeletingFolder] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  
  const [formData, setFormData] = useState({
    folder_name: '',
    parent_folder_id: null,
    folder_type: 'mixed',
    description: '',
    color: 'blue',
    icon: 'Folder'
  });

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['folders', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Folder.filter(
        { organization_id: organization.id },
        'order'
      );
    },
    enabled: !!organization?.id,
  });

  const { data: boards = [] } = useQuery({
    queryKey: ['boards-for-folders', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        'board_type'
      );
    },
    enabled: !!organization?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Folder.create({
        ...data,
        organization_id: organization.id,
        created_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.Folder.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (folderId) => {
      return base44.entities.Folder.delete(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setDeletingFolder(null);
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }) => {
      return base44.entities.Folder.update(id, { is_favorite: !isFavorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });

  // Build folder tree structure
  const folderTree = useMemo(() => {
    const buildTree = (parentId = null) => {
      return folders
        .filter(f => f.parent_folder_id === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id),
          boards: boards.filter(b => b.folder_id === folder.id)
        }));
    };
    return buildTree(null);
  }, [folders, boards]);

  const handleOpenCreateDialog = (parentFolderId = null) => {
    setFormData({
      folder_name: '',
      parent_folder_id: parentFolderId,
      folder_type: 'mixed',
      description: '',
      color: 'blue',
      icon: 'Folder'
    });
    setEditingFolder(null);
    setShowCreateDialog(true);
  };

  const handleOpenEditDialog = (folder) => {
    setFormData({
      folder_name: folder.folder_name,
      parent_folder_id: folder.parent_folder_id,
      folder_type: folder.folder_type,
      description: folder.description || '',
      color: folder.color || 'blue',
      icon: folder.icon || 'Folder'
    });
    setEditingFolder(folder);
    setShowCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingFolder(null);
    setFormData({
      folder_name: '',
      parent_folder_id: null,
      folder_type: 'mixed',
      description: '',
      color: 'blue',
      icon: 'Folder'
    });
  };

  const handleSubmit = async () => {
    if (!formData.folder_name.trim()) return;

    if (editingFolder) {
      await updateMutation.mutateAsync({
        id: editingFolder.id,
        data: formData
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = async () => {
    if (!deletingFolder) return;

    // Check if folder has children
    const hasChildren = folders.some(f => f.parent_folder_id === deletingFolder.id);
    const hasBoards = boards.some(b => b.folder_id === deletingFolder.id);

    if (hasChildren || hasBoards) {
      alert('Cannot delete folder with subfolders or boards. Please move or delete contents first.');
      setDeletingFolder(null);
      return;
    }

    await deleteMutation.mutateAsync(deletingFolder.id);
  };

  const toggleExpanded = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolderTree = (foldersToRender, level = 0) => {
    return foldersToRender.map(folder => {
      const isExpanded = expandedFolders.has(folder.id);
      const hasChildren = folder.children.length > 0;
      const colorConfig = FOLDER_COLORS.find(c => c.value === folder.color) || FOLDER_COLORS[0];

      return (
        <div key={folder.id} className="mb-2">
          <Card className={cn("border-2", colorConfig.class)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {hasChildren && (
                    <button
                      onClick={() => toggleExpanded(folder.id)}
                      className="p-1 hover:bg-white/50 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  
                  {isExpanded ? (
                    <FolderOpen className="w-5 h-5" />
                  ) : (
                    <Folder className="w-5 h-5" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{folder.folder_name}</h3>
                      {folder.is_favorite && (
                        <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                      )}
                      {folder.is_archived && (
                        <Badge className="bg-gray-500 text-white">Archived</Badge>
                      )}
                    </div>
                    
                    {folder.description && (
                      <p className="text-sm text-slate-600 mt-1">{folder.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Layers className="w-4 h-4" />
                        <span>{folder.boards.length} board{folder.boards.length !== 1 ? 's' : ''}</span>
                      </div>
                      {hasChildren && (
                        <div className="flex items-center gap-1">
                          <Folder className="w-4 h-4" />
                          <span>{folder.children.length} subfolder{folder.children.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {folder.folder_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFavoriteMutation.mutate({ id: folder.id, isFavorite: folder.is_favorite })}
                  >
                    <Star className={cn("w-4 h-4", folder.is_favorite && "fill-yellow-600 text-yellow-600")} />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenCreateDialog(folder.id)}
                  >
                    <FolderPlus className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEditDialog(folder)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingFolder(folder)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Show boards in this folder */}
              {folder.boards.length > 0 && (
                <div className="mt-3 ml-8 space-y-2">
                  {folder.boards.map(board => (
                    <div key={board.id} className="flex items-center gap-2 p-2 bg-white/60 rounded border border-slate-200">
                      <Layers className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium">{board.board_name}</span>
                      {board.is_master_board && (
                        <Badge className="bg-yellow-500 text-white text-xs">Master</Badge>
                      )}
                      {board.is_template_board && (
                        <Badge className="bg-blue-500 text-white text-xs">Template</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Render children if expanded */}
          {isExpanded && hasChildren && (
            <div className="ml-8 mt-2">
              {renderFolderTree(folder.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const rootFolders = folderTree;
  const unorganizedBoards = boards.filter(b => !b.folder_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Folder Manager</h1>
              <p className="text-slate-600">Organize your boards into folders</p>
            </div>
            <Button
              onClick={() => handleOpenCreateDialog()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <FolderPlus className="w-5 h-5 mr-2" />
              Create Folder
            </Button>
          </div>
        </div>

        {/* Favorites Section */}
        {folders.some(f => f.is_favorite) && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-600 fill-yellow-600" />
              <h2 className="text-xl font-bold text-slate-900">Favorites</h2>
            </div>
            <div className="space-y-2">
              {folders.filter(f => f.is_favorite).map(folder => {
                const colorConfig = FOLDER_COLORS.find(c => c.value === folder.color) || FOLDER_COLORS[0];
                return (
                  <Card key={folder.id} className={cn("border-2", colorConfig.class)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Folder className="w-5 h-5" />
                      <span className="font-semibold">{folder.folder_name}</span>
                      <Badge variant="outline" className="ml-auto">
                        {folder.board_count || 0} boards
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Folder Tree */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">All Folders</h2>
          {rootFolders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FolderPlus className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No folders yet</h3>
                <p className="text-slate-600 mb-4">Create your first folder to organize your boards</p>
                <Button
                  onClick={() => handleOpenCreateDialog()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Folder
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {renderFolderTree(rootFolders)}
            </div>
          )}
        </div>

        {/* Unorganized Boards */}
        {unorganizedBoards.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Unorganized Boards</h2>
            <Card className="border-2 border-dashed border-slate-300">
              <CardContent className="p-4 space-y-2">
                {unorganizedBoards.map(board => (
                  <div key={board.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium flex-1">{board.board_name}</span>
                    {board.is_master_board && (
                      <Badge className="bg-yellow-500 text-white text-xs">Master</Badge>
                    )}
                    {board.is_template_board && (
                      <Badge className="bg-blue-500 text-white text-xs">Template</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFolder ? 'Edit Folder' : 'Create New Folder'}
            </DialogTitle>
            <DialogDescription>
              {editingFolder ? 'Update folder details' : 'Create a new folder to organize your boards'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Folder Name *</Label>
              <Input
                value={formData.folder_name}
                onChange={(e) => setFormData({...formData, folder_name: e.target.value})}
                placeholder="e.g., Active RFPs, Q1 2024 Projects"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Folder Type</Label>
                <Select value={formData.folder_type} onValueChange={(value) => setFormData({...formData, folder_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed (All Boards)</SelectItem>
                    <SelectItem value="proposal_boards">Proposal Boards Only</SelectItem>
                    <SelectItem value="project_boards">Project Boards Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={formData.color} onValueChange={(value) => setFormData({...formData, color: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLDER_COLORS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-4 h-4 rounded", color.class)} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!editingFolder && (
              <div className="space-y-2">
                <Label>Parent Folder (Optional)</Label>
                <Select 
                  value={formData.parent_folder_id || 'none'} 
                  onValueChange={(value) => setFormData({...formData, parent_folder_id: value === 'none' ? null : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Root level (no parent)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Root level (no parent)</SelectItem>
                    {folders.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.folder_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.folder_name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingFolder ? 'Update Folder' : 'Create Folder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFolder} onOpenChange={() => setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder "{deletingFolder?.folder_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this folder. Boards inside will become unorganized.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}