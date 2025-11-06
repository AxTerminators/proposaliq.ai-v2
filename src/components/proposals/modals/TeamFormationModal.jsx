import React, { useState, useEffect } from "react";
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
import { Loader2, Users } from "lucide-react";

export default function TeamFormationModal(props = {}) {
  const { isOpen = false, onClose = () => {}, proposalId } = props;
  
  const queryClient = useQueryClient();
  const [selectedPartners, setSelectedPartners] = useState([]);

  const { data: proposal } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: async () => {
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      return proposals[0];
    },
    enabled: !!proposalId && isOpen,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['teaming-partners'],
    queryFn: async () => {
      if (!proposal?.organization_id) return [];
      return base44.entities.TeamingPartner.filter(
        { organization_id: proposal.organization_id },
        'partner_name'
      );
    },
    enabled: !!proposal?.organization_id && isOpen,
  });

  useEffect(() => {
    if (proposal?.teaming_partner_ids) {
      setSelectedPartners(proposal.teaming_partner_ids);
    }
  }, [proposal]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Proposal.update(proposalId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onClose();
    },
  });

  const togglePartner = (partnerId) => {
    setSelectedPartners(prev =>
      prev.includes(partnerId)
        ? prev.filter(id => id !== partnerId)
        : [...prev, partnerId]
    );
  };

  const handleSave = () => {
    updateMutation.mutate({ teaming_partner_ids: selectedPartners });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Form Your Team
          </DialogTitle>
          <DialogDescription>
            Select teaming partners for this proposal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {partners.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No teaming partners available</p>
              <p className="text-sm text-slate-500 mt-2">
                Add teaming partners from the Teaming Partners page
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer"
                  onClick={() => togglePartner(partner.id)}
                >
                  <Checkbox
                    checked={selectedPartners.includes(partner.id)}
                    onCheckedChange={() => togglePartner(partner.id)}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{partner.partner_name}</h4>
                    {partner.core_capabilities && partner.core_capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {partner.core_capabilities.slice(0, 3).map((cap, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
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
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Team"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}