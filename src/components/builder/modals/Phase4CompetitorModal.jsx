import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy } from "lucide-react";
import CompetitorAnalysis from "../CompetitorAnalysis";

export default function Phase4CompetitorModal({ open, onOpenChange, proposal, organization }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-blue-600" />
            Competitor Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <CompetitorAnalysis
            proposal={proposal}
            organization={organization}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}