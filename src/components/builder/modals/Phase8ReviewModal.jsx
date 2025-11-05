import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield } from "lucide-react";
import RedTeamReview from "../RedTeamReview";

export default function Phase8ReviewModal({ open, onOpenChange, proposal, organization }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Final Red Team Review
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <RedTeamReview
            proposal={proposal}
            organization={organization}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}