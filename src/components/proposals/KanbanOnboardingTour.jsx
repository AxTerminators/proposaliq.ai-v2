import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles,
  MousePointer,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TOUR_STEPS = [
  {
    title: "Welcome to Your Kanban Board! 🎉",
    description: "Your workflow is now set up with intelligent automation and visual management. Let's take a quick tour of the powerful features.",
    icon: Sparkles,
    image: null,
    highlights: []
  },
  {
    title: "Smart Checklists",
    description: "Each column has a custom checklist that guides you through required actions. System checks auto-complete, manual checks you control, and AI triggers provide intelligent insights.",
    icon: CheckCircle2,
    image: null,
    highlights: ["checklist_items", "action_required"]
  },
  {
    title: "Drag & Drop Workflow",
    description: "Simply drag proposals between columns to move them through your workflow. The system will automatically update status, reset checklists, and trigger any configured automation rules.",
    icon: MousePointer,
    image: null,
    highlights: ["drag_drop"]
  },
  {
    title: "WIP Limits & Flow Control",
    description: "Columns can have Work-In-Progress limits to prevent bottlenecks. Hard limits block moves, while soft limits warn you when capacity is reached.",
    icon: BarChart3,
    image: null,
    highlights: ["wip_limits"]
  },
  {
    title: "Approval Gates",
    description: "Critical stages can require approval before moving proposals forward. This ensures quality control and proper review of important deliverables.",
    icon: Shield,
    image: null,
    highlights: ["approval_gates"]
  },
  {
    title: "Intelligent Automation",
    description: "Behind the scenes, automation rules monitor your proposals and take actions based on triggers like status changes, due dates, or checklist completion. No manual work required!",
    icon: Zap,
    image: null,
    highlights: ["automation"]
  }
];

export default function KanbanOnboardingTour({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const currentStepData = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem('kanban_tour_completed', 'true');
    }
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('kanban_tour_completed', 'true');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Kanban Board Tour</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2">
            {TOUR_STEPS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentStep ? "w-8 bg-blue-600" : "w-2 bg-slate-300"
                )}
              />
            ))}
          </div>

          {/* Content */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Icon className="w-8 h-8 text-white" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {currentStepData.title}
                  </h2>
                  <p className="text-slate-600 text-lg max-w-lg mx-auto">
                    {currentStepData.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Highlights */}
          {currentStepData.highlights.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {currentStepData.highlights.map((highlight, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium text-slate-700">
                      {highlight.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              {isFirstStep && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                >
                  Skip Tour
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isLastStep && (
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="rounded"
                  />
                  Don't show again
                </label>
              )}
              
              <Button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}