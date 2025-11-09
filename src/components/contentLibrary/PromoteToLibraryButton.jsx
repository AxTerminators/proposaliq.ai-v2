import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Library, Sparkles } from "lucide-react";
import { toast } from "sonner";
import FolderSelector from "../folders/FolderSelector";

const CONTENT_CATEGORIES = [
  { value: 'company_overview', label: 'Company Overview' },
  { value: 'past_performance', label: 'Past Performance' },
  { value: 'technical_approach', label: 'Technical Approach' },
  { value: 'quality_assurance', label: 'Quality Assurance' },
  { value: 'key_personnel', label: 'Key Personnel' },
  { value: 'management', label: 'Management' },
  { value: 'transition_plan', label: 'Transition Plan' },
  { value: 'security', label: 'Security' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'general', label: 'General' }
];

export default function PromoteToLibraryButton({ 
  selectedText, 
  organization, 
  sectionType = null,
  onSuccess 
}) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(sectionType || 'general');
  const [tags, setTags] = useState('');
  const [folderId, setFolderId] = useState(null);

  const promoteToLibraryMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ProposalResource.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-resources'] });
      toast.success('Content promoted to library!');
      if (onSuccess) onSuccess();
      handleClose();
    }
  });

  const handlePromote = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);

    await promoteToLibraryMutation.mutateAsync({
      organization_id: organization.id,
      resource_type: 'boilerplate_text',
      content_category: category,
      title,
      description,
      boilerplate_content: selectedText,
      tags: tagsArray,
      folder_id: folderId,
      word_count: selectedText.split(/\s+/).length,
      review_status: 'draft'
    });
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setCategory(sectionType || 'general');
    setTags('');
    setFolderId(null);
    setShowDialog(false);
  };

  if (!selectedText || selectedText.length < 50) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <Library className="w-4 h-4" />
        Promote to Library
        <Sparkles className="w-3 h-3 text-amber-500" />
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="w-5 h-5 text-blue-600" />
              Promote Content to Library
            </DialogTitle>
            <DialogDescription>
              Save this content for reuse in future proposals
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900 mb-2 font-semibold">Selected Content Preview</p>
              <p className="text-sm text-blue-800 line-clamp-3">{selectedText}</p>
              <p className="text-xs text-blue-600 mt-2">
                {selectedText.split(/\s+/).length} words
              </p>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Technical Excellence Boilerplate"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="When to use this content..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Folder</Label>
                <FolderSelector
                  organization={organization}
                  value={folderId}
                  onChange={setFolderId}
                  allowNone={true}
                  filterType="content_library"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., cybersecurity, cloud, federal"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handlePromote}
              disabled={promoteToLibraryMutation.isPending || !title.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {promoteToLibraryMutation.isPending ? 'Promoting...' : 'Promote to Library'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}