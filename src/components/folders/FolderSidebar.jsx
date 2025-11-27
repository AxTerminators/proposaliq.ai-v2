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
  Plus,
  MoreVertical,
  FolderEdit,
  AlertCircle, // NEW import
  Check // NEW import
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  normalizeForComparison,
  containsForbiddenCharacters,
  FORBIDDEN_CHARS_LIST
} from "@/components/utils/boardNameValidation"; // NEW import

export default function FolderSidebar({ organization, selectedFolderId, onSelectFolder, purpose = 'content_library' }) {
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [deletingFolder, setDeletingFolder] = useState(null);
  const [newFolderData, setNewFolderData] = useState({
    folder_name: '',
    parent_folder_id: null,
    purpose: purpose,
    description: '',
    icon: '📁'
  });

  // NEW: Validation state for folder names
  const [createNameError, setCreateNameError] = useState("");
  const [editNameError, setEditNameError] = useState("");
  const [isValidatingCreate, setIsValidatingCreate] = useState(false);
  const [isValidatingEdit, setIsValidatingEdit] = useState(false);

  // Fetch folders
  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['folders', organization?.id, purpose],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Folder.filter({
        organization_id: organization.id,
        purpose: purpose
      }, 'folder_name, parent_folder_id, id, description, icon, is_system_folder');
    },
    enabled: !!organization?.id,
  });

  // NEW: Validate folder name
  const validateFolderName = async (name, excludeId = null, setError, setValidating, currentParentId) => {
    if (!name.trim()) {
      setError("");
      return false;
    }

    // Check length
    if (name.trim().length < 3) {
      setError("Folder name must be at least 3 characters long");
      return false;
    }

    if (name.trim().length > 100) {
      setError("Folder name must be less than 100 characters");
      return false;
    }

    // Check forbidden characters
    if (containsForbiddenCharacters(name)) {
      setError(`Folder name contains forbidden characters. Avoid: ${FORBIDDEN_CHARS_LIST}`);
      return false;
    }

    setValidating(true);

    try {
      // Check uniqueness within same parent and purpose
      const normalizedName = normalizeForComparison(name);
      const parentToCheck = currentParentId; // Use currentParentId passed in

      const duplicate = folders.find(f => {
        if (excludeId && f.id === excludeId) return false; // Ignore self when editing
        if (f.purpose !== purpose) return false; // Only compare within the same purpose
        if (f.parent_folder_id !== parentToCheck) return false; // Only compare within the same parent
        return normalizeForComparison(f.folder_name) === normalizedName;
      });

      if (duplicate) {
        setError(`A folder named "${name}" already exists at this level`);
        return false;
      }

      setError("");
      return true;
    } catch (error) {
      console.error('[FolderSidebar] Validation error:', error);
      setError("Validation error. Please try again.");
      return false;
    } finally {
      setValidating(false);
    }
  };

  // NEW: Handle folder name change with validation
  const handleCreateNameChange = async (value) => {
    setNewFolderData(prev => ({...prev, folder_name: value}));

    if (!value.trim()) {
      setCreateNameError("");
      return;
    }
    // Debounce this call if performance becomes an issue
    await validateFolderName(value, null, setCreateNameError, setIsValidatingCreate, newFolderData.parent_folder_id);
  };

  // NEW: Handle parent folder change for create dialog
  const handleCreateParentChange = async (value) => {
    const newParentId = value === 'none' ? null : value;
    setNewFolderData(prev => ({ ...prev, parent_folder_id: newParentId }));
    // Re-validate folder name with new parent context
    if (newFolderData.folder_name.trim()) {
      await validateFolderName(newFolderData.folder_name, null, setCreateNameError, setIsValidatingCreate, newParentId);
    }
  };

  const handleEditNameChange = async (value) => {
    setEditingFolder(prev => ({...prev, folder_name: value}));

    if (!value.trim()) {
      setEditNameError("");
      return;
    }
    // Debounce this call if performance becomes an issue
    await validateFolderName(value, editingFolder.id, setEditNameError, setIsValidatingEdit, editingFolder.parent_folder_id);
  };

  // NEW: Handle parent folder change for edit dialog
  const handleEditParentChange = async (value) => {
    const newParentId = value === 'none' ? null : value;
    setEditingFolder(prev => ({ ...prev, parent_folder_id: newParentId }));
    // Re-validate folder name with new parent context
    if (editingFolder?.folder_name.trim()) {
      await validateFolderName(editingFolder.folder_name, editingFolder.id, setEditNameError, setIsValidatingEdit, newParentId);
    }
  };


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
      setCreateNameError(""); // NEW: Clear error on success
    }
  });

  // Update folder mutation
  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.Folder.update(id, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      setShowEditDialog(false);
      setEditingFolder(null);
      setEditNameError(""); // NEW: Clear error on success
      alert('✅ Folder updated successfully!');
    }
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId) => {
      return base44.entities.Folder.delete(folderId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['folders'] });
      await queryClient.invalidateQueries({ queryKey: ['folder-content'] });
      setShowDeleteDialog(false);
      setDeletingFolder(null);

      // If deleted folder was selected, clear selection
      if (selectedFolderId === deletingFolder?.id) {
        onSelectFolder(null);
      }

      alert('✅ Folder deleted successfully!');
    },
    onError: (error) => {
      alert(`Error deleting folder: ${error.message}`);
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

  const handleCreateFolder = async () => {
    if (!newFolderData.folder_name.trim()) {
      setCreateNameError('Please enter a folder name'); // NEW: Set error if empty
      return;
    }

    // Validate before creating
    const isValid = await validateFolderName(
      newFolderData.folder_name,
      null,
      setCreateNameError,
      setIsValidatingCreate,
      newFolderData.parent_folder_id
    );

    if (!isValid) {
      return;
    }

    createFolderMutation.mutate(newFolderData);
  };

  const handleEditFolder = (folder) => {
    setEditingFolder({
      id: folder.id,
      folder_name: folder.folder_name,
      description: folder.description || '',
      icon: folder.icon || '📁',
      parent_folder_id: folder.parent_folder_id
    });
    setEditNameError(""); // NEW: Clear error when opening edit dialog
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFolder.folder_name.trim()) {
      setEditNameError('Please enter a folder name'); // NEW: Set error if empty
      return;
    }

    // Validate before saving
    const isValid = await validateFolderName(
      editingFolder.folder_name,
      editingFolder.id,
      setEditNameError,
      setIsValidatingEdit,
      editingFolder.parent_folder_id
    );

    if (!isValid) {
      return;
    }

    const { id, ...updateData } = editingFolder;
    updateFolderMutation.mutate({ id, data: updateData });
  };

  const handleDeleteFolder = (folder) => {
    setDeletingFolder(folder);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deletingFolder) {
      deleteFolderMutation.mutate(deletingFolder.id);
    }
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
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all group",
            isSelected
              ? "bg-blue-100 text-blue-900 font-medium"
              : "hover:bg-slate-100 text-slate-700",
            level > 0 && "ml-4"
          )}
        >
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer"
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
          </div>

          {!folder.is_system_folder && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditFolder(folder)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Folder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteFolder(folder)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
            onClick={() => {
              setShowCreateDialog(true);
              // NEW: Reset states when opening create dialog
              setNewFolderData({
                folder_name: '',
                parent_folder_id: null,
                purpose: purpose,
                description: '',
                icon: '📁'
              });
              setCreateNameError("");
              setIsValidatingCreate(false);
            }}
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
              onClick={() => {
                setShowCreateDialog(true);
                // NEW: Reset states when opening create dialog
                setNewFolderData({
                  folder_name: '',
                  parent_folder_id: null,
                  purpose: purpose,
                  description: '',
                  icon: '📁'
                });
                setCreateNameError("");
                setIsValidatingCreate(false);
              }}
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
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setCreateNameError(""); // NEW: Clear error on close
          setIsValidatingCreate(false); // NEW: Clear validating state on close
        }
      }}>
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
                onChange={(e) => handleCreateNameChange(e.target.value)} // NEW: Use handler for validation
                placeholder="e.g., Technical Approaches"
                className={cn(
                  createNameError && "border-red-500 focus-visible:ring-red-500"
                )}
              />
              {isValidatingCreate && ( // NEW: Validation feedback
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                  Checking availability...
                </p>
              )}
              {createNameError && ( // NEW: Error message
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {createNameError}
                </p>
              )}
              {!createNameError && newFolderData.folder_name.trim().length >= 3 && !isValidatingCreate && ( // NEW: Success message
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Name is available
                </p>
              )}
              <p className="text-xs text-slate-500">
                Must be 3-100 characters, unique at this level, and avoid: {FORBIDDEN_CHARS_LIST}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_folder">Parent Folder (Optional)</Label>
              <Select
                value={newFolderData.parent_folder_id || 'none'}
                onValueChange={handleCreateParentChange} // NEW: Use handler for validation
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top level)</SelectItem>
                  {folders.filter(f => f.purpose === purpose).map(f => ( // Only show folders for the same purpose
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
              onClick={() => {
                setShowCreateDialog(false);
                setCreateNameError(""); // NEW: Clear error on cancel
                setIsValidatingCreate(false); // NEW: Clear validating state on cancel
              }}
              disabled={createFolderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={
                createFolderMutation.isPending ||
                !newFolderData.folder_name.trim() ||
                !!createNameError || // NEW: Disable if there's a validation error
                isValidatingCreate // NEW: Disable if currently validating
              }
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

      {/* Edit Folder Dialog */}
      <Dialog open={showEdit} onOpenChange={(open) => { // Changed to showEdit
        setShowEdit(open); // Changed to showEdit
        if (!open) {
          setEditingFolder(null);
          setEditNameError(""); // NEW: Clear error on close
          setIsValidatingEdit(false); // NEW: Clear validating state on close
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderEdit className="w-5 h-5 text-blue-600" />
              Edit Folder
            </DialogTitle>
            <DialogDescription>
              Update folder details
            </DialogDescription>
          </DialogHeader>

          {editingFolder && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_folder_name">Folder Name *</Label>
                <Input
                  id="edit_folder_name"
                  value={editingFolder.folder_name}
                  onChange={(e) => handleEditNameChange(e.target.value)} // NEW: Use handler for validation
                  placeholder="e.g., Technical Approaches"
                  className={cn(
                    editNameError && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {isValidatingEdit && ( // NEW: Validation feedback
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                    Checking availability...
                  </p>
                )}
                {editNameError && ( // NEW: Error message
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {editNameError}
                  </p>
                )}
                {!editNameError && editingFolder.folder_name.trim().length >= 3 && !isValidatingEdit && ( // NEW: Success message
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Name is available
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Must be 3-100 characters, unique at this level, and avoid: {FORBIDDEN_CHARS_LIST}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_parent_folder">Parent Folder</Label>
                <Select
                  value={editingFolder.parent_folder_id || 'none'}
                  onValueChange={handleEditParentChange} // NEW: Use handler for validation
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (top level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top level)</SelectItem>
                    {folders
                      .filter(f => f.id !== editingFolder.id && f.purpose === purpose) // Don't allow selecting self as parent
                      .map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.icon || '📁'} {f.folder_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Input
                  id="edit_description"
                  value={editingFolder.description}
                  onChange={(e) => setEditingFolder({...editingFolder, description: e.target.value})}
                  placeholder="Brief description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_icon">Icon (Emoji)</Label>
                <Input
                  id="edit_icon"
                  value={editingFolder.icon}
                  onChange={(e) => setEditingFolder({...editingFolder, icon: e.target.value})}
                  placeholder="📁"
                  maxLength={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEdit(false); // Changed to showEdit
                setEditingFolder(null);
                setEditNameError(""); // NEW: Clear error on cancel
                setIsValidatingEdit(false); // NEW: Clear validating state on cancel
              }}
              disabled={updateFolderMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={
                updateFolderMutation.isPending ||
                !editingFolder?.folder_name.trim() ||
                !!editNameError || // NEW: Disable if there's a validation error
                isValidatingEdit // NEW: Disable if currently validating
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateFolderMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Saving...
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Folder?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to delete <strong>"{deletingFolder?.folder_name}"</strong>?
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-900 text-sm">
                  ⚠️ <strong>Warning:</strong> This will also delete all content and subfolders inside this folder. This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteFolderMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteFolderMutation.isPending}
            >
              {deleteFolderMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Yes, Delete Folder
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}