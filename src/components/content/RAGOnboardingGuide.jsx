import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  FileText, 
  Target,
  TrendingUp,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  Database,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * RAG Onboarding Guide
 * Interactive walkthrough of RAG features for new users
 */
export default function RAGOnboardingGuide({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Sparkles,
      title: "Welcome to AI-Enhanced Proposals",
      description: "Learn how our RAG (Retrieval-Augmented Generation) system creates better proposals using your past wins.",
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
            <h4 className="font-semibold text-purple-900 mb-2">What is RAG?</h4>
            <p className="text-sm text-purple-800">
              RAG combines AI language models with your organization's knowledge base. Instead of generic content, 
              the AI generates proposals using proven approaches from your past successful proposals.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-green-200">
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs font-semibold text-green-900">More Accurate</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200">
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs font-semibold text-blue-900">Faster</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200">
              <CardContent className="p-3 text-center">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Star className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs font-semibold text-purple-900">Higher Quality</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      icon: FileText,
      title: "Step 1: Build Your Reference Library",
      description: "The system learns from your winning proposals to generate better content.",
      content: (
        <div className="space-y-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                What Makes a Good Reference?
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Won proposals</strong> - Proven successful approaches</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Same agency</strong> - Familiar with requirements style</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Similar type</strong> - RFP, SBIR, etc.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Recent</strong> - Current best practices</span>
                </li>
              </ul>
            </CardContent>
          </Card>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-900">
              💡 <strong>Pro Tip:</strong> Start with 3-5 strong reference proposals. Quality over quantity!
            </p>
          </div>
        </div>
      )
    },
    {
      icon: Sparkles,
      title: "Step 2: Smart Reference Selection",
      description: "Our AI automatically scores and recommends the best references for each proposal.",
      content: (
        <div className="space-y-4">
          <Card className="border-purple-200">
            <CardContent className="p-4">
              <h4 className="font-semibold text-purple-900 mb-3">How It Works:</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="bg-purple-600 mt-0.5">1</Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-900">AI Analysis</p>
                    <p className="text-xs text-slate-600">System analyzes agency, type, and past performance</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="bg-purple-600 mt-0.5">2</Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Relevance Scoring</p>
                    <p className="text-xs text-slate-600">Each reference gets a 0-100 relevance score</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="bg-purple-600 mt-0.5">3</Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Auto-Selection</p>
                    <p className="text-xs text-slate-600">Best matches automatically selected (or pick manually)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },
    {
      icon: TrendingUp,
      title: "Step 3: Quality Feedback Loop",
      description: "Rate generated content to help the system continuously improve.",
      content: (
        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <Star className="w-4 h-4" />
                Why Rate Content?
              </h4>
              <p className="text-sm text-green-800 mb-3">
                Your ratings train the system to understand what works for your organization:
              </p>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-green-600">⭐⭐⭐⭐⭐</span>
                  <span>System prioritizes these references in future</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-600">⭐⭐⭐</span>
                  <span>System adjusts weighting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-red-600">⭐⭐</span>
                  <span>System learns what to avoid</span>
                </li>
              </ul>
            </CardContent>
          </Card>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              📊 The more you rate, the smarter the system becomes!
            </p>
          </div>
        </div>
      )
    },
    {
      icon: Zap,
      title: "Step 4: Monitor & Optimize",
      description: "Track performance and optimize your RAG system for best results.",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-blue-200">
              <CardContent className="p-3">
                <Database className="w-6 h-6 text-blue-600 mb-2" />
                <h5 className="text-sm font-semibold mb-1">System Health</h5>
                <p className="text-xs text-slate-600">Check RAG system status and optimization opportunities</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200">
              <CardContent className="p-3">
                <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
                <h5 className="text-sm font-semibold mb-1">Performance</h5>
                <p className="text-xs text-slate-600">View quality metrics and improvement trends</p>
              </CardContent>
            </Card>
            <Card className="border-green-200">
              <CardContent className="p-3">
                <Settings className="w-6 h-6 text-green-600 mb-2" />
                <h5 className="text-sm font-semibold mb-1">AI Config</h5>
                <p className="text-xs text-slate-600">Customize tone, style, and generation settings</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200">
              <CardContent className="p-3">
                <Zap className="w-6 h-6 text-amber-600 mb-2" />
                <h5 className="text-sm font-semibold mb-1">Token Budget</h5>
                <p className="text-xs text-slate-600">Monitor usage and optimize costs</p>
              </CardContent>
            </Card>
          </div>
          <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-4">
              <h4 className="font-bold text-purple-900 mb-2">🎯 Quick Start Checklist:</h4>
              <ul className="space-y-1 text-sm text-purple-800">
                <li>✓ Mark 3+ proposals as "Won"</li>
                <li>✓ Use Smart Reference Selector</li>
                <li>✓ Generate your first AI section</li>
                <li>✓ Rate the generated content</li>
                <li>✓ Check System Health dashboard</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      if (onComplete) onComplete();
      onClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">{currentStepData.title}</DialogTitle>
              <DialogDescription>{currentStepData.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-2 rounded-full flex-1 transition-all",
                  idx <= currentStep ? "bg-purple-600" : "bg-slate-200"
                )}
              />
            ))}
          </div>

          {/* Step Content */}
          {currentStepData.content}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button onClick={handleNext} className="bg-gradient-to-r from-purple-600 to-pink-600">
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}