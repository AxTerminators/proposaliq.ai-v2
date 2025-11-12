import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Library,
  Send,
  CheckCircle2,
  Loader2,
  Search,
  Users,
  Award,
  Briefcase,
  Handshake,
  FileText,
  Building2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const RESOURCE_TYPES = [
  { value: 'proposal_resource', label: 'Resources', icon: Library, color: 'text-blue-600' },
  { value: 'past_performance', label: 'Past Performance', icon: Award, color: 'text-green-600' },
  { value: 'key_personnel', label: 'Key Personnel', icon: Users, color: 'text-purple-600' },
  { value: 'teaming_partner', label: 'Teaming Partners', icon: Handshake, color: 'text-amber-600' },
];

/**
 * Global Resource Library
 * Allows consultants to push resources from their firm to client workspaces
 */
export default function GlobalResourceLibrary({ consultingFirm }) {
  const queryClient = useQueryClient();
  const [selectedResourceType, setSelectedResourceType] = useState('proposal_resource');
  const [searchQuery, setSearchQuery] = useState("");
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [selectedResources, setSelectedResources] = useState([]);
  const [targetClients, setTargetClients] = useState([]);

  // Fetch client organizations
  const { data: clientOrganizations = [] } = useQuery({
    queryKey: ['client-organizations-for-push', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.Organization.filter({
        organization_type: 'client_organization',
        parent_organization_id: consultingFirm.id
      });
    },
    enabled: !!consultingFirm?.id,
  });

  // Fetch resources based on type
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['firm-resources', consultingFirm?.id, selectedResourceType],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];

      switch (selectedResourceType) {
        case 'proposal_resource':
          return base44.entities.ProposalResource.filter({
            organization_id: consultingFirm.id
          }, '-created_date');
        
        case 'past_performance':
          return base44.entities.PastPerformance.filter({
            organization_id: consultingFirm.id
          }, '-created_date');
        
        case 'key_personnel':
          return base44.entities.KeyPersonnel.filter({
            organization_id: consultingFirm.id
          }, '-created_date');
        
        case 'teaming_partner':
          return base44.entities.TeamingPartner.filter({
            organization_id: consultingFirm.id
          }, 'partner_name');
        
        default:
          return [];
      }
    },
    enabled: !!consultingFirm?.id,
  });

  const pushResourcesMutation = useMutation({
    mutationFn: async ({ resourceIds, clientOrgIds }) => {
      const results = [];

      for (const clientOrgId of clientOrgIds) {
        for (const resourceId of resourceIds) {
          try {
            const response = await base44.functions.invoke('pushResourceToClient', {
              source_organization_id: consultingFirm.id,
              target_organization_id: clientOrgId,
              resource_type: selectedResourceType,
              source_resource_id: resourceId,
              share_type: 'copy',
              auto_sync: false
            });

            if (response.data.success) {
              results.push({ 
                clientOrgId, 
                resourceId, 
                success: true 
              });
            }
          } catch (error) {
            results.push({ 
              clientOrgId, 
              resourceId, 
              success: false, 
              error: error.message 
            });
          }
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      queryClient.invalidateQueries({ queryKey: ['resource-shares'] });
      
      toast.success(
        `✅ Pushed ${successCount} of ${totalCount} resource(s) successfully!`,
        { duration: 4000 }
      );

      setShowPushDialog(false);
      setSelectedResources([]);
      setTargetClients([]);
    },
    onError: (error) => {
      toast.error("Failed to push resources: " + error.message);
    }
  });

  const handlePushResources = () => {
    if (selectedResources.length === 0) {
      toast.error("Select at least one resource");
      return;
    }
    if (targetClients.length === 0) {
      toast.error("Select at least one client");
      return;
    }

    pushResourcesMutation.mutate({
      resourceIds: selectedResources,
      clientOrgIds: targetClients
    });
  };

  const toggleResourceSelection = (resourceId) => {
    setSelectedResources(prev =>
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const toggleClientSelection = (clientId) => {
    setTargetClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const filteredResources = resources.filter(r => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    
    switch (selectedResourceType) {
      case 'proposal_resource':
        return r.title?.toLowerCase().includes(searchLower);
      case 'past_performance':
        return r.project_name?.toLowerCase().includes(searchLower) ||
               r.client_name?.toLowerCase().includes(searchLower);
      case 'key_personnel':
        return r.full_name?.toLowerCase().includes(searchLower);
      case 'teaming_partner':
        return r.partner_name?.toLowerCase().includes(searchLower);
      default:
        return true;
    }
  });

  const getResourceTitle = (resource) => {
    switch (selectedResourceType) {
      case 'proposal_resource':
        return resource.title || 'Untitled Resource';
      case 'past_performance':
        return resource.project_name || 'Untitled Project';
      case 'key_personnel':
        return resource.full_name || 'Unnamed Person';
      case 'teaming_partner':
        return resource.partner_name || 'Unnamed Partner';
      default:
        return 'Unknown';
    }
  };

  const currentResourceType = RESOURCE_TYPES.find(rt => rt.value === selectedResourceType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Library className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Global Resource Library
                </h2>
                <p className="text-slate-600 text-sm">
                  Push templates and resources to client workspaces
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowPushDialog(true)}
              disabled={selectedResources.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Push to Clients ({selectedResources.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resource Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {RESOURCE_TYPES.map(type => {
          const Icon = type.icon;
          const isSelected = selectedResourceType === type.value;

          return (
            <button
              key={type.value}
              onClick={() => {
                setSelectedResourceType(type.value);
                setSelectedResources([]);
              }}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left",
                isSelected
                  ? "border-purple-500 bg-purple-50 shadow-md"
                  : "border-slate-200 hover:border-purple-300 hover:bg-slate-50"
              )}
            >
              <Icon className={cn("w-6 h-6 mb-2", type.color)} />
              <p className="font-semibold text-slate-900 text-sm">{type.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder={`Search ${currentResourceType?.label.toLowerCase()}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Resources Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
        </div>
      ) : filteredResources.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No {currentResourceType?.label.toLowerCase()} found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map(resource => {
            const isSelected = selectedResources.includes(resource.id);

            return (
              <Card
                key={resource.id}
                className={cn(
                  "cursor-pointer transition-all border-2",
                  isSelected
                    ? "border-purple-500 bg-purple-50 shadow-md"
                    : "border-slate-200 hover:border-purple-300"
                )}
                onClick={() => toggleResourceSelection(resource.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      className="mt-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {getResourceTitle(resource)}
                      </p>
                      {selectedResourceType === 'past_performance' && resource.client_name && (
                        <p className="text-sm text-slate-600 truncate">
                          Client: {resource.client_name}
                        </p>
                      )}
                      {selectedResourceType === 'teaming_partner' && resource.partner_type && (
                        <Badge className="mt-1 text-xs">
                          {resource.partner_type.replace('_', ' ')}
                        </Badge>
                      )}
                      {resource.usage_count > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          Used {resource.usage_count} time{resource.usage_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Push Dialog */}
      <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600" />
              Push Resources to Client Workspaces
            </DialogTitle>
            <DialogDescription>
              Select which client workspaces should receive these {selectedResources.length} resource(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {clientOrganizations.length === 0 ? (
              <Card className="border-2 border-amber-200 bg-amber-50">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                  <p className="text-amber-900 font-semibold mb-1">No Client Workspaces</p>
                  <p className="text-sm text-amber-700">
                    Create client organizations first before pushing resources
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {clientOrganizations.map(clientOrg => {
                  const isSelected = targetClients.includes(clientOrg.id);

                  return (
                    <Card
                      key={clientOrg.id}
                      className={cn(
                        "cursor-pointer transition-all border-2",
                        isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "border-slate-200 hover:border-purple-300"
                      )}
                      onClick={() => toggleClientSelection(clientOrg.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {clientOrg.organization_name}
                            </p>
                            <p className="text-sm text-slate-600 truncate">
                              {clientOrg.contact_email}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {targetClients.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-900">
                  ℹ️ Resources will be <strong>copied</strong> to each selected client workspace. 
                  Clients can then customize them independently.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPushDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePushResources}
              disabled={
                targetClients.length === 0 || 
                selectedResources.length === 0 ||
                pushResourcesMutation.isPending
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              {pushResourcesMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Pushing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Push to {targetClients.length} Client{targetClients.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}