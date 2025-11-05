import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award } from "lucide-react";
import WinLossAnalyzer from "../../analytics/WinLossAnalyzer";

export default function Phase8WinLossModal({ open, onOpenChange, proposal, organization }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Win/Loss Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <WinLossAnalyzer
            proposal={proposal}
            organization={organization}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}