import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  Library,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WinToPromoteDialog({ 
  isOpen, 
  onClose, 
  proposal, 
  organization 
}) {
  const queryClient = useQueryClient();
  const [selectedSections, setSelectedSections] = useState({});
  const [sectionMetadata, setSectionMetadata] = useState({});
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [isPromoting, setIsPromoting] = useState(false);

  // Fetch proposal sections
  const { data: sections = [], isLoading: isLoadingSections } = useQuery({
    queryKey: ['proposal-sections', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposal.id,
        status: 'approved' // Only get approved/finalized sections
      }, 'order');
      return sections.filter(s => s.content && s.content.length > 300); // Only substantial content
    },
    enabled: !!proposal?.id && isOpen,
  });

  // Fetch folders for content library
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

  // Initialize metadata when sections load
  useEffect(() => {
    if (sections.length > 0) {
      const initialMetadata = {};
      const initialSelection = {};
      
      sections.forEach(section => {
        // Pre-select high-value sections
        const isHighValue = ['executive_summary', 'technical_approach', 'management_plan'].includes(section.section_type);
        initialSelection[section.id] = isHighValue;
        
        initialMetadata[section.id] = {
          title: section.section_name || 'Untitled Section',
          folder_id: null,
          category: mapSectionTypeToCategory(section.section_type),
          tags: ''
        };
      });
      
      setSelectedSections(initialSelection);
      setSectionMetadata(initialMetadata);
    }
  }, [sections]);

  const mapSectionTypeToCategory = (sectionType) => {
    const mapping = {
      'executive_summary': 'general',
      'technical_approach': 'technical_approach',
      'management_plan': 'management',
      'past_performance': 'past_performance',
      'key_personnel': 'key_personnel',
      'quality_assurance': 'quality_assurance',
      'transition_plan': 'transition_plan',
      'pricing': 'pricing'
    };
    return mapping[sectionType] || 'general';
  };

  const toggleSectionSelection = (sectionId) => {
    setSelectedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const updateSectionMetadata = (sectionId, field, value) => {
    setSectionMetadata(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [field]: value
      }
    }));
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

  const renderFolderOption = (folder, sectionId, level = 0) => {
    const hasChildren = folders.some(f => f.parent_folder_id === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = sectionMetadata[sectionId]?.folder_id === folder.id;
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
          onClick={() => updateSectionMetadata(sectionId, 'folder_id', folder.id)}
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
            {children.map(child => renderFolderOption(child, sectionId, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handlePromoteSelected = async () => {
    const selectedIds = Object.keys(selectedSections).filter(id => selectedSections[id]);
    
    if (selectedIds.length === 0) {
      alert('Please select at least one section to promote');
      return;
    }

    // Validate that all selected sections have folders assigned
    const missingFolders = selectedIds.filter(id => !sectionMetadata[id]?.folder_id);
    if (missingFolders.length > 0) {
      alert('Please assign folders to all selected sections');
      return;
    }

    setIsPromoting(true);

    try {
      const promotionPromises = selectedIds.map(async (sectionId) => {
        const section = sections.find(s => s.id === sectionId);
        const metadata = sectionMetadata[sectionId];
        
        const tagsArray = metadata.tags
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0);

        return base44.entities.ProposalResource.create({
          organization_id: organization.id,
          folder_id: metadata.folder_id,
          resource_type: 'boilerplate_text',
          content_category: metadata.category,
          title: metadata.title,
          description: `From winning proposal: ${proposal.proposal_name}`,
          boilerplate_content: section.content,
          tags: tagsArray,
          word_count: section.word_count || section.content?.split(/\s+/).length || 0,
          usage_count: 0,
          linked_proposal_ids: [proposal.id]
        });
      });

      await Promise.all(promotionPromises);

      await queryClient.invalidateQueries({ queryKey: ['folder-content'] });
      
      alert(`✅ Successfully promoted ${selectedIds.length} section${selectedIds.length !== 1 ? 's' : ''} to Content Library!`);
      onClose();
    } catch (error) {
      console.error('Error promoting sections:', error);
      alert('Error promoting content: ' + error.message);
    } finally {
      setIsPromoting(false);
    }
  };

  const selectedCount = Object.values(selectedSections).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600" />
            Promote Winning Content to Library
          </DialogTitle>
          <DialogDescription>
            🎉 Congratulations on your win! Select sections to add to your Content Library for future reuse.
          </DialogDescription>
        </DialogHeader>

        {isLoadingSections ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-600">Loading winning content...</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-12">
            <Library className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600">No approved sections found to promote.</p>
            <p className="text-sm text-slate-500 mt-2">Sections need to be marked as "approved" to appear here.</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Summary */}
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{proposal?.proposal_name}</h3>
                    <p className="text-sm text-slate-600">
                      {sections.length} section{sections.length !== 1 ? 's' : ''} available • {selectedCount} selected
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sections List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {sections.map(section => {
                const isSelected = selectedSections[section.id];
                const metadata = sectionMetadata[section.id] || {};
                const selectedFolder = folders.find(f => f.id === metadata.folder_id);

                return (
                  <Card 
                    key={section.id}
                    className={cn(
                      "border-2 transition-all",
                      isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSectionSelection(section.id)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 space-y-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900">{section.section_name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {section.word_count || section.content?.split(/\s+/).length || 0} words
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {section.content?.substring(0, 200)}...
                            </p>
                          </div>

                          {isSelected && (
                            <div className="space-y-3 bg-white rounded-lg p-3 border border-slate-200">
                              <div className="space-y-2">
                                <Label htmlFor={`title-${section.id}`} className="text-xs">Title *</Label>
                                <Input
                                  id={`title-${section.id}`}
                                  value={metadata.title}
                                  onChange={(e) => updateSectionMetadata(section.id, 'title', e.target.value)}
                                  placeholder="e.g., Standard Technical Approach"
                                  className="text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs">Folder * (Click to select)</Label>
                                <div className="border-2 border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto">
                                  {folders.length === 0 ? (
                                    <div className="text-center py-4 text-slate-500 text-xs">
                                      No folders available
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {buildFolderTree().map(folder => renderFolderOption(folder, section.id))}
                                    </div>
                                  )}
                                </div>
                                {selectedFolder && (
                                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Selected: <strong>{selectedFolder.folder_name}</strong></span>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label htmlFor={`category-${section.id}`} className="text-xs">Category</Label>
                                  <Select
                                    value={metadata.category}
                                    onValueChange={(value) => updateSectionMetadata(section.id, 'category', value)}
                                  >
                                    <SelectTrigger className="text-sm">
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
                                  <Label htmlFor={`tags-${section.id}`} className="text-xs flex items-center gap-1">
                                    <Tag className="w-3 h-3" />
                                    Tags (comma-separated)
                                  </Label>
                                  <Input
                                    id={`tags-${section.id}`}
                                    value={metadata.tags}
                                    onChange={(e) => updateSectionMetadata(section.id, 'tags', e.target.value)}
                                    placeholder="e.g., DoD, cloud, security"
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">💡 Pro Tip</p>
                  <p className="text-xs">Selected sections will be saved to your Content Library for easy reuse in future proposals. You can edit or update them anytime from the Content Library page.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isPromoting}
          >
            {selectedCount > 0 ? 'Skip for Now' : 'Close'}
          </Button>
          
          {sections.length > 0 && (
            <Button
              onClick={handlePromoteSelected}
              disabled={isPromoting || selectedCount === 0}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isPromoting ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Promoting...
                </>
              ) : (
                <>
                  <Library className="w-4 h-4 mr-2" />
                  Promote {selectedCount > 0 ? `${selectedCount} Section${selectedCount !== 1 ? 's' : ''}` : 'Selected'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}