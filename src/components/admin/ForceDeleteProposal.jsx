import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ForceDeleteProposal({ proposalId, proposalName }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${proposalName}"?`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await base44.functions.invoke('deleteProposal', {
        proposal_id: proposalId
      });

      if (response.data.success) {
        alert('✅ Proposal deleted successfully!');
        window.location.reload();
      } else {
        alert('❌ Failed to delete proposal: ' + JSON.stringify(response.data));
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={deleting}
      className="gap-2"
    >
      <Trash2 className="w-4 h-4" />
      {deleting ? 'Deleting...' : 'Force Delete'}
    </Button>
  );
}