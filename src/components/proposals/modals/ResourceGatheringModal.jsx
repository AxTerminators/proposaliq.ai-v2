import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Plus, FileCode, FileCheck, FileArchive, Award, X } from "lucide-react";

export default function ResourceGatheringModal({ isOpen, onClose, proposalId }) {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);
  
  // Available resources
  const [boilerplates, setBoilerplates] = useState([]);
  const [pastPerformance, setPastPerformance] = useState([]);
  
  // Already linked resources
  const [linkedResources, setLinkedResources] = useState([]);
  const [linkedPastPerf, setLinkedPastPerf] = useState([]);
  
  // Search states
  const [boilerplateSearch, setBoilerplateSearch] = useState("");
  const [pastPerfSearch, setPastPerfSearch] = useState("");

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

        // Load boilerplates
        const boilerplateData = await base44.entities.ProposalResource.filter({
          organization_id: org.id,
          resource_type: 'boilerplate_text'
        }, '-created_date');
        setBoilerplates(boilerplateData);

        // Load past performance
        const pastPerfData = await base44.entities.PastPerformance.filter({
          organization_id: org.id
        }, '-start_date');
        setPastPerformance(pastPerfData);

        // Load already linked resources
        const allResources = await base44.entities.ProposalResource.filter({
          organization_id: org.id
        });
        const linked = allResources.filter(r => r.linked_proposal_ids?.includes(proposalId));
        setLinkedResources(linked);

        // Load already linked past performance
        const allPastPerf = await base44.entities.PastPerformance.filter({
          organization_id: org.id
        });
        const linkedPP = allPastPerf.filter(p => p.used_in_proposals?.includes(proposalId));
        setLinkedPastPerf(linkedPP);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddResource = async (resourceId) => {
    try {
      const resource = await base44.entities.ProposalResource.filter({ id: resourceId });
      if (resource.length === 0) return;
      
      const currentLinkedIds = resource[0].linked_proposal_ids || [];
      if (currentLinkedIds.includes(proposalId)) return;
      
      await base44.entities.ProposalResource.update(resourceId, {
        linked_proposal_ids: [...currentLinkedIds, proposalId],
        usage_count: (resource[0].usage_count || 0) + 1,
        last_used_date: new Date().toISOString()
      });
      
      await loadData();
      setBoilerplateSearch("");
    } catch (error) {
      console.error("Error adding resource:", error);
    }
  };

  const handleAddPastPerformance = async (pastPerfId) => {
    try {
      const pastPerf = await base44.entities.PastPerformance.filter({ id: pastPerfId });
      if (pastPerf.length === 0) return;
      
      const currentUsedIn = pastPerf[0].used_in_proposals || [];
      if (currentUsedIn.includes(proposalId)) return;
      
      await base44.entities.PastPerformance.update(pastPerfId, {
        used_in_proposals: [...currentUsedIn, proposalId],
        usage_count: (pastPerf[0].usage_count || 0) + 1
      });
      
      await loadData();
      setPastPerfSearch("");
    } catch (error) {
      console.error("Error adding past performance:", error);
    }
  };

  const handleRemoveResource = async (resourceId) => {
    try {
      const resource = await base44.entities.ProposalResource.filter({ id: resourceId });
      if (resource.length === 0) return;
      
      const currentLinkedIds = resource[0].linked_proposal_ids || [];
      await base44.entities.ProposalResource.update(resourceId, {
        linked_proposal_ids: currentLinkedIds.filter(id => id !== proposalId)
      });
      
      await loadData();
    } catch (error) {
      console.error("Error removing resource:", error);
    }
  };

  const handleRemovePastPerformance = async (pastPerfId) => {
    try {
      const pastPerf = await base44.entities.PastPerformance.filter({ id: pastPerfId });
      if (pastPerf.length === 0) return;
      
      const currentUsedIn = pastPerf[0].used_in_proposals || [];
      await base44.entities.PastPerformance.update(pastPerfId, {
        used_in_proposals: currentUsedIn.filter(id => id !== proposalId)
      });
      
      await loadData();
    } catch (error) {
      console.error("Error removing past performance:", error);
    }
  };

  const filteredBoilerplates = boilerplates.filter(b => 
    !linkedResources.find(lr => lr.id === b.id) &&
    (b.title?.toLowerCase().includes(boilerplateSearch.toLowerCase()) ||
     b.description?.toLowerCase().includes(boilerplateSearch.toLowerCase()))
  );

  const filteredPastPerf = pastPerformance.filter(p =>
    !linkedPastPerf.find(lp => lp.id === p.id) &&
    (p.project_name?.toLowerCase().includes(pastPerfSearch.toLowerCase()) ||
     p.client_name?.toLowerCase().includes(pastPerfSearch.toLowerCase()))
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gather Reference Documents</DialogTitle>
          <DialogDescription>
            Link boilerplate content, templates, and past performance to this proposal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Boilerplate Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-900">Boilerplate Content</h3>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search boilerplate templates..."
                  value={boilerplateSearch}
                  onChange={(e) => setBoilerplateSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {boilerplateSearch && filteredBoilerplates.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {filteredBoilerplates.map((boilerplate) => (
                    <div
                      key={boilerplate.id}
                      onClick={() => handleAddResource(boilerplate.id)}
                      className="p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900">{boilerplate.title}</p>
                          {boilerplate.description && (
                            <p className="text-xs text-slate-600 mt-1">{boilerplate.description}</p>
                          )}
                        </div>
                        <Plus className="w-4 h-4 text-indigo-600 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Performance Search */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-slate-900">Past Performance</h3>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search past performance records..."
                  value={pastPerfSearch}
                  onChange={(e) => setPastPerfSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {pastPerfSearch && filteredPastPerf.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {filteredPastPerf.map((pastPerf) => (
                    <div
                      key={pastPerf.id}
                      onClick={() => handleAddPastPerformance(pastPerf.id)}
                      className="p-3 hover:bg-amber-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900">{pastPerf.project_name}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {pastPerf.client_name} • {pastPerf.contract_value ? `$${(pastPerf.contract_value / 1000000).toFixed(1)}M` : 'No value'}
                          </p>
                        </div>
                        <Plus className="w-4 h-4 text-amber-600 flex-shrink-0 ml-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Resources Display */}
            {(linkedResources.length > 0 || linkedPastPerf.length > 0) && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold text-slate-900">Linked Resources ({linkedResources.length + linkedPastPerf.length})</h3>
                <div className="space-y-2">
                  {linkedResources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileCode className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">{resource.title}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {resource.resource_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveResource(resource.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  {linkedPastPerf.map((pastPerf) => (
                    <div key={pastPerf.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Award className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">{pastPerf.project_name}</p>
                          <p className="text-xs text-slate-600 truncate">{pastPerf.client_name}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemovePastPerformance(pastPerf.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {linkedResources.length === 0 && linkedPastPerf.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg bg-slate-50">
                <FileArchive className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-600">No resources linked yet</p>
                <p className="text-xs text-slate-500 mt-1">Search above to add boilerplate or past performance</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}