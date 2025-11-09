import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function FolderSidebar({ organization, selectedFolderId, onSelectFolder, purpose = 'content_library' }) {
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderData, setNewFolderData] = useState({
    folder_name: '',
    parent_folder_id: null,
    purpose: purpose,
    description: '',
    icon: '📁'
  });

  // Fetch folders
  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['folders', organization?.id, purpose],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Folder.filter({
        organization_id: organization.id,
        purpose: purpose
      }, 'folder_name');
    },
    enabled: !!organization?.id,
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Folder.create({
        ...data,
        organization_id: organization.id
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      setShowCreateDialog(false);
      setNewFolderData({
        folder_name: '',
        parent_folder_id: null,
        purpose: purpose,
        description: '',
        icon: '📁'
      });
    }
  });

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = () => {
    if (!newFolderData.folder_name.trim()) {
      alert('Please enter a folder name');
      return;
    }
    createFolderMutation.mutate(newFolderData);
  };

  // Build folder tree
  const buildFolderTree = (parentId = null) => {
    return folders
      .filter(f => f.parent_folder_id === parentId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  };

  const renderFolder = (folder, level = 0) => {
    const hasChildren = folders.some(f => f.parent_folder_id === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const children = buildFolderTree(folder.id);

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
            isSelected 
              ? "bg-blue-100 text-blue-900 font-medium" 
              : "hover:bg-slate-100 text-slate-700",
            level > 0 && "ml-4"
          )}
          onClick={() => onSelectFolder(folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5 hover:bg-slate-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          <span className="text-lg">{folder.icon || (isExpanded ? '📂' : '📁')}</span>
          <span className="flex-1 truncate text-sm">{folder.folder_name}</span>
          
          {folder.is_system_folder && (
            <Badge variant="secondary" className="text-xs">System</Badge>
          )}
        </div>

        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 border-r bg-white flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">Folders</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowCreateDialog(true)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <FolderPlus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-2"></div>
            <p className="text-sm text-slate-600">Loading folders...</p>
          </div>
        ) : folders.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Folder className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-600 mb-3">No folders yet</p>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Folder
            </Button>
          </div>
        ) : (
          buildFolderTree().map(folder => renderFolder(folder))
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-blue-600" />
              Create New Folder
            </DialogTitle>
            <DialogDescription>
              Organize your content library with folders
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder_name">Folder Name *</Label>
              <Input
                id="folder_name"
                value={newFolderData.folder_name}
                onChange={(e) => setNewFolderData({...newFolderData, folder_name: e.target.value})}
                placeholder="e.g., Technical Approaches"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_folder">Parent Folder (Optional)</Label>
              <Select
                value={newFolderData.parent_folder_id || 'none'}
                onValueChange={(value) => setNewFolderData({
                  ...newFolderData, 
                  parent_folder_id: value === 'none' ? null : value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top level)</SelectItem>
                  {folders.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.icon || '📁'} {f.folder_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={newFolderData.description}
                onChange={(e) => setNewFolderData({...newFolderData, description: e.target.value})}
                placeholder="Brief description of folder contents"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon (Emoji)</Label>
              <Input
                id="icon"
                value={newFolderData.icon}
                onChange={(e) => setNewFolderData({...newFolderData, icon: e.target.value})}
                placeholder="📁"
                maxLength={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              disabled={createFolderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isPending || !newFolderData.folder_name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createFolderMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Create Folder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}