import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Lightbulb, 
  Rocket, 
  Building2, 
  FileCheck,
  MapPin,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const PROPOSAL_TYPES = [
  {
    value: "RFP",
    label: "RFP - Request for Proposal",
    description: "Standard government solicitation",
    icon: FileText,
    color: "from-blue-500 to-blue-600",
    boardType: "rfp"
  },
  {
    value: "RFI",
    label: "RFI - Request for Information",
    description: "Information gathering opportunity",
    icon: Lightbulb,
    color: "from-purple-500 to-purple-600",
    boardType: "rfi"
  },
  {
    value: "SBIR",
    label: "SBIR/STTR",
    description: "Small Business Innovation Research",
    icon: Rocket,
    color: "from-green-500 to-green-600",
    boardType: "sbir"
  },
  {
    value: "GSA",
    label: "GSA Schedule",
    description: "General Services Administration contract",
    icon: Building2,
    color: "from-indigo-500 to-indigo-600",
    boardType: "gsa"
  },
  {
    value: "IDIQ",
    label: "IDIQ",
    description: "Indefinite Delivery/Indefinite Quantity",
    icon: FileCheck,
    color: "from-cyan-500 to-cyan-600",
    boardType: "idiq"
  },
  {
    value: "STATE_LOCAL",
    label: "State/Local Government",
    description: "State or local government opportunity",
    icon: MapPin,
    color: "from-orange-500 to-orange-600",
    boardType: "state_local"
  },
  {
    value: "OTHER",
    label: "Other",
    description: "General proposal or custom type",
    icon: HelpCircle,
    color: "from-slate-500 to-slate-600",
    boardType: "master"
  }
];

export default function NewProposalDialog({ isOpen, onClose, onCreateProposal }) {
  const navigate = useNavigate();
  const [proposalName, setProposalName] = useState("");
  const [selectedType, setSelectedType] = useState("RFP");

  const handleCreate = () => {
    if (!proposalName.trim()) {
      alert("Please enter a proposal name");
      return;
    }

    const selectedTypeData = PROPOSAL_TYPES.find(t => t.value === selectedType);
    
    onCreateProposal({
      proposal_name: proposalName,
      proposal_type_category: selectedType,
      board_type: selectedTypeData?.boardType || "master"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Proposal</DialogTitle>
          <DialogDescription>
            Choose the type of proposal to get started with the right workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="proposal-name">Proposal Name *</Label>
            <Input
              id="proposal-name"
              placeholder="e.g., DoD IT Services RFP Response"
              value={proposalName}
              onChange={(e) => setProposalName(e.target.value)}
              className="text-lg"
            />
          </div>

          <div className="space-y-3">
            <Label>Proposal Type *</Label>
            <RadioGroup value={selectedType} onValueChange={setSelectedType}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PROPOSAL_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.value;
                  
                  return (
                    <div
                      key={type.value}
                      className={cn(
                        "relative rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md",
                        isSelected
                          ? "border-blue-600 bg-blue-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                      onClick={() => setSelectedType(type.value)}
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br text-white",
                              type.color
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <label htmlFor={type.value} className="font-semibold text-slate-900 cursor-pointer">
                              {type.label}
                            </label>
                          </div>
                          <p className="text-sm text-slate-600">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <strong>Tip:</strong> Each proposal type has an optimized workflow. 
                You can always switch boards later to view all proposals together or by type.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Create Proposal
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}