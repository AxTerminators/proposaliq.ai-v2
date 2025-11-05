import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield } from "lucide-react";
import ComplianceMatrixGenerator from "../ComplianceMatrixGenerator";

export default function Phase4ComplianceModal({ open, onOpenChange, proposal, organization }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Compliance Matrix
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <ComplianceMatrixGenerator
            proposal={proposal}
            organization={organization}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}