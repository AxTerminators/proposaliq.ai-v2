import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileEdit } from "lucide-react";

export default function ContentPlanningModal(props = {}) {
  const { isOpen = false, onClose = () => {}, proposalId } = props;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            Plan Content
          </DialogTitle>
          <DialogDescription>
            Plan and organize your proposal content structure
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 text-center">
          <FileEdit className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">
            Content planning tools coming soon!
          </p>
          <p className="text-sm text-slate-500">
            This will help you organize sections and outline your proposal
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