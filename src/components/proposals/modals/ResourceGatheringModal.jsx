import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FolderOpen } from "lucide-react";

export default function ResourceGatheringModal(props = {}) {
  const { isOpen = false, onClose = () => {}, proposalId } = props;
  
  const queryClient = useQueryClient();
  const [selectedResources, setSelectedResources] = useState([]);

  const { data: proposal } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: async () => {
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      return proposals[0];
    },
    enabled: !!proposalId && isOpen,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['proposal-resources'],
    queryFn: async () => {
      if (!proposal?.organization_id) return [];
      return base44.entities.ProposalResource.filter(
        { organization_id: proposal.organization_id },
        '-created_date'
      );
    },
    enabled: !!proposal?.organization_id && isOpen,
  });

  const toggleResource = (resourceId) => {
    setSelectedResources(prev =>
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const handleSave = () => {
    // In a real implementation, you'd link these resources to the proposal
    console.log('Selected resources:', selectedResources);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Gather Resources
          </DialogTitle>
          <DialogDescription>
            Select relevant resources for this proposal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {resources.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No resources available</p>
              <p className="text-sm text-slate-500 mt-2">
                Add resources from the Resources page
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer"
                  onClick={() => toggleResource(resource.id)}
                >
                  <Checkbox
                    checked={selectedResources.includes(resource.id)}
                    onCheckedChange={() => toggleResource(resource.id)}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{resource.title}</h4>
                    <Badge variant="secondary" className="text-xs mt-1 capitalize">
                      {resource.resource_type?.replace('_', ' ')}
                    </Badge>
                    {resource.description && (
                      <p className="text-sm text-slate-600 mt-2">{resource.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Attach Resources
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}