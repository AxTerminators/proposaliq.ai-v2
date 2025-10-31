import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Sparkles,
  Search,
  Plus,
  File,
  FileCode,
  FileArchive,
  Loader2,
  Award
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function Phase2({ proposalData, setProposalData, proposalId }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [organization, setOrganization] = useState(null);
  
  // Search states
  const [boilerplateSearch, setBoilerplateSearch] = useState("");
  const [proposalSearch, setProposalSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [pastPerformanceSearch, setPastPerformanceSearch] = useState("");
  
  // Search results visibility
  const [showBoilerplateResults, setShowBoilerplateResults] = useState(false);
  const [showProposalResults, setShowProposalResults] = useState(false);
  const [showTemplateResults, setShowTemplateResults] = useState(false);
  const [showPastPerformanceResults, setShowPastPerformanceResults] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  // Query for boilerplate templates
  const { data: boilerplates = [] } = useQuery({
    queryKey: ['boilerplates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalResource.filter({
        organization_id: organization.id,
        resource_type: 'boilerplate_text'
      }, '-created_date');
    },
    enabled: !!organization?.id,
  });

  // Query for previous proposals
  const { data: previousProposals = [] } = useQuery({
    queryKey: ['previous-proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const proposals = await base44.entities.Proposal.filter({
        organization_id: organization.id
      }, '-created_date');
      // Filter to only show finalized/submitted proposals
      return proposals.filter(p => ['submitted', 'won', 'lost'].includes(p.status));
    },
    enabled: !!organization?.id,
  });

  // Query for proposal templates
  const { data: proposalTemplates = [] } = useQuery({
    queryKey: ['proposal-templates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalResource.filter({
        organization_id: organization.id,
        resource_type: 'template'
      }, '-created_date');
    },
    enabled: !!organization?.id,
  });

  // Query for past performance records
  const { data: pastPerformanceRecords = [] } = useQuery({
    queryKey: ['past-performance', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.PastPerformance.filter({
        organization_id: organization.id
      }, '-start_date');
    },
    enabled: !!organization?.id,
  });

  // Query for linked resources for this proposal
  const { data: linkedResources = [] } = useQuery({
    queryKey: ['linked-resources', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      const allResources = await base44.entities.ProposalResource.filter({
        organization_id: organization.id
      });
      return allResources.filter(r => r.linked_proposal_ids?.includes(proposalId));
    },
    enabled: !!proposalId && !!organization?.id,
  });

  // Query for linked past performance
  const { data: linkedPastPerformance = [] } = useQuery({
    queryKey: ['linked-past-performance', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      const allPastPerf = await base44.entities.PastPerformance.filter({
        organization_id: organization.id
      });
      return allPastPerf.filter(p => p.used_in_proposals?.includes(proposalId));
    },
    enabled: !!proposalId && !!organization?.id,
  });

  // Query for directly uploaded reference documents
  const { data: uploadedDocs = [] } = useQuery({
    queryKey: ['reference-documents', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: organization.id,
        document_type: 'reference'
      }, '-created_date');
    },
    enabled: !!proposalId && !!organization?.id,
  });

  const linkResourceMutation = useMutation({
    mutationFn: async (resourceId) => {
      const resource = await base44.entities.ProposalResource.filter({ id: resourceId });
      if (resource.length === 0) return;
      
      const currentLinkedIds = resource[0].linked_proposal_ids || [];
      if (currentLinkedIds.includes(proposalId)) {
        return; // Already linked
      }
      
      await base44.entities.ProposalResource.update(resourceId, {
        linked_proposal_ids: [...currentLinkedIds, proposalId],
        usage_count: (resource[0].usage_count || 0) + 1,
        last_used_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-resources', proposalId] });
    },
  });

  const linkPastPerformanceMutation = useMutation({
    mutationFn: async (pastPerfId) => {
      const pastPerf = await base44.entities.PastPerformance.filter({ id: pastPerfId });
      if (pastPerf.length === 0) return;
      
      const currentUsedIn = pastPerf[0].used_in_proposals || [];
      if (currentUsedIn.includes(proposalId)) {
        return; // Already linked
      }
      
      await base44.entities.PastPerformance.update(pastPerfId, {
        used_in_proposals: [...currentUsedIn, proposalId],
        usage_count: (pastPerf[0].usage_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-past-performance', proposalId] });
    },
  });

  const unlinkResourceMutation = useMutation({
    mutationFn: async (resourceId) => {
      const resource = await base44.entities.ProposalResource.filter({ id: resourceId });
      if (resource.length === 0) return;
      
      const currentLinkedIds = resource[0].linked_proposal_ids || [];
      await base44.entities.ProposalResource.update(resourceId, {
        linked_proposal_ids: currentLinkedIds.filter(id => id !== proposalId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-resources', proposalId] });
    },
  });

  const unlinkPastPerformanceMutation = useMutation({
    mutationFn: async (pastPerfId) => {
      const pastPerf = await base44.entities.PastPerformance.filter({ id: pastPerfId });
      if (pastPerf.length === 0) return;
      
      const currentUsedIn = pastPerf[0].used_in_proposals || [];
      await base44.entities.PastPerformance.update(pastPerfId, {
        used_in_proposals: currentUsedIn.filter(id => id !== proposalId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-past-performance', proposalId] });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      if (!proposalId || !organization?.id) {
        throw new Error("Proposal ID or Organization missing");
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      return base44.entities.SolicitationDocument.create({
        proposal_id: proposalId,
        organization_id: organization.id,
        document_type: 'reference',
        file_name: file.name,
        file_url: file_url,
        file_size: file.size
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-documents', proposalId] });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId) => {
      await base44.entities.SolicitationDocument.delete(docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-documents', proposalId] });
    },
  });

  const handleAddBoilerplate = async (boilerplate) => {
    await linkResourceMutation.mutateAsync(boilerplate.id);
    setBoilerplateSearch("");
    setShowBoilerplateResults(false);
  };

  const handleAddProposal = async (proposal) => {
    // Create a ProposalResource entry for this past proposal if it doesn't exist
    const existingResource = await base44.entities.ProposalResource.filter({
      organization_id: organization.id,
      resource_type: 'past_proposal',
      title: proposal.proposal_name
    });

    let resourceId;
    if (existingResource.length > 0) {
      resourceId = existingResource[0].id;
    } else {
      const newResource = await base44.entities.ProposalResource.create({
        organization_id: organization.id,
        resource_type: 'past_proposal',
        title: proposal.proposal_name,
        description: `Past proposal: ${proposal.agency_name}`,
        linked_proposal_ids: []
      });
      resourceId = newResource.id;
    }

    await linkResourceMutation.mutateAsync(resourceId);
    setProposalSearch("");
    setShowProposalResults(false);
  };

  const handleAddTemplate = async (template) => {
    await linkResourceMutation.mutateAsync(template.id);
    setTemplateSearch("");
    setShowTemplateResults(false);
  };

  const handleAddPastPerformance = async (pastPerf) => {
    await linkPastPerformanceMutation.mutateAsync(pastPerf.id);
    setPastPerformanceSearch("");
    setShowPastPerformanceResults(false);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        await uploadFileMutation.mutateAsync(file);
      }
      alert(`✓ Successfully uploaded ${files.length} file(s)`);
      e.target.value = '';
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Error uploading files: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (confirm("Remove this document?")) {
      await deleteDocMutation.mutateAsync(docId);
    }
  };

  const handleUnlinkResource = async (resourceId) => {
    if (confirm("Remove this resource from the proposal?")) {
      await unlinkResourceMutation.mutateAsync(resourceId);
    }
  };

  const handleUnlinkPastPerformance = async (pastPerfId) => {
    if (confirm("Remove this past performance record from the proposal?")) {
      await unlinkPastPerformanceMutation.mutateAsync(pastPerfId);
    }
  };

  // Filter search results
  const filteredBoilerplates = boilerplates.filter(b => 
    b.title?.toLowerCase().includes(boilerplateSearch.toLowerCase()) ||
    b.description?.toLowerCase().includes(boilerplateSearch.toLowerCase())
  );

  const filteredProposals = previousProposals.filter(p =>
    p.proposal_name?.toLowerCase().includes(proposalSearch.toLowerCase()) ||
    p.agency_name?.toLowerCase().includes(proposalSearch.toLowerCase()) ||
    p.solicitation_number?.toLowerCase().includes(proposalSearch.toLowerCase())
  );

  const filteredTemplates = proposalTemplates.filter(t =>
    t.title?.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.description?.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const filteredPastPerformance = pastPerformanceRecords.filter(p =>
    p.project_name?.toLowerCase().includes(pastPerformanceSearch.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(pastPerformanceSearch.toLowerCase()) ||
    p.keywords?.some(k => k.toLowerCase().includes(pastPerformanceSearch.toLowerCase())) ||
    p.services_provided?.some(s => s.toLowerCase().includes(pastPerformanceSearch.toLowerCase()))
  );

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Phase 2: Upload Referenced Documents for AI Analysis
        </CardTitle>
        <CardDescription>
          Upload PDF versions of proposal templates, proposal samples, boilerplate templates and other referenced documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <AlertDescription>
            <p className="font-semibold text-blue-900 mb-1">📄 Add Reference Documents for AI Learning</p>
            <p className="text-sm text-blue-800">
              Select existing boilerplate content, past proposals, templates, and past performance - OR upload new reference documents. 
              The AI will analyze all referenced materials to help write your proposal.
            </p>
          </AlertDescription>
        </Alert>

        {!proposalId && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Please save Phase 1 first before adding reference documents.
            </AlertDescription>
          </Alert>
        )}

        {proposalId && (
          <>
            {/* 1. Boilerplate Templates Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900">1. Boilerplate Templates</h3>
              </div>
              <p className="text-sm text-slate-600">Search and add previously created boilerplate content</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search boilerplate templates by name or keywords..."
                  value={boilerplateSearch}
                  onChange={(e) => {
                    setBoilerplateSearch(e.target.value);
                    setShowBoilerplateResults(e.target.value.length > 0);
                  }}
                  className="pl-10"
                />
                {showBoilerplateResults && filteredBoilerplates.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredBoilerplates.map((boilerplate) => (
                      <div
                        key={boilerplate.id}
                        onClick={() => handleAddBoilerplate(boilerplate)}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{boilerplate.title}</p>
                            {boilerplate.description && (
                              <p className="text-xs text-slate-600 mt-1">{boilerplate.description}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              {boilerplate.content_category && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {boilerplate.content_category.replace(/_/g, ' ')}
                                </Badge>
                              )}
                              {boilerplate.word_count && (
                                <Badge variant="outline" className="text-xs">
                                  {boilerplate.word_count} words
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Plus className="w-5 h-5 text-indigo-600 flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Previous Generated Proposals Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-slate-900">2. Previously Generated Proposals</h3>
              </div>
              <p className="text-sm text-slate-600">Search and add past finalized proposals</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search past proposals by name, agency, or solicitation number..."
                  value={proposalSearch}
                  onChange={(e) => {
                    setProposalSearch(e.target.value);
                    setShowProposalResults(e.target.value.length > 0);
                  }}
                  className="pl-10"
                />
                {showProposalResults && filteredProposals.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        onClick={() => handleAddProposal(proposal)}
                        className="p-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{proposal.proposal_name}</p>
                            <p className="text-xs text-slate-600 mt-1">
                              {proposal.agency_name} • {proposal.solicitation_number}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge className={cn(
                                "text-xs",
                                proposal.status === 'won' ? 'bg-green-100 text-green-700' : 
                                proposal.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 
                                'bg-slate-100 text-slate-700'
                              )}>
                                {proposal.status}
                              </Badge>
                            </div>
                          </div>
                          <Plus className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Proposal Templates Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileArchive className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-slate-900">3. Proposal Templates</h3>
              </div>
              <p className="text-sm text-slate-600">Search and add previously uploaded proposal templates</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search proposal templates by name or keywords..."
                  value={templateSearch}
                  onChange={(e) => {
                    setTemplateSearch(e.target.value);
                    setShowTemplateResults(e.target.value.length > 0);
                  }}
                  className="pl-10"
                />
                {showTemplateResults && filteredTemplates.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => handleAddTemplate(template)}
                        className="p-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{template.title}</p>
                            {template.description && (
                              <p className="text-xs text-slate-600 mt-1">{template.description}</p>
                            )}
                            {template.file_name && (
                              <p className="text-xs text-slate-500 mt-1">📄 {template.file_name}</p>
                            )}
                          </div>
                          <Plus className="w-5 h-5 text-purple-600 flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Past Performance Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-slate-900">4. Past Performance</h3>
              </div>
              <p className="text-sm text-slate-600">Search and add past performance records from your library</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search past performance by project name, client, or keywords..."
                  value={pastPerformanceSearch}
                  onChange={(e) => {
                    setPastPerformanceSearch(e.target.value);
                    setShowPastPerformanceResults(e.target.value.length > 0);
                  }}
                  className="pl-10"
                />
                {showPastPerformanceResults && filteredPastPerformance.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredPastPerformance.map((pastPerf) => (
                      <div
                        key={pastPerf.id}
                        onClick={() => handleAddPastPerformance(pastPerf)}
                        className="p-3 hover:bg-amber-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{pastPerf.project_name}</p>
                            <p className="text-xs text-slate-600 mt-1">
                              {pastPerf.client_name} • {pastPerf.contract_value ? `$${(pastPerf.contract_value / 1000000).toFixed(1)}M` : 'No value specified'}
                            </p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {pastPerf.status && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {pastPerf.status}
                                </Badge>
                              )}
                              {pastPerf.client_type && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {pastPerf.client_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Plus className="w-5 h-5 text-amber-600 flex-shrink-0 ml-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5. Direct File Upload */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">5. Upload Other Reference Documents</h3>
              </div>
              <p className="text-sm text-slate-600">Upload any other reference documents (PDFs only for AI analysis)</p>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors bg-slate-50">
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                  <p className="text-slate-700 font-medium mb-1">
                    {uploading ? 'Uploading...' : 'Click to upload PDF files'}
                  </p>
                  <p className="text-sm text-slate-500">or drag and drop</p>
                </label>
              </div>
            </div>

            {/* Display Added Resources */}
            {(linkedResources.length > 0 || linkedPastPerformance.length > 0 || uploadedDocs.length > 0) && (
              <div className="space-y-4 pt-6 border-t">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Added Reference Documents ({linkedResources.length + linkedPastPerformance.length + uploadedDocs.length})
                </h3>

                <div className="space-y-2">
                  {/* Linked Resources */}
                  {linkedResources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {resource.resource_type === 'boilerplate_text' && <FileCode className="w-5 h-5 text-indigo-600 flex-shrink-0" />}
                        {resource.resource_type === 'past_proposal' && <FileCheck className="w-5 h-5 text-green-600 flex-shrink-0" />}
                        {resource.resource_type === 'template' && <FileArchive className="w-5 h-5 text-purple-600 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{resource.title}</p>
                          {resource.description && (
                            <p className="text-xs text-slate-600 truncate">{resource.description}</p>
                          )}
                          <Badge variant="outline" className="text-xs mt-1 capitalize">
                            {resource.resource_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnlinkResource(resource.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Linked Past Performance */}
                  {linkedPastPerformance.map((pastPerf) => (
                    <div key={pastPerf.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Award className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{pastPerf.project_name}</p>
                          <p className="text-xs text-slate-600 truncate">
                            {pastPerf.client_name} • {pastPerf.contract_value ? `$${(pastPerf.contract_value / 1000000).toFixed(1)}M` : 'No value'}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            Past Performance
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnlinkPastPerformance(pastPerf.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Uploaded Documents */}
                  {uploadedDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <File className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{doc.file_name}</p>
                          <p className="text-xs text-slate-500">
                            {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {linkedResources.length === 0 && linkedPastPerformance.length === 0 && uploadedDocs.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg bg-slate-50">
                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Reference Documents Added Yet</h3>
                <p className="text-slate-600">
                  Search for existing content or upload new reference documents to help AI generate your proposal
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}