import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  FolderOpen,
  Trash2,
  FolderInput,
  Tags,
  CheckSquare,
  XSquare,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LibraryBulkOperations({ 
  selectedItems,
  onClearSelection,
  organization,
  currentFolderId 
}) {
  const queryClient = useQueryClient();
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState(null);
  const [newTags, setNewTags] = useState('');
  const [tagMode, setTagMode] = useState('add'); // 'add' or 'replace'

  // Fetch folders for move operation
  const { data: folders = [] } = useQuery({
    queryKey: ['folders-content-library', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Folder.filter({
        organization_id: organization.id,
        purpose: 'content_library'
      }, 'folder_name');
    },
    enabled: !!organization?.id,
  });

  // Bulk move mutation
  const bulkMoveMutation = useMutation({
    mutationFn: async ({ items, folderId }) => {
      const updates = items.map(item => {
        const entityName = item._entityType;
        return base44.entities[entityName].update(item.id, {
          folder_id: folderId
        });
      });
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-content'] });
      setShowMoveDialog(false);
      onClearSelection();
      alert(`✅ Moved ${selectedItems.length} item(s) successfully!`);
    },
    onError: (error) => {
      alert(`Error moving items: ${error.message}`);
    }
  });

  // Bulk tag mutation
  const bulkTagMutation = useMutation({
    mutationFn: async ({ items, tags, mode }) => {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      const updates = items.map(item => {
        const entityName = item._entityType;
        
        // Only update entities that have tags field
        if (!['ProposalResource', 'PastPerformance', 'TeamingPartner', 'KeyPersonnel'].includes(entityName)) {
          return Promise.resolve();
        }

        let newTags = tagsArray;
        if (mode === 'add') {
          const existingTags = item.tags || [];
          newTags = [...new Set([...existingTags, ...tagsArray])];
        }

        return base44.entities[entityName].update(item.id, {
          tags: newTags
        });
      });

      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-content'] });
      setShowTagDialog(false);
      setNewTags('');
      onClearSelection();
      alert(`✅ Tagged ${selectedItems.length} item(s) successfully!`);
    },
    onError: (error) => {
      alert(`Error tagging items: ${error.message}`);
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (items) => {
      const deletes = items.map(item => {
        const entityName = item._entityType;
        return base44.entities[entityName].delete(item.id);
      });
      return Promise.all(deletes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-content'] });
      setShowDeleteDialog(false);
      onClearSelection();
      alert(`✅ Deleted ${selectedItems.length} item(s) successfully!`);
    },
    onError: (error) => {
      alert(`Error deleting items: ${error.message}`);
    }
  });

  const handleMove = () => {
    if (!targetFolderId) {
      alert('Please select a target folder');
      return;
    }
    bulkMoveMutation.mutate({ items: selectedItems, folderId: targetFolderId });
  };

  const handleTag = () => {
    if (!newTags.trim()) {
      alert('Please enter tags');
      return;
    }
    bulkTagMutation.mutate({ items: selectedItems, tags: newTags, mode: tagMode });
  };

  const handleDelete = () => {
    bulkDeleteMutation.mutate(selectedItems);
  };

  if (selectedItems.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Card className="border-2 border-blue-500 shadow-2xl bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-slate-900">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="h-6 w-px bg-slate-300" />

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMoveDialog(true)}
              >
                <FolderInput className="w-4 h-4 mr-2" />
                Move
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTagDialog(true)}
              >
                <Tags className="w-4 h-4 mr-2" />
                Tag
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearSelection}
              >
                <XSquare className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {selectedItems.length} Item(s)</DialogTitle>
            <DialogDescription>
              Select the destination folder
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label className="mb-2 block">Destination Folder</Label>
            <Select value={targetFolderId || 'none'} onValueChange={setTargetFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select folder..." />
              </SelectTrigger>
              <SelectContent>
                {folders.filter(f => f.id !== currentFolderId).map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.icon || '📁'} {folder.folder_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMove}
              disabled={bulkMoveMutation.isPending || !targetFolderId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {bulkMoveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Moving...
                </>
              ) : (
                <>
                  <FolderInput className="w-4 h-4 mr-2" />
                  Move Items
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tag {selectedItems.length} Item(s)</DialogTitle>
            <DialogDescription>
              Add or replace tags for selected items
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">Tag Mode</Label>
              <Select value={tagMode} onValueChange={setTagMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add to existing tags</SelectItem>
                  <SelectItem value="replace">Replace all tags</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Tags (comma-separated)</Label>
              <Input
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="e.g., technical, DoD, important"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTag}
              disabled={bulkTagMutation.isPending || !newTags.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {bulkTagMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Tagging...
                </>
              ) : (
                <>
                  <Tags className="w-4 h-4 mr-2" />
                  Apply Tags
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete {selectedItems.length} Item(s)?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The items will be permanently deleted from your library.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
            <p className="text-sm text-amber-900">
              ⚠️ You are about to delete <strong>{selectedItems.length}</strong> item{selectedItems.length !== 1 ? 's' : ''} from your Content Library.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Yes, Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}