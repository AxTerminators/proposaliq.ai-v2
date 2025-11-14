
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
import {
  Loader2, FileText, Award, Library, ExternalLink, File, Upload, Plus, Filter, Search, Lightbulb,
  CheckCircle2, TrendingUp, DollarSign, Calendar, Building2, Database, XCircle, Eye, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import QuickResourceUpload from "./QuickResourceUpload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SmartReferenceDiscovery from "../content/SmartReferenceDiscovery";

export default function ResourceGatheringModal({ isOpen, onClose, proposalId, organizationId, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null); // Keep for QuickResourceUpload and fallback org fetch
  const [currentProposal, setCurrentProposal] = useState(null);

  const [resources, setResources] = useState([]);
  const [pastPerformance, setPastPerformance] = useState([]);
  const [allProposals, setAllProposals] = useState([]); // Renamed from referenceProposals
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);
  const [selectedPPIds, setSelectedPPIds] = useState([]);
  const [selectedReferenceProposals, setSelectedReferenceProposals] = useState([]); // Renamed from selectedReferenceIds

  // Track initial state to detect changes
  const [initialSelectedReferenceProposals, setInitialSelectedReferenceProposals] = useState([]); // Renamed from initialReferenceIds

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResourceType, setFilterResourceType] = useState('all');
  const [filterContentCategory, setFilterContentCategory] = useState('all');
  // filterProposalStatus is removed for the reference proposals tab in favor of general search
  // const [filterProposalStatus, setFilterProposalStatus] = useState('all');

  // Smart Discovery state
  const [showSmartDiscovery, setShowSmartDiscovery] = useState(true);

  useEffect(() => {
    if (isOpen && proposalId) {
      loadData();
    }
  }, [isOpen, proposalId, organizationId]); // Add organizationId to dependencies

  const loadData = async () => {
    try {
      setLoading(true);
      let currentOrgId = organizationId;
      let fetchedOrganization = null;

      if (!currentOrgId) {
        // If organizationId prop is not provided, fetch user's organization
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          fetchedOrganization = orgs[0];
          currentOrgId = fetchedOrganization.id;
          setOrganization(fetchedOrganization);
        }
      } else {
        // If organizationId prop is provided, set a minimal org object for state if full object isn't needed
        setOrganization({ id: organizationId });
      }

      if (!currentOrgId) {
        console.error("No organization ID available.");
        toast.error("No organization found to load data.");
        setLoading(false);
        return;
      }

      // Load current proposal
      const proposal = await base44.entities.Proposal.get(proposalId);
      setCurrentProposal(proposal);

      // Pre-select any existing reference proposals
      const existingRefIds = proposal.reference_proposal_ids || [];
      setSelectedReferenceProposals(existingRefIds);
      setInitialSelectedReferenceProposals(existingRefIds);

      // Load resources
      const resourceData = await base44.entities.ProposalResource.filter(
        { organization_id: currentOrgId },
        '-created_date'
      );
      setResources(resourceData);

      // Load past performance
      const ppData = await base44.entities.PastPerformance.filter(
        { organization_id: currentOrgId },
        '-created_date'
      );
      setPastPerformance(ppData);

      // Load all proposals (for references, excluding current one)
      const allProposalsData = await base44.entities.Proposal.filter(
        { organization_id: currentOrgId },
        '-updated_date',
        100 // Limit to recent 100 proposals
      );

      // Filter out the current proposal from the list of selectable references
      const relevantProposals = allProposalsData.filter(p => p.id !== proposalId);

      setAllProposals(relevantProposals);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data.");
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

  const toggleReferenceProposal = (propId) => { // Renamed from handleReferenceToggle
    setSelectedReferenceProposals(prev =>
      prev.includes(propId)
        ? prev.filter(id => id !== propId)
        : [...prev, propId]
    );
  };

  const handleResourceClick = (e, resource) => {
    // Only open file if clicking on the title/file name area, not the checkbox
    if (e.target.type === 'checkbox') return;

    if (resource.file_url) {
      window.open(resource.file_url, '_blank');
    }
  };

  const handleAddSmartReference = (proposalIdToAdd) => {
    setSelectedReferenceProposals(prev => {
      if (prev.includes(proposalIdToAdd)) return prev;
      return [...prev, proposalIdToAdd];
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // CRITICAL: Detect if any changes were made
      const referenceIdsChanged =
        JSON.stringify(selectedReferenceProposals.sort()) !==
        JSON.stringify(initialSelectedReferenceProposals.sort());

      const hasNewSelections =
        selectedResourceIds.length > 0 ||
        selectedPPIds.length > 0 ||
        selectedReferenceProposals.length > 0;

      // Only proceed if there are actual changes or selections
      if (!referenceIdsChanged && !hasNewSelections) {
        toast.info("No new resources, past performance, or reference proposals were selected or changed.");
        setSaving(false);
        return;
      }

      // Save reference proposal IDs to the current proposal
      // Always update if any reference proposals are selected, or if they were changed
      if (selectedReferenceProposals.length > 0 || referenceIdsChanged) {
        await base44.entities.Proposal.update(proposalId, {
          reference_proposal_ids: selectedReferenceProposals
        });

        console.log('[ResourceGatheringModal] ✅ Saved reference proposals:', selectedReferenceProposals);
      }

      // TODO: In the future, properly link resources and past performance to proposals

      const successMessage = `✅ Successfully linked:\n• ${selectedResourceIds.length} resources\n• ${selectedPPIds.length} past performance projects\n• ${selectedReferenceProposals.length} reference proposals\n\nThese will be available to the AI writer when generating content.`;

      toast.success(successMessage);

      // Call onComplete to mark checklist item as complete
      if (onComplete) {
        onComplete();
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error saving. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to format resource display name
  const getResourceDisplayName = (resource) => {
    if (resource.title) return resource.title;
    if (resource.file_name) return resource.file_name;
    return resource.resource_type?.replace('_', ' ') || 'Untitled Resource';
  };

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filter resources based on search and filters
  const filteredResources = resources.filter(resource => {
    // Search filter
    const matchesSearch = !searchQuery ||
      getResourceDisplayName(resource).toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    // Resource type filter
    const matchesType = filterResourceType === 'all' || resource.resource_type === filterResourceType;

    // Content category filter
    const matchesCategory = filterContentCategory === 'all' || resource.content_category === filterContentCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  // Filter proposals based on search query for the "Reference Proposals" tab
  const filteredProposals = allProposals.filter(proposal => {
    const searchLower = searchQuery.toLowerCase();
    return (
      proposal.proposal_name?.toLowerCase().includes(searchLower) ||
      proposal.project_title?.toLowerCase().includes(searchLower) ||
      proposal.agency_name?.toLowerCase().includes(searchLower) ||
      proposal.solicitation_number?.toLowerCase().includes(searchLower) ||
      proposal.status?.toLowerCase().includes(searchLower)
    );
  });

  // Handle successful upload - sets flag that new resource was added
  const handleUploadSuccess = () => {
    console.log('[ResourceGatheringModal] Resource uploaded successfully, reloading...');
    loadData(); // Refresh the resources list
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
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
            <Tabs defaultValue="references" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="references" className="gap-2">
                  <Database className="w-4 h-4" />
                  Reference Proposals ({allProposals.length})
                </TabsTrigger>
                <TabsTrigger value="resources" className="gap-2">
                  <Library className="w-4 h-4" />
                  Resources ({filteredResources.length})
                </TabsTrigger>
                <TabsTrigger value="past-performance" className="gap-2">
                  <Award className="w-4 h-4" />
                  Past Performance ({pastPerformance.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="references" className="flex-1 overflow-y-auto space-y-4 mt-4">
                {/* NEW: Smart Discovery Section */}
                {showSmartDiscovery && (
                  <SmartReferenceDiscovery
                    proposalId={proposalId}
                    organizationId={organizationId || organization?.id}
                    currentReferences={selectedReferenceProposals}
                    onAddReference={handleAddSmartReference}
                  />
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold">All Proposals</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Search proposals..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                      />
                      <Search className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {filteredProposals.length === 0 ? (
                    <Card className="border-slate-200">
                      <CardContent className="p-8 text-center">
                        <Database className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-600">No proposals found matching your search.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {filteredProposals.map((proposal) => {
                        const isSelected = selectedReferenceProposals.includes(proposal.id);

                        return (
                          <Card
                            key={proposal.id}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md",
                              isSelected ? 'border-2 border-blue-500 bg-blue-50' : 'border'
                            )}
                            onClick={() => toggleReferenceProposal(proposal.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleReferenceProposal(proposal.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
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
                                    <Badge
                                      className={cn(
                                        "flex-shrink-0",
                                        proposal.status === 'won' && "bg-green-100 text-green-800 border-green-300",
                                        proposal.status === 'submitted' && "bg-blue-100 text-blue-800 border-blue-300",
                                        proposal.status === 'lost' && "bg-slate-100 text-slate-800 border-slate-300",
                                        proposal.status === 'draft' && "bg-yellow-100 text-yellow-800 border-yellow-300",
                                        proposal.status === 'in_progress' && "bg-purple-100 text-purple-800 border-purple-300"
                                      )}
                                    >
                                      {proposal.status === 'won' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                      {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1).replace('_', ' ')}
                                    </Badge>
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
                                        <span>${(proposal.contract_value).toLocaleString()}</span>
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
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Selection Summary */}
                  {selectedReferenceProposals.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-green-800">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-medium">
                          {selectedReferenceProposals.length} proposal{selectedReferenceProposals.length !== 1 ? 's' : ''} selected for AI reference
                        </span>
                      </div>
                      <p className="text-xs text-green-700 mt-1 ml-6">
                        These will be analyzed by the AI writer to inform content generation
                      </p>
                    </div>
                  )}
                </div>
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
                <span className="font-medium">{selectedReferenceProposals.length}</span> reference proposals
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
    </>
  );
}
