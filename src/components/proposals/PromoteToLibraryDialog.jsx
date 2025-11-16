import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Library,
  FolderOpen,
  Tag,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  AlertCircle,
  Check
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { validateResourceTitle } from "@/components/utils/boardNameValidation";

export default function PromoteToLibraryDialog({ 
  isOpen, 
  onClose, 
  sectionContent, 
  sectionName,
  organization 
}) {
  const queryClient = useQueryClient();
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [formData, setFormData] = useState({
    title: sectionName || '',
    description: '',
    folder_id: null,
    tags: '',
    content_category: 'general'
  });

  const [titleError, setTitleError] = useState("");
  const [isValidatingTitle, setIsValidatingTitle] = useState(false);

  const { data: folders = [] } = useQuery({
    queryKey: ['folders-content-library', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Folder.filter({
        organization_id: organization.id,
        purpose: 'content_library'
      }, 'folder_name');
    },
    enabled: !!organization?.id && isOpen,
  });

  const createResourceMutation = useMutation({
    mutationFn: async (data) => {
      const tagsArray = data.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      return base44.entities.ProposalResource.create({
        organization_id: organization.id,
        folder_id: data.folder_id,
        resource_type: 'boilerplate_text',
        content_category: data.content_category,
        title: data.title,
        description: data.description,
        boilerplate_content: sectionContent,
        tags: tagsArray,
        word_count: sectionContent?.split(/\s+/).length || 0,
        usage_count: 0
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['folder-content'] });
      alert('✅ Content successfully promoted to library!');
      onClose();
      setFormData({
        title: '',
        description: '',
        folder_id: null,
        tags: '',
        content_category: 'general'
      });
      setTitleError("");
    },
    onError: (error) => {
      alert(`Error promoting content: ${error.message}`);
    }
  });

  const handleTitleChange = async (value) => {
    setFormData({...formData, title: value});
    setTitleError("");

    if (!value.trim() || !organization?.id) {
      return;
    }

    setIsValidatingTitle(true);

    try {
      const validation = await validateResourceTitle(
        value, 
        organization.id, 
        formData.folder_id,
        null
      );

      if (!validation.isValid) {
        setTitleError(validation.message);
      }
    } catch (error) {
      console.error('[PromoteToLibraryDialog] Validation error:', error);
      setTitleError('Validation service error. Please try again.');
    } finally {
      setIsValidatingTitle(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!formData.folder_id) {
      alert('Please select a folder');
      return;
    }

    if (titleError) {
      alert('Please fix title errors before saving');
      return;
    }

    createResourceMutation.mutate(formData);
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const buildFolderTree = (parentId = null) => {
    return folders
      .filter(f => f.parent_folder_id === parentId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  };

  const renderFolderOption = (folder, level = 0) => {
    const hasChildren = folders.some(f => f.parent_folder_id === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = formData.folder_id === folder.id;
    const children = buildFolderTree(folder.id);

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
            isSelected 
              ? "bg-blue-100 text-blue-900 font-medium border-2 border-blue-400" 
              : "hover:bg-slate-100 text-slate-700 border-2 border-transparent",
            level > 0 && "ml-4"
          )}
          onClick={() => setFormData({...formData, folder_id: folder.id})}
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
          
          <span className="text-lg">{folder.icon || '📁'}</span>
          <span className="flex-1 truncate text-sm">{folder.folder_name}</span>
        </div>

        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderFolderOption(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const selectedFolder = folders.find(f => f.id === formData.folder_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="w-5 h-5 text-blue-600" />
            Promote to Content Library
          </DialogTitle>
          <DialogDescription>
            Save this content for reuse in future proposals
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., Standard Technical Approach Introduction"
              className={cn(
                titleError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            {isValidatingTitle && (
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                Checking availability...
              </p>
            )}
            {titleError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {titleError}
              </p>
            )}
            {!titleError && formData.title?.trim().length >= 3 && !isValidatingTitle && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Title is available
              </p>
            )}
            <p className="text-xs text-slate-500">
              Must be 3-200 characters, unique in selected folder, avoid: /\:*?"&lt;&gt;|#%&amp;
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of when to use this content..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Content Category</Label>
            <Select
              value={formData.content_category}
              onValueChange={(value) => setFormData({...formData, content_category: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="company_overview">Company Overview</SelectItem>
                <SelectItem value="past_performance">Past Performance</SelectItem>
                <SelectItem value="technical_approach">Technical Approach</SelectItem>
                <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                <SelectItem value="key_personnel">Key Personnel</SelectItem>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="transition_plan">Transition Plan</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="pricing">Pricing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Folder *</Label>
            <div className="border-2 border-slate-200 rounded-lg p-3 max-h-60 overflow-y-auto">
              {folders.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <FolderIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No folders available</p>
                  <p className="text-xs mt-1">Create folders in the Content Library first</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {buildFolderTree().map(folder => renderFolderOption(folder))}
                </div>
              )}
            </div>
            {selectedFolder && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                <FolderOpen className="w-4 h-4" />
                <span>Selected: <strong>{selectedFolder.folder_name}</strong></span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags (comma-separated)
            </Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              placeholder="e.g., technical, DoD, cloud computing"
            />
            <p className="text-xs text-slate-500">
              Add searchable tags to help find this content later
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-700 mb-2">Content Preview:</p>
            <div className="text-xs text-slate-600 max-h-32 overflow-y-auto line-clamp-6">
              {sectionContent?.substring(0, 300)}...
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Word count: {sectionContent?.split(/\s+/).length || 0}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={createResourceMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createResourceMutation.isPending || 
              !formData.title.trim() || 
              !formData.folder_id ||
              !!titleError ||
              isValidatingTitle
            }
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {createResourceMutation.isPending ? (
              <>
                <div className="animate-spin mr-2">⏳</div>
                Saving...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Save to Library
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}