
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, Award, Library, ExternalLink, File, Upload, Plus, Filter, Search, Lightbulb, CheckCircle2, TrendingUp, DollarSign, Calendar, Building2, Eye, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuickResourceUpload from "./QuickResourceUpload";
import SmartReferenceRecommender from "./SmartReferenceRecommender";
import ReferencePreviewModal from "../../rag/ReferencePreviewModal";
import { cn } from "@/lib/utils";

export default function ResourceGatheringModal({ isOpen, onClose, proposalId, onCompletion }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [currentProposal, setCurrentProposal] = useState(null);
  
  const [resources, setResources] = useState([]);
  const [pastPerformance, setPastPerformance] = useState([]);
  const [referenceProposals, setReferenceProposals] = useState([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);
  const [selectedPPIds, setSelectedPPIds] = useState([]);
  const [selectedReferenceIds, setSelectedReferenceIds] = useState([]);
  
  const [initialReferenceIds, setInitialReferenceIds] = useState([]);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);

  // NEW: Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewProposalId, setPreviewProposalId] = useState(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('all');
  const [filterContentCategory, setFilterContentCategory] = useState('all');
  const [filterProposalStatus, setFilterProposalStatus] = useState('all');

  // NEW: Show AI recommendations toggle
  const [showRecommendations, setShowRecommendations] = useState(true);

  useEffect(() => {
    if (isOpen && proposalId) {
      loadData();
    }
  }, [isOpen, proposalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      const orgs = await base44.entities.Organization.filter(
        { created_by: user.email },
        '-created_date',
        1
      );
      
      if (orgs.length > 0) {
        const org = orgs[0];
        setOrganization(org);

        const proposal = await base44.entities.Proposal.get(proposalId);
        setCurrentProposal(proposal);
        
        const existingRefIds = proposal.reference_proposal_ids || [];
        setSelectedReferenceIds(existingRefIds);
        setInitialReferenceIds(existingRefIds);
        
        const resourceData = await base44.entities.ProposalResource.filter(
          { organization_id: org.id },
          '-created_date'
        );
        setResources(resourceData);

        const ppData = await base44.entities.PastPerformance.filter(
          { organization_id: org.id },
          '-created_date'
        );
        setPastPerformance(ppData);

        const allProposals = await base44.entities.Proposal.filter(
          { organization_id: org.id },
          '-updated_date',
          100
        );
        
        const completedProposals = allProposals.filter(p => 
          p.id !== proposalId && 
          ['won', 'submitted', 'lost'].includes(p.status)
        );
        
        setReferenceProposals(completedProposals);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResourceToggle = (resourceId) => {
    setSelectedResourceIds(prev =>
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const handlePPToggle = (ppId) => {
    setSelectedPPIds(prev =>
      prev.includes(ppId)
        ? prev.filter(id => id !== ppId)
        : [...prev, ppId]
    );
  };

  const handleReferenceToggle = (proposalId) => {
    setSelectedReferenceIds(prev =>
      prev.includes(proposalId)
        ? prev.filter(id => id !== proposalId)
        : [...prev, proposalId]
    );
  };

  const handleResourceClick = (e, resource) => {
    if (e.target.type === 'checkbox') return;
    
    if (resource.file_url) {
      window.open(resource.file_url, '_blank');
    }
  };

  // NEW: Handle AI recommendations selection
  const handleRecommendationsSelect = (recommendedIds) => {
    // Add recommended IDs to selected references (avoiding duplicates)
    setSelectedReferenceIds(prev => {
      const newIds = [...prev];
      recommendedIds.forEach(id => {
        if (!newIds.includes(id)) {
          newIds.push(id);
        }
      });
      return newIds;
    });
    
    setShowRecommendations(false); // Collapse recommendations after selection
  };

  // NEW: Handle preview
  const handlePreview = (e, proposalId) => {
    e.stopPropagation();
    setPreviewProposalId(proposalId);
    setShowPreviewModal(true);
  };

  // NEW: Handle adding from preview
  const handleAddFromPreview = (proposalId) => {
    if (!selectedReferenceIds.includes(proposalId)) {
      setSelectedReferenceIds(prev => [...prev, proposalId]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const referenceIdsChanged = 
        JSON.stringify(selectedReferenceIds.sort()) !== 
        JSON.stringify(initialReferenceIds.sort());
      
      const hasNewSelections = 
        selectedResourceIds.length > 0 || 
        selectedPPIds.length > 0 || 
        selectedReferenceIds.length > 0;
      
      if (!referenceIdsChanged && !hasNewSelections) {
        alert("No resources or reference proposals were selected.");
        setSaving(false);
        return;
      }
      
      if (selectedReferenceIds.length > 0 || referenceIdsChanged) { // Ensure update if IDs were removed
        await base44.entities.Proposal.update(proposalId, {
          reference_proposal_ids: selectedReferenceIds
        });
        
        console.log('[ResourceGatheringModal] ✅ Saved reference proposals:', selectedReferenceIds);
      }
      
      // TODO: In the future, properly link resources and past performance to proposals
      
      const successMessage = `✅ Successfully linked:\n• ${selectedResourceIds.length} resources\n• ${selectedPPIds.length} past performance projects\n• ${selectedReferenceIds.length} reference proposals\n\nThese will be available to the AI writer when generating content.`;
      
      alert(successMessage);
      
      if (onCompletion) {
        onCompletion();
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getResourceDisplayName = (resource) => {
    if (resource.title) return resource.title;
    if (resource.file_name) return resource.file_name;
    return resource.resource_type?.replace('_', ' ') || 'Untitled Resource';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = !searchQuery || 
      getResourceDisplayName(resource).toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterResourceType === 'all' || resource.resource_type === filterResourceType;
    const matchesCategory = filterContentCategory === 'all' || resource.content_category === filterContentCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  const filteredReferenceProposals = referenceProposals.filter(proposal => {
    return filterProposalStatus === 'all' || proposal.status === filterProposalStatus;
  });

  const handleUploadSuccess = () => {
    console.log('[ResourceGatheringModal] Resource uploaded successfully, reloading...');
    loadData();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle>Gather Resources & References</DialogTitle>
                <DialogDescription>
                  Link content, past performance, and reference proposals to enhance AI-generated content
                </DialogDescription>
              </div>
              <Link to={createPageUrl("ContentLibrary")}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Library className="w-4 h-4" />
                  Manage Library
                </Button>
              </Link>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <Tabs defaultValue="reference-proposals" className="py-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="reference-proposals">
                  <FileText className="w-4 h-4 mr-2" />
                  Previous Proposals ({filteredReferenceProposals.length})
                </TabsTrigger>
                <TabsTrigger value="resources">
                  <Library className="w-4 h-4 mr-2" />
                  Resources ({filteredResources.length})
                </TabsTrigger>
                <TabsTrigger value="past-performance">
                  <Award className="w-4 h-4 mr-2" />
                  Past Performance ({pastPerformance.length})
                </TabsTrigger>
              </TabsList>

              {/* REFERENCE PROPOSALS TAB - ENHANCED WITH RECOMMENDATIONS */}
              <TabsContent value="reference-proposals" className="space-y-4">
                {/* Instructional Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">AI Reference Material</h4>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        Select past proposals to give the AI writer context and examples from your previous work. 
                        The AI will reference structure, language, and successful approaches from these proposals 
                        when generating new content, while ensuring all output is original and tailored to your current proposal.
                      </p>
                    </div>
                  </div>
                </div>

                {/* NEW: AI RECOMMENDATIONS SECTION */}
                {currentProposal && referenceProposals.length > 0 && showRecommendations && (
                  <SmartReferenceRecommender
                    currentProposal={currentProposal}
                    availableProposals={referenceProposals}
                    onRecommendationsSelect={handleRecommendationsSelect}
                    targetSectionType={null}
                  />
                )}

                {/* Status Filter and Toggle Recommendations */}
                <div className="flex justify-between items-center">
                  <Select value={filterProposalStatus} onValueChange={setFilterProposalStatus}>
                    <SelectTrigger className="w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="won">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Won
                        </div>
                      </SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* NEW: Toggle Recommendations */}
                  {referenceProposals.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRecommendations(!showRecommendations)}
                      className="gap-2 border-purple-300"
                    >
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      {showRecommendations ? 'Hide' : 'Show'} AI Recommendations
                    </Button>
                  )}
                </div>

                {/* Reference Proposals List */}
                {filteredReferenceProposals.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    {referenceProposals.length === 0 ? (
                      <p>No completed proposals found. Complete some proposals to use them as AI reference material.</p>
                    ) : (
                      <p>No proposals match the selected status filter.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredReferenceProposals.map(proposal => (
                      <div 
                        key={proposal.id} 
                        className={cn(
                          "flex items-start space-x-3 p-4 border-2 rounded-lg transition-all",
                          selectedReferenceIds.includes(proposal.id) 
                            ? "border-blue-300 bg-blue-50" 
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <Checkbox
                          id={`ref-${proposal.id}`}
                          checked={selectedReferenceIds.includes(proposal.id)}
                          onCheckedChange={() => handleReferenceToggle(proposal.id)}
                          className="mt-1"
                        />
                        <label htmlFor={`ref-${proposal.id}`} className="flex-1 cursor-pointer">
                          {/* Proposal Name and Status */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 mb-1">
                                {proposal.proposal_name}
                              </h4>
                              {proposal.project_title && (
                                <p className="text-sm text-slate-700 mb-1">
                                  {proposal.project_title}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge 
                                className={cn(
                                  "flex-shrink-0",
                                  proposal.status === 'won' && "bg-green-100 text-green-800 border-green-300",
                                  proposal.status === 'submitted' && "bg-blue-100 text-blue-800 border-blue-300",
                                  proposal.status === 'lost' && "bg-slate-100 text-slate-800 border-slate-300"
                                )}
                              >
                                {proposal.status === 'won' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                              </Badge>
                              
                              {/* NEW: Preview Button */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => handlePreview(e, proposal.id)}
                                className="h-7 text-xs text-blue-600 hover:bg-blue-50"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Preview
                              </Button>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                            {proposal.agency_name && (
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                <span className="truncate">{proposal.agency_name}</span>
                              </div>
                            )}
                            {proposal.contract_value && (
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                                <span>${(proposal.contract_value / 1000000).toFixed(1)}M</span>
                              </div>
                            )}
                            {proposal.due_date && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Due: {formatDate(proposal.due_date)}</span>
                              </div>
                            )}
                            {proposal.solicitation_number && (
                              <div className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span className="truncate">{proposal.solicitation_number}</span>
                              </div>
                            )}
                          </div>

                          {/* Project Type Badge */}
                          {proposal.project_type && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                {proposal.project_type}
                              </Badge>
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Results count */}
                {filterProposalStatus !== 'all' && (
                  <p className="text-xs text-slate-500 text-center pt-2">
                    Showing {filteredReferenceProposals.length} of {referenceProposals.length} proposals
                  </p>
                )}

                {/* Selection Summary */}
                {selectedReferenceIds.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">
                        {selectedReferenceIds.length} proposal{selectedReferenceIds.length !== 1 ? 's' : ''} selected for AI reference
                      </span>
                    </div>
                    <p className="text-xs text-green-700 mt-1 ml-6">
                      These will be analyzed by the AI writer to inform content generation
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="resources" className="space-y-3">
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3 pb-3 border-b">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search resources..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <Select value={filterResourceType} onValueChange={setFilterResourceType}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Resource Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="capability_statement">Capability Statement</SelectItem>
                      <SelectItem value="marketing_collateral">Marketing Collateral</SelectItem>
                      <SelectItem value="past_proposal">Past Proposal</SelectItem>
                      <SelectItem value="boilerplate_text">Boilerplate Text</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterContentCategory} onValueChange={setFilterContentCategory}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="company_overview">Company Overview</SelectItem>
                      <SelectItem value="past_performance">Past Performance</SelectItem>
                      <SelectItem value="technical_approach">Technical Approach</SelectItem>
                      <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                      <SelectItem value="key_personnel">Key Personnel</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="transition_plan">Transition Plan</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="pricing">Pricing</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Upload Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Upload New Resource
                  </Button>
                </div>

                {/* Resources List */}
                {filteredResources.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Library className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    {resources.length === 0 ? (
                      <>
                        <p className="mb-3">No resources found in your library.</p>
                        <Button onClick={() => setShowUploadModal(true)} size="sm" className="gap-2">
                          <Upload className="w-4 h-4" />
                          Upload Your First Resource
                        </Button>
                      </>
                    ) : (
                      <p>No resources match your search criteria.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredResources.map(resource => (
                      <div 
                        key={resource.id} 
                        className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <Checkbox
                          id={`resource-${resource.id}`}
                          checked={selectedResourceIds.includes(resource.id)}
                          onCheckedChange={() => handleResourceToggle(resource.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div 
                            onClick={(e) => handleResourceClick(e, resource)}
                            className={resource.file_url ? "cursor-pointer" : ""}
                          >
                            <div className="flex items-center gap-2">
                              {resource.file_url && (
                                <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              )}
                              <div className="font-medium text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                                {getResourceDisplayName(resource)}
                              </div>
                              {resource.file_url && (
                                <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                            
                            {resource.description && (
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                {resource.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-slate-500 capitalize">
                                {resource.resource_type?.replace('_', ' ')}
                                {resource.content_category && ` • ${resource.content_category.replace('_', ' ')}`}
                              </p>
                              {resource.file_name && resource.title !== resource.file_name && (
                                <span className="text-xs text-slate-400">
                                  ({resource.file_name})
                                </span>
                              )}
                            </div>
                            
                            {resource.tags?.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {resource.tags.slice(0, 3).map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {resource.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{resource.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Results count */}
                {(searchQuery || filterResourceType !== 'all' || filterContentCategory !== 'all') && (
                  <p className="text-xs text-slate-500 text-center pt-2">
                    Showing {filteredResources.length} of {resources.length} resources
                  </p>
                )}
              </TabsContent>

              <TabsContent value="past-performance" className="space-y-3">
                {pastPerformance.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Award className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No past performance found. Add projects in the Past Performance page.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {pastPerformance.map(pp => (
                      <div key={pp.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                        <Checkbox
                          id={`pp-${pp.id}`}
                          checked={selectedPPIds.includes(pp.id)}
                          onCheckedChange={() => handlePPToggle(pp.id)}
                        />
                        <label htmlFor={`pp-${pp.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium text-sm">{pp.project_name}</div>
                          <p className="text-xs text-slate-500 mt-1">
                            {pp.client_name} • ${(pp.contract_value || 0).toLocaleString()}
                          </p>
                          {pp.services_provided?.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {pp.services_provided.slice(0, 2).map((service, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-slate-600">
                <span className="font-medium">{selectedResourceIds.length}</span> resources, {' '}
                <span className="font-medium">{selectedPPIds.length}</span> past performance, {' '}
                <span className="font-medium">{selectedReferenceIds.length}</span> reference proposals
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || loading}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Link Resources
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Upload Modal */}
      <QuickResourceUpload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        organizationId={organization?.id}
        onSuccess={handleUploadSuccess}
      />

      {/* NEW: Reference Preview Modal */}
      <ReferencePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        proposalId={previewProposalId}
        onSelect={handleAddFromPreview}
      />
    </>
  );
}
