
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROPOSAL_TYPES = [
  { value: 'RFP', label: 'RFP', icon: '📄', color: 'from-blue-400 to-blue-600' },
  { value: 'RFI', label: 'RFI', icon: '📝', color: 'from-purple-400 to-purple-600' }, // Changed icon here
  { value: 'SBIR', label: 'SBIR', icon: '💡', color: 'from-green-400 to-green-600' },
  { value: 'GSA', label: 'GSA', icon: '🏛️', color: 'from-amber-400 to-amber-600' },
  { value: 'IDIQ', label: 'IDIQ', icon: '📑', color: 'from-indigo-400 to-indigo-600' },
  { value: 'STATE_LOCAL', label: 'State/Local', icon: '🏙️', color: 'from-cyan-400 to-cyan-600' },
  { value: 'OTHER', label: 'Other', icon: '📊', color: 'from-slate-400 to-slate-600' }
];

export default function MobileProposalBuilder({ organization, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    proposal_type: '',
    proposal_name: '',
    solicitation_number: '',
    agency_name: '',
    project_title: '',
    due_date: '',
    contract_value: ''
  });

  const handleCreate = async () => {
    if (!formData.proposal_name.trim()) {
      alert('Please enter a proposal name');
      return;
    }

    setIsCreating(true);
    try {
      const proposal = await base44.entities.Proposal.create({
        organization_id: organization.id,
        proposal_type_category: formData.proposal_type,
        proposal_name: formData.proposal_name,
        solicitation_number: formData.solicitation_number || null,
        agency_name: formData.agency_name || null,
        project_title: formData.project_title || null,
        due_date: formData.due_date || null,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
        current_phase: 'phase1',
        status: 'evaluating',
        manual_order: 0
      });

      if (onSuccess) {
        onSuccess(proposal);
      }
      
      navigate(createPageUrl("ProposalBuilder") + `?proposal_id=${proposal.id}`);
    } catch (error) {
      console.error("Error creating proposal:", error);
      alert("Failed to create proposal. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedType = PROPOSAL_TYPES.find(t => t.value === formData.proposal_type);
  const canProceedStep1 = formData.proposal_type;
  const canProceedStep2 = formData.proposal_name.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button onClick={onClose} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">New Proposal</h1>
          <div className="w-10" />
        </div>
        
        {/* Progress Indicator */}
        <div className="flex px-4 pb-3">
          {[1, 2, 3].map(num => (
            <div key={num} className="flex-1 flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                step >= num ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
              )}>
                {step > num ? <Check className="w-4 h-4" /> : num}
              </div>
              {num < 3 && (
                <div className={cn(
                  "flex-1 h-1 mx-2",
                  step > num ? "bg-blue-600" : "bg-slate-200"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Step 1: Select Type */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Select Proposal Type</h2>
              <p className="text-sm text-slate-600">Choose the category that best fits</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PROPOSAL_TYPES.map(type => (
                <Card
                  key={type.value}
                  className={cn(
                    "cursor-pointer transition-all border-2",
                    formData.proposal_type === type.value
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-slate-200 active:scale-95"
                  )}
                  onClick={() => setFormData({...formData, proposal_type: type.value})}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-4xl mb-2">{type.icon}</div>
                    <p className="font-semibold text-sm text-slate-900">{type.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedType && (
              <Card className={`bg-gradient-to-r ${selectedType.color} border-none`}>
                <CardContent className="p-4 text-white">
                  <p className="font-semibold mb-1">Selected: {selectedType.label}</p>
                  <p className="text-sm opacity-90">Tap Next to continue</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Basic Information</h2>
              <p className="text-sm text-slate-600">Essential proposal details</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proposal_name" className="text-base">
                  Proposal Name *
                </Label>
                <Input
                  id="proposal_name"
                  value={formData.proposal_name}
                  onChange={(e) => setFormData({...formData, proposal_name: e.target.value})}
                  placeholder="Enter proposal name"
                  className="text-base h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="solicitation_number" className="text-base">
                  Solicitation Number
                </Label>
                <Input
                  id="solicitation_number"
                  value={formData.solicitation_number}
                  onChange={(e) => setFormData({...formData, solicitation_number: e.target.value})}
                  placeholder="e.g., W912DQ-24-R-0001"
                  className="text-base h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agency_name" className="text-base">
                  Agency/Organization
                </Label>
                <Input
                  id="agency_name"
                  value={formData.agency_name}
                  onChange={(e) => setFormData({...formData, agency_name: e.target.value})}
                  placeholder="e.g., Department of Defense"
                  className="text-base h-12"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Additional Details */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Additional Details</h2>
              <p className="text-sm text-slate-600">Optional information</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project_title" className="text-base">
                  Project Title
                </Label>
                <Input
                  id="project_title"
                  value={formData.project_title}
                  onChange={(e) => setFormData({...formData, project_title: e.target.value})}
                  placeholder="Enter project title"
                  className="text-base h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-base">
                  Due Date
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="text-base h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract_value" className="text-base">
                  Contract Value (USD)
                </Label>
                <Input
                  id="contract_value"
                  type="number"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({...formData, contract_value: e.target.value})}
                  placeholder="e.g., 500000"
                  className="text-base h-12"
                />
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Ready to Create</p>
                    <p className="text-xs">Your proposal will be created and added to the pipeline</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="flex items-center justify-between gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isCreating}
              className="flex-1 h-12"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : step === 2 ? !canProceedStep2 : false}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={isCreating || !canProceedStep2}
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Proposal
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
