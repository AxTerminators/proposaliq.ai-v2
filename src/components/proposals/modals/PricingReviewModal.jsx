import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

export default function PricingReviewModal(props = {}) {
  const { isOpen = false, onClose = () => {}, proposalId } = props;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Review Pricing
          </DialogTitle>
          <DialogDescription>
            Review and finalize your proposal pricing
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 text-center">
          <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">
            Pricing review tools coming soon!
          </p>
          <p className="text-sm text-slate-500">
            This will help you review and optimize your pricing strategy
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}