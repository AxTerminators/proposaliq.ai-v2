import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  ArrowRight,
  FileText,
  Calendar,
  Award,
  Briefcase,
  Database,
  Rocket,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OnboardingGuide() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [isSkippingSample, setIsSkippingSample] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const handleNext = () => {
    console.log('[OnboardingGuide] Current step:', currentStep);
    const nextStep = currentStep + 1;
    console.log('[OnboardingGuide] Setting next step to:', nextStep);
    setCurrentStep(nextStep);
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddSampleData = async () => {
    setIsGeneratingSample(true);
    try {
      await base44.functions.invoke('generateSampleData', {});
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error("Error generating sample data:", error);
      alert("There was an error generating sample data. Please try again.");
      setIsGeneratingSample(false);
    }
  };

  const handleBypassSampleData = async () => {
    setIsSkippingSample(true);
    try {
      await base44.auth.updateMe({
        skipped_sample_data: true,
        onboarding_guide_completed: true
      });
      navigate(createPageUrl("Onboarding"));
    } catch (error) {
      console.error("Error updating user:", error);
      alert("There was an error. Please try again.");
      setIsSkippingSample(false);
    }
  };

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  console.log('[OnboardingGuide] Rendering with currentStep:', currentStep);

  // Step content configuration
  const stepContent = {
    1: {
      icon: Sparkles,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      title: "Welcome to ProposalIQ.ai!",
      description: "Your AI-powered proposal management platform that helps you win more government contracts."
    },
    2: {
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      title: "Explore the Pipeline",
      description: "Visualize and manage all your proposals in one place with our Kanban-style board."
    },
    3: {
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-50",
      title: "Track Tasks & Deadlines",
      description: "Keep your team aligned with task management and automated deadline reminders."
    },
    4: {
      icon: Award,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      title: "Leverage Past Performance",
      description: "Store and reuse your past project successes to strengthen future proposals."
    },
    5: {
      icon: Briefcase,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      title: "Build Your Resource Library",
      description: "Save time with reusable templates, boilerplate content, and team resources."
    }
  };

  const renderStep = () => {
    // Steps 1-5: Information slides
    if (currentStep >= 1 && currentStep <= 5) {
      const step = stepContent[currentStep];
      const Icon = step.icon;

      return (
        <>
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", step.bgColor)}>
            <Icon className={cn("w-8 h-8", step.color)} />
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-4">{step.title}</h2>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">{step.description}</p>

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
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index + 1}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    (index + 1) === currentStep ? "bg-blue-600 w-8" : "bg-slate-300"
                  )}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              size="lg"
            >
              Next
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </>
      );
    }

    // Step 6: Choice step
    if (currentStep === 6) {
      console.log('[OnboardingGuide] Rendering CHOICE STEP');
      return (
        <>
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
            <Rocket className="w-8 h-8 text-rose-600" />
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            Choose how you'd like to begin your ProposalIQ journey.
          </p>

          <div className="space-y-4">
            <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all bg-gradient-to-br from-blue-50 to-indigo-50 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      Add Sample Data to Learn ProposalIQ
                    </h3>
                    <p className="text-slate-600 mb-4">
                      We'll populate your account with sample proposals, tasks, and resources so you can explore 
                      all features hands-on. Perfect if you want to learn by doing.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-amber-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Note:</strong> You won't be able to add real data until sample data is cleared. 
                          All sample data is clearly marked with (SAMPLE) badges.
                        </span>
                      </p>
                    </div>
                    <Button
                      onClick={handleAddSampleData}
                      disabled={isGeneratingSample || isSkippingSample}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      {isGeneratingSample ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Generating Sample Data...
                        </>
                      ) : (
                        <>
                          <Database className="w-5 h-5 mr-2" />
                          Add Sample Data & Explore
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 hover:border-green-400 transition-all bg-gradient-to-br from-green-50 to-emerald-50 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Rocket className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      Bypass Sample Data - I'm Ready to Go
                    </h3>
                    <p className="text-slate-600 mb-4">
                      Skip the sample data and jump straight into setting up your organization and creating 
                      your first real proposal. Perfect if you're already familiar with similar tools.
                    </p>
                    <Button
                      onClick={handleBypassSampleData}
                      disabled={isGeneratingSample || isSkippingSample}
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      {isSkippingSample ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Setting Up...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-5 h-5 mr-2" />
                          Start Fresh - No Sample Data
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      );
    }

    // Fallback for any other step
    return (
      <div className="text-center">
        <p className="text-slate-600">Invalid step: {currentStep}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome to ProposalIQ.ai!</h1>
          <p className="text-lg text-slate-600">Let's get you started in just a few steps</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700">
              Step {currentStep} of {totalSteps}
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

        <Card className="border-none shadow-2xl mb-6">
          <CardContent className="p-12">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Debug info (remove in production) */}
        <div className="text-center text-xs text-slate-400 mt-4">
          Debug: Current Step = {currentStep}, Total Steps = {totalSteps}
        </div>
      </div>
    </div>
  );
}