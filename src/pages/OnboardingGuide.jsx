
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  Users,
  Calendar,
  Award,
  Briefcase,
  Trash2,
  AlertCircle,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: "Welcome to ProposalIQ.ai!",
    description: "We've pre-populated your account with sample data so you can explore all features immediately.",
    icon: Sparkles,
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    id: 2,
    title: "Explore Your Sample Proposals",
    description: "Navigate to the Pipeline to see 3 sample proposals in different stages. Click on one to explore the Proposal Builder.",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    action: "Go to Pipeline",
    actionUrl: "Pipeline"
  },
  {
    id: 3,
    title: "Check Out Sample Tasks",
    description: "Visit the Tasks page to see how you can track proposal-related work and assign responsibilities.",
    icon: Calendar,
    color: "text-green-600",
    bgColor: "bg-green-50",
    action: "View Tasks",
    actionUrl: "Tasks"
  },
  {
    id: 4,
    title: "Review Past Performance",
    description: "See how you can store and leverage past project successes in future proposals.",
    icon: Award,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    action: "View Past Performance",
    actionUrl: "PastPerformance"
  },
  {
    id: 5,
    title: "Explore Resources & Templates",
    description: "Check out the sample resources and templates that can accelerate your proposal writing.",
    icon: Briefcase,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    action: "View Resources",
    actionUrl: "Resources"
  }
];

export default function OnboardingGuide() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
          setIsSuperAdmin(currentUser?.admin_role === 'super_admin');
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // Don't redirect - allow page to load for everyone
      } finally {
        // CRITICAL: Always set loading to false
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipGuide = async () => {
    if (!isAuthenticated) {
      alert("Please log in to continue.");
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
      return;
    }

    try {
      await base44.auth.updateMe({
        onboarding_guide_completed: true
      });
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error("Error updating user:", error);
      alert("There was an error skipping the guide. Please try again.");
    }
  };

  const handleClearSampleData = async () => {
    if (!isAuthenticated) {
      alert("Please log in to continue.");
      base44.auth.redirectToLogin(createPageUrl("Onboarding"));
      return;
    }

    setIsClearing(true);
    try {
      // Call backend function to clear all sample data
      await base44.functions.invoke('clearSampleData', {});
      
      // Update user flags
      await base44.auth.updateMe({
        onboarding_guide_completed: true,
        sample_data_cleared: true
      });

      // Redirect to the real onboarding page
      navigate(createPageUrl("Onboarding"));
    } catch (error) {
      console.error("Error clearing sample data:", error);
      alert("There was an error clearing sample data. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleActionClick = (actionUrl) => {
    if (actionUrl) {
      navigate(createPageUrl(actionUrl));
    }
  };

  const currentStepData = ONBOARDING_STEPS[currentStep - 1];
  const Icon = currentStepData.icon;
  const progress = (currentStep / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Super Admin Banner */}
        {isSuperAdmin && (
          <div className="bg-red-600 text-white px-6 py-3 mb-6 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5" />
              <div>
                <p className="font-semibold">Super Admin Preview Mode</p>
                <p className="text-sm text-red-100">Viewing onboarding guide</p>
              </div>
            </div>
            <Button 
              size="sm" 
              className="bg-white text-red-600 hover:bg-red-50"
              onClick={() => navigate(createPageUrl("AdminPortal") + "?tab=admin-pages")}
            >
              Back to Admin
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome to ProposalIQ.ai!</h1>
          <p className="text-lg text-slate-600">Let's take a quick tour of your new workspace</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">
              Step {currentStep} of {ONBOARDING_STEPS.length}
            </span>
            <span className="text-sm text-slate-600">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <Card className="border-none shadow-2xl mb-6">
          <CardContent className="p-12">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", currentStepData.bgColor)}>
              <Icon className={cn("w-8 h-8", currentStepData.color)} />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              {currentStepData.title}
            </h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              {currentStepData.description}
            </p>

            {currentStep === 1 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-2">All Data is Marked as "SAMPLE"</h3>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      Every piece of data (proposals, clients, tasks, etc.) in your account is clearly marked with a 
                      <Badge className="bg-amber-100 text-amber-700 mx-1">SAMPLE</Badge>
                      badge. This helps you distinguish between demo data and real data you'll create later.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStepData.action && (
              <Button
                onClick={() => handleActionClick(currentStepData.actionUrl)}
                className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                size="lg"
              >
                {currentStepData.action}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                size="lg"
              >
                Previous
              </Button>

              <div className="flex gap-2">
                {ONBOARDING_STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      step.id === currentStep ? "bg-blue-600 w-8" : "bg-slate-300"
                    )}
                  />
                ))}
              </div>

              {currentStep < ONBOARDING_STEPS.length ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  Next
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => setShowClearConfirmation(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  size="lg"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Finish Tour
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip Button */}
        <div className="text-center">
          <Button variant="ghost" onClick={handleSkipGuide} className="text-slate-600">
            Skip guide and explore on my own
          </Button>
        </div>

        {/* Clear Sample Data Confirmation Dialog */}
        {showClearConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <Card className="max-w-2xl w-full border-none shadow-2xl">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      Ready to Start Fresh?
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      Great! Now that you've explored the features with sample data, let's clear it and set up your 
                      actual organization and first proposal.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-3">What will happen:</h4>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>All sample data will be removed (proposals, tasks, clients, etc.)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>You'll be guided to create your real organization profile</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Sample templates will remain available for your use</span>
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowClearConfirmation(false)}
                    className="flex-1"
                    size="lg"
                    disabled={isClearing}
                  >
                    Not Yet, Keep Exploring
                  </Button>
                  <Button
                    onClick={handleClearSampleData}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    size="lg"
                    disabled={isClearing}
                  >
                    {isClearing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Clear Sample Data & Continue
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
