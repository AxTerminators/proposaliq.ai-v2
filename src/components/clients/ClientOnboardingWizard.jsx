import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import Step1BasicProfile from "./onboarding/Step1BasicProfile";
import Step2EngagementPreferences from "./onboarding/Step2EngagementPreferences";
import Step3PrimaryStakeholder from "./onboarding/Step3PrimaryStakeholder";
import Step4CustomBranding from "./onboarding/Step4CustomBranding";
import Step5ResourcePrePopulation from "./onboarding/Step5ResourcePrePopulation";
import Step6ReviewConfirm from "./onboarding/Step6ReviewConfirm";

const STEPS = [
  { id: 1, label: "Basic Profile", component: Step1BasicProfile },
  { id: 2, label: "Engagement", component: Step2EngagementPreferences },
  { id: 3, label: "Primary Contact", component: Step3PrimaryStakeholder },
  { id: 4, label: "Branding", component: Step4CustomBranding },
  { id: 5, label: "Resources", component: Step5ResourcePrePopulation },
  { id: 6, label: "Review", component: Step6ReviewConfirm },
];

const STORAGE_KEY = 'client_onboarding_draft';

export default function ClientOnboardingWizard({ 
  isOpen, 
  onClose, 
  consultingFirm,
  onSuccess 
}) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    organization_name: "",
    contact_name: "",
    contact_email: "",
    address: "",
    website_url: "",
    uei: "",
    cage_code: "",
    primary_naics: "",
    secondary_naics: [],
    organization_industry: "",
    organization_size: "",
    market_segments: [],
    key_certifications: [],
    mission_statement: "",
    current_challenges: [],
    strategic_goals: [],
    competition_landscape: [],
    preferred_proposal_formats: [],
    typical_review_cycle_duration: null,
    decision_making_process_notes: "",
    custom_branding: {
      logo_url: "",
      primary_color: "#3B82F6",
      welcome_message: ""
    },
    primary_stakeholder: {
      member_name: "",
      member_email: "",
      member_title: "",
      department: "",
      team_role: "owner",
      decision_authority_level: "high",
      influence_level: "high",
      technical_expertise_areas: [],
      budget_oversight: false
    },
    initial_resources: []
  });

  // Load draft from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const draft = localStorage.getItem(STORAGE_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          setFormData(parsed);
          toast.info('📋 Draft restored from previous session');
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, [isOpen]);

  // Save draft to localStorage
  useEffect(() => {
    if (isOpen && formData.organization_name) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      } catch (error) {
        console.error('Error saving draft:', error);
      }
    }
  }, [formData, isOpen]);

  const createClientMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('onboardClientOrganization', {
        consulting_firm_id: consultingFirm.id,
        organization_data: {
          ...formData,
          _consulting_firm_name: consultingFirm.organization_name
        },
        primary_stakeholder: formData.primary_stakeholder,
        project_history: [],
        initial_resources: formData.initial_resources
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create client organization');
      }

      return response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['client-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['org-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-organizations'] });

      // Clear draft
      localStorage.removeItem(STORAGE_KEY);

      toast.success(`✅ ${result.organization.organization_name} workspace created!`);
      
      if (onSuccess) {
        onSuccess(result.organization);
      }
      
      handleClose();
    },
    onError: (error) => {
      toast.error("Failed to create workspace: " + error.message);
    }
  });

  const handleClose = () => {
    setCurrentStep(1);
    onClose();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    createClientMutation.mutate();
  };

  const CurrentStepComponent = STEPS[currentStep - 1].component;
  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Create Client Workspace
          </DialogTitle>
          
          {/* Progress Indicator */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Step {currentStep} of {STEPS.length}
              </p>
              <Badge variant="secondary">
                {Math.round(progressPercentage)}% Complete
              </Badge>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            
            {/* Step Labels */}
            <div className="flex justify-between">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center flex-1 ${
                    step.id < currentStep ? 'text-green-600' :
                    step.id === currentStep ? 'text-blue-600' :
                    'text-slate-400'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    step.id < currentStep ? 'bg-green-100' :
                    step.id === currentStep ? 'bg-blue-100' :
                    'bg-slate-100'
                  }`}>
                    {step.id < currentStep ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span className="font-semibold text-sm">{step.id}</span>
                    )}
                  </div>
                  <p className="text-xs font-medium hidden md:block text-center">
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          <CurrentStepComponent
            formData={formData}
            setFormData={setFormData}
            consultingFirm={consultingFirm}
            onNext={handleNext}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isSubmitting={createClientMutation.isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}