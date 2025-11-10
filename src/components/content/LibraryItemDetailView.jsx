
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label"; // Ensure Label is imported if used
import {
  X,
  Edit2,
  Save,
  Trash2,
  Copy,
  Star,
  StarOff,
  FileText,
  Award,
  Users,
  Handshake,
  BookOpen,
  Tag,
  Clock,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const ENTITY_TYPE_CONFIG = {
  'ProposalResource': { 
    icon: FileText, 
    label: 'Resource',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  'PastPerformance': { 
    icon: Award, 
    label: 'Past Performance',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  'KeyPersonnel': { 
    icon: Users, 
    label: 'Key Personnel',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  'TeamingPartner': { 
    icon: Handshake, 
    label: 'Teaming Partner',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  }
};

export default function LibraryItemDetailView({ 
  item,
  isOpen, 
  onClose,
  onItemUpdated 
}) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedTags, setEditedTags] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  React.useEffect(() => {
    if (item && isOpen) {
      setEditedContent(item.boilerplate_content || item.project_description || item.bio_short || '');
      setEditedTags((item.tags || []).join(', '));
      setEditedDescription(item.description || '');
    }
  }, [item, isOpen]);

  // NEW: Fetch usage data - which proposals and clients used this content
  const { data: usageData = { proposals: [], clients: [] } } = useQuery({
    queryKey: ['library-item-usage', item?.id, item?._entityType],
    queryFn: async () => {
      if (!item || !item.linked_proposal_ids || item.linked_proposal_ids.length === 0) {
        return { proposals: [], clients: [] };
      }
      
      // Fetch proposals where this was used
      const allProposals = await base44.entities.Proposal.list();
      const linkedProposals = allProposals.filter(p => 
        item.linked_proposal_ids.includes(p.id)
      );
      
      // Extract unique client IDs from those proposals
      const clientIdsSet = new Set();
      linkedProposals.forEach(p => {
        if (p.shared_with_client_ids) {
          p.shared_with_client_ids.forEach(cid => clientIdsSet.add(cid));
        }
      });
      
      // Fetch client data
      let clients = [];
      if (clientIdsSet.size > 0) {
        const allClients = await base44.entities.Client.list();
        clients = allClients.filter(c => clientIdsSet.has(c.id));
      }
      
      return { proposals: linkedProposals, clients };
    },
    enabled: isOpen && !!item && !!item.linked_proposal_ids && item.linked_proposal_ids.length > 0,
    staleTime: 30000
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data) => {
      const entityName = item._entityType;
      return base44.entities[entityName].update(item.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-content'] });
      setIsEditing(false);
      if (onItemUpdated) onItemUpdated();
      alert('✅ Item updated successfully!');
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.ProposalResource.update(item.id, {
        is_favorite: !item.is_favorite
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-content'] });
      if (onItemUpdated) onItemUpdated();
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      const entityName = item._entityType;
      return base44.entities[entityName].delete(item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-content'] });
      alert('✅ Item deleted successfully!');
      onClose();
    }
  });

  const handleSave = () => {
    const tagsArray = editedTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    const updateData = {
      description: editedDescription
    };

    // Only update fields that exist on this entity type
    if (item._entityType === 'ProposalResource' && item.boilerplate_content !== undefined) { // Check for undefined to ensure field exists
      updateData.boilerplate_content = editedContent;
      updateData.word_count = editedContent.split(/\s+/).length;
    }

    if (['ProposalResource', 'PastPerformance', 'TeamingPartner', 'KeyPersonnel'].includes(item._entityType)) {
      updateData.tags = tagsArray;
    }

    updateItemMutation.mutate(updateData);
  };

  const handleCopyContent = () => {
    const textContent = (editedContent || '').replace(/<[^>]*>/g, '');
    navigator.clipboard.writeText(textContent);
    alert('✓ Content copied to clipboard');
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item from the library?')) {
      deleteItemMutation.mutate();
    }
  };

  if (!item) return null;

  const config = ENTITY_TYPE_CONFIG[item._entityType] || {};
  const Icon = config.icon || FileText;
  const itemTitle = item.title || item.project_name || item.full_name || item.partner_name || 'Untitled';
  const canEdit = item._entityType === 'ProposalResource' && item.resource_type === 'boilerplate_text';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", config.bgColor)}>
                <Icon className={cn("w-6 h-6", config.color)} />
              </div>
              <div>
                <DialogTitle className="text-xl">{itemTitle}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{config.label}</Badge>
                  {item.content_category && (
                    <Badge variant="secondary" className="capitalize">
                      {item.content_category.replace('_', ' ')}
                    </Badge>
                  )}
                </DialogDescription>
              </div>
            </div>

            <div className="flex gap-2">
              {item._entityType === 'ProposalResource' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFavoriteMutation.mutate()}
                  disabled={toggleFavoriteMutation.isPending}
                >
                  {item.is_favorite ? (
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  ) : (
                    <StarOff className="w-5 h-5 text-slate-400" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 py-4"> {/* Removed overflow-y-auto from here */}
          {/* Metadata */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-none bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Word Count</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {item.word_count || 0}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Times Used</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {item.usage_count || 0}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Last Used</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.last_used_date 
                        ? new Date(item.last_used_date).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <div>
            <Label className="mb-2 block text-sm font-semibold">Description</Label>
            {isEditing ? (
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={2}
                placeholder="Add a description..."
              />
            ) : (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                {item.description || 'No description'}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label className="mb-2 block text-sm font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </Label>
            {isEditing ? (
              <Input
                value={editedTags}
                onChange={(e) => setEditedTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {item.tags && item.tags.length > 0 ? (
                  item.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">No tags</span>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          {canEdit && (
            <div>
              <Label className="mb-2 block text-sm font-semibold">Content</Label>
              {isEditing ? (
                <ReactQuill
                  value={editedContent}
                  onChange={setEditedContent}
                  className="bg-white min-h-64"
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      ['link'],
                      ['clean']
                    ]
                  }}
                />
              ) : (
                <div className="border rounded-lg p-6 bg-white prose prose-sm max-w-none max-h-96 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: editedContent }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* NEW: Usage Information Section */}
        {item && item.usage_count > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Usage Statistics
            </h4>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-900">{item.usage_count || 0}</div>
                <div className="text-xs text-blue-700">Times Used</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-900">{usageData.proposals.length}</div>
                <div className="text-xs text-purple-700">Proposals</div>
              </div>
              <div className="bg-pink-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-pink-900">{usageData.clients.length}</div>
                <div className="text-xs text-pink-700">Clients</div>
              </div>
            </div>

            {/* Client List */}
            {usageData.clients.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-slate-700 mb-2">Shared with Clients:</h5>
                <div className="flex flex-wrap gap-2">
                  {usageData.clients.map(client => (
                    <Badge key={client.id} className="bg-purple-100 text-purple-700">
                      {client.client_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Proposal List */}
            {usageData.proposals.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-slate-700 mb-2">Used in Proposals:</h5>
                <div className="space-y-2">
                  {usageData.proposals.slice(0, 5).map(proposal => (
                    <div key={proposal.id} className="text-sm text-slate-600 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {proposal.proposal_name}
                    </div>
                  ))}
                  {usageData.proposals.length > 5 && (
                    <div className="text-xs text-slate-500">
                      +{usageData.proposals.length - 5} more proposals
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {canEdit && !isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleCopyContent}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>

          {isEditing && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(item.boilerplate_content || item.project_description || item.bio_short || '');
                  setEditedTags((item.tags || []).join(', '));
                  setEditedDescription(item.description || '');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateItemMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateItemMutation.isPending ? (
                  <>
                    <div className="animate-spin mr-2">⏳</div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
