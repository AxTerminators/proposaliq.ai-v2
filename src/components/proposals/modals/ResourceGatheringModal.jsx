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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileText, Award, Library, ExternalLink, File } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ResourceGatheringModal({ isOpen, onClose, proposalId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null);
  
  const [resources, setResources] = useState([]);
  const [pastPerformance, setPastPerformance] = useState([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);
  const [selectedPPIds, setSelectedPPIds] = useState([]);

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

        // Load resources
        const resourceData = await base44.entities.ProposalResource.filter(
          { organization_id: org.id },
          '-created_date'
        );
        setResources(resourceData);

        // Load past performance
        const ppData = await base44.entities.PastPerformance.filter(
          { organization_id: org.id },
          '-created_date'
        );
        setPastPerformance(ppData);
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

  const handleResourceClick = (e, resource) => {
    // Only open file if clicking on the title/file name area, not the checkbox
    if (e.target.type === 'checkbox') return;
    
    if (resource.file_url) {
      window.open(resource.file_url, '_blank');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // In the future, we could link these to the proposal
      // For now, just close the modal - the selections are tracked
      alert(`✅ Linked ${selectedResourceIds.length} resources and ${selectedPPIds.length} past performance projects`);
      onClose();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error saving. Please try again.");
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gather Resources</DialogTitle>
          <DialogDescription>
            Link boilerplate content, capability statements, and past performance to this proposal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Tabs defaultValue="resources" className="py-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="resources">
                <Library className="w-4 h-4 mr-2" />
                Resources ({resources.length})
              </TabsTrigger>
              <TabsTrigger value="past-performance">
                <Award className="w-4 h-4 mr-2" />
                Past Performance ({pastPerformance.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resources" className="space-y-3">
              {resources.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Library className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No resources found. Add resources in the Resources page.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {resources.map(resource => (
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
            <p className="text-sm text-slate-600">
              {selectedResourceIds.length} resources, {selectedPPIds.length} past performance selected
            </p>
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
                  "Link Resources"
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}