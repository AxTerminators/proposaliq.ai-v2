import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, 
  Search, 
  Plus, 
  X, 
  FileCode, 
  FileCheck, 
  FileArchive, 
  Award,
  Sparkles,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Phase2ResourcesModal({ open, onOpenChange, proposal }) {
  const queryClient = useQueryClient();
  const [organization, setOrganization] = React.useState(null);
  
  // Search states
  const [boilerplateSearch, setBoilerplateSearch] = React.useState("");
  const [proposalSearch, setProposalSearch] = React.useState("");
  const [templateSearch, setTemplateSearch] = React.useState("");
  const [pastPerformanceSearch, setPastPerformanceSearch] = React.useState("");
  
  // Search results visibility
  const [showBoilerplateResults, setShowBoilerplateResults] = React.useState(false);
  const [showProposalResults, setShowProposalResults] = React.useState(false);
  const [showTemplateResults, setShowTemplateResults] = React.useState(false);
  const [showPastPerformanceResults, setShowPastPerformanceResults] = React.useState(false);

  React.useEffect(() => {
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
        console.error("Error loading organization:", error);
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
    enabled: !!organization?.id && open,
  });

  // Query for previous proposals
  const { data: previousProposals = [] } = useQuery({
    queryKey: ['previous-proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const proposals = await base44.entities.Proposal.filter({
        organization_id: organization.id
      }, '-created_date');
      return proposals.filter(p => ['submitted', 'won', 'lost'].includes(p.status));
    },
    enabled: !!organization?.id && open,
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
    enabled: !!organization?.id && open,
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
    enabled: !!organization?.id && open,
  });

  // Query for linked resources
  const { data: linkedResources = [] } = useQuery({
    queryKey: ['linked-resources', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      const allResources = await base44.entities.ProposalResource.filter({
        organization_id: organization.id
      });
      return allResources.filter(r => r.linked_proposal_ids?.includes(proposal.id));
    },
    enabled: !!proposal?.id && !!organization?.id && open,
  });

  // Query for linked past performance
  const { data: linkedPastPerformance = [] } = useQuery({
    queryKey: ['linked-past-performance', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      const allPastPerf = await base44.entities.PastPerformance.filter({
        organization_id: organization.id
      });
      return allPastPerf.filter(p => p.used_in_proposals?.includes(proposal.id));
    },
    enabled: !!proposal?.id && !!organization?.id && open,
  });

  const linkResourceMutation = useMutation({
    mutationFn: async (resourceId) => {
      const resource = await base44.entities.ProposalResource.filter({ id: resourceId });
      if (resource.length === 0) return;
      
      const currentLinkedIds = resource[0].linked_proposal_ids || [];
      if (currentLinkedIds.includes(proposal.id)) return;
      
      await base44.entities.ProposalResource.update(resourceId, {
        linked_proposal_ids: [...currentLinkedIds, proposal.id],
        usage_count: (resource[0].usage_count || 0) + 1,
        last_used_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-resources', proposal?.id] });
    },
  });

  const linkPastPerformanceMutation = useMutation({
    mutationFn: async (pastPerfId) => {
      const pastPerf = await base44.entities.PastPerformance.filter({ id: pastPerfId });
      if (pastPerf.length === 0) return;
      
      const currentUsedIn = pastPerf[0].used_in_proposals || [];
      if (currentUsedIn.includes(proposal.id)) return;
      
      await base44.entities.PastPerformance.update(pastPerfId, {
        used_in_proposals: [...currentUsedIn, proposal.id],
        usage_count: (pastPerf[0].usage_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-past-performance', proposal?.id] });
    },
  });

  const unlinkResourceMutation = useMutation({
    mutationFn: async (resourceId) => {
      const resource = await base44.entities.ProposalResource.filter({ id: resourceId });
      if (resource.length === 0) return;
      
      const currentLinkedIds = resource[0].linked_proposal_ids || [];
      await base44.entities.ProposalResource.update(resourceId, {
        linked_proposal_ids: currentLinkedIds.filter(id => id !== proposal.id)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-resources', proposal?.id] });
    },
  });

  const unlinkPastPerformanceMutation = useMutation({
    mutationFn: async (pastPerfId) => {
      const pastPerf = await base44.entities.PastPerformance.filter({ id: pastPerfId });
      if (pastPerf.length === 0) return;
      
      const currentUsedIn = pastPerf[0].used_in_proposals || [];
      await base44.entities.PastPerformance.update(pastPerfId, {
        used_in_proposals: currentUsedIn.filter(id => id !== proposal.id)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-past-performance', proposal?.id] });
    },
  });

  // Filter search results
  const filteredBoilerplates = boilerplates.filter(b => 
    b.title?.toLowerCase().includes(boilerplateSearch.toLowerCase()) ||
    b.description?.toLowerCase().includes(boilerplateSearch.toLowerCase())
  );

  const filteredProposals = previousProposals.filter(p =>
    p.proposal_name?.toLowerCase().includes(proposalSearch.toLowerCase()) ||
    p.agency_name?.toLowerCase().includes(proposalSearch.toLowerCase())
  );

  const filteredTemplates = proposalTemplates.filter(t =>
    t.title?.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.description?.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const filteredPastPerformance = pastPerformanceRecords.filter(p =>
    p.project_name?.toLowerCase().includes(pastPerformanceSearch.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(pastPerformanceSearch.toLowerCase())
  );

  const totalLinked = linkedResources.length + linkedPastPerformance.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Reference Documents & Resources
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <AlertDescription>
              <p className="font-semibold text-blue-900 mb-1">📄 Add Reference Documents for AI</p>
              <p className="text-sm text-blue-800">
                Link boilerplate, past proposals, templates, and past performance records. The AI will analyze all materials to help write your proposal.
              </p>
            </AlertDescription>
          </Alert>

          {/* Boilerplate Search */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-900">Boilerplate Templates</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search boilerplate templates..."
                value={boilerplateSearch}
                onChange={(e) => {
                  setBoilerplateSearch(e.target.value);
                  setShowBoilerplateResults(e.target.value.length > 0);
                }}
                className="pl-10"
              />
              {showBoilerplateResults && filteredBoilerplates.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredBoilerplates.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        linkResourceMutation.mutate(item.id);
                        setBoilerplateSearch("");
                        setShowBoilerplateResults(false);
                      }}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                          )}
                        </div>
                        <Plus className="w-5 h-5 text-indigo-600 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Past Proposals Search */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-slate-900">Previous Proposals</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search past proposals..."
                value={proposalSearch}
                onChange={(e) => {
                  setProposalSearch(e.target.value);
                  setShowProposalResults(e.target.value.length > 0);
                }}
                className="pl-10"
              />
              {showProposalResults && filteredProposals.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredProposals.map((item) => (
                    <div
                      key={item.id}
                      onClick={async () => {
                        // Create resource entry for past proposal
                        const existing = await base44.entities.ProposalResource.filter({
                          organization_id: organization.id,
                          resource_type: 'past_proposal',
                          title: item.proposal_name
                        });
                        
                        let resourceId;
                        if (existing.length > 0) {
                          resourceId = existing[0].id;
                        } else {
                          const newResource = await base44.entities.ProposalResource.create({
                            organization_id: organization.id,
                            resource_type: 'past_proposal',
                            title: item.proposal_name,
                            description: `Past proposal: ${item.agency_name}`,
                            linked_proposal_ids: []
                          });
                          resourceId = newResource.id;
                        }
                        
                        linkResourceMutation.mutate(resourceId);
                        setProposalSearch("");
                        setShowProposalResults(false);
                      }}
                      className="p-3 hover:bg-green-50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{item.proposal_name}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {item.agency_name} • {item.solicitation_number}
                          </p>
                          <Badge className={cn(
                            "text-xs mt-1",
                            item.status === 'won' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                          )}>
                            {item.status}
                          </Badge>
                        </div>
                        <Plus className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Templates Search */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileArchive className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-slate-900">Proposal Templates</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search templates..."
                value={templateSearch}
                onChange={(e) => {
                  setTemplateSearch(e.target.value);
                  setShowTemplateResults(e.target.value.length > 0);
                }}
                className="pl-10"
              />
              {showTemplateResults && filteredTemplates.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredTemplates.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        linkResourceMutation.mutate(item.id);
                        setTemplateSearch("");
                        setShowTemplateResults(false);
                      }}
                      className="p-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-slate-600 mt-1">{item.description}</p>
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

          {/* Past Performance Search */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-slate-900">Past Performance</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search past performance..."
                value={pastPerformanceSearch}
                onChange={(e) => {
                  setPastPerformanceSearch(e.target.value);
                  setShowPastPerformanceResults(e.target.value.length > 0);
                }}
                className="pl-10"
              />
              {showPastPerformanceResults && filteredPastPerformance.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredPastPerformance.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        linkPastPerformanceMutation.mutate(item.id);
                        setPastPerformanceSearch("");
                        setShowPastPerformanceResults(false);
                      }}
                      className="p-3 hover:bg-amber-50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{item.project_name}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {item.client_name}
                          </p>
                        </div>
                        <Plus className="w-5 h-5 text-amber-600 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Linked Resources Display */}
          {totalLinked > 0 && (
            <div className="space-y-4 pt-6 border-t">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Linked Resources ({totalLinked})
              </h3>

              <div className="space-y-2">
                {linkedResources.map((resource) => (
                  <div key={resource.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {resource.resource_type === 'boilerplate_text' && <FileCode className="w-5 h-5 text-indigo-600" />}
                      {resource.resource_type === 'past_proposal' && <FileCheck className="w-5 h-5 text-green-600" />}
                      {resource.resource_type === 'template' && <FileArchive className="w-5 h-5 text-purple-600" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{resource.title}</p>
                        <Badge variant="outline" className="text-xs mt-1 capitalize">
                          {resource.resource_type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => unlinkResourceMutation.mutate(resource.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {linkedPastPerformance.map((pastPerf) => (
                  <div key={pastPerf.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Award className="w-5 h-5 text-amber-600" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{pastPerf.project_name}</p>
                        <p className="text-xs text-slate-600">{pastPerf.client_name}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => unlinkPastPerformanceMutation.mutate(pastPerf.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}