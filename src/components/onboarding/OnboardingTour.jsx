import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Check, Sparkles, FileText, Users, Calendar, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Interactive Onboarding Tour
 * Guides new users through key features
 */

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to ProposalIQ.ai! 🎉',
    description: 'Let\'s take a quick tour of the platform. You\'ll be creating winning proposals in no time!',
    icon: Sparkles,
    position: 'center',
    highlightElement: null,
    action: null
  },
  {
    id: 'dashboard',
    title: 'Your Command Center',
    description: 'This is your dashboard. Here you can see all your proposals, recent activity, and quick actions.',
    icon: FileText,
    position: 'top-right',
    highlightElement: '.dashboard-overview',
    action: {
      label: 'Got it!',
      type: 'next'
    }
  },
  {
    id: 'create_proposal',
    title: 'Create Your First Proposal',
    description: 'Click here to start a new proposal. Our AI will guide you through each phase of the process.',
    icon: FileText,
    position: 'bottom-left',
    highlightElement: '.create-proposal-button',
    action: {
      label: 'Show me how',
      type: 'highlight'
    }
  },
  {
    id: 'ai_features',
    title: 'AI-Powered Writing',
    description: 'Our AI can generate entire sections of your proposal based on solicitation documents, past performance, and win themes.',
    icon: Sparkles,
    position: 'center',
    highlightElement: null,
    action: {
      label: 'Sounds amazing!',
      type: 'next'
    }
  },
  {
    id: 'collaboration',
    title: 'Team Collaboration',
    description: 'Invite team members, assign tasks, and collaborate in real-time. Everyone stays in sync.',
    icon: Users,
    position: 'top-left',
    highlightElement: '.team-section',
    action: {
      label: 'Perfect!',
      type: 'next'
    }
  },
  {
    id: 'calendar_tasks',
    title: 'Never Miss a Deadline',
    description: 'Track proposal deadlines, milestones, and team tasks all in one place.',
    icon: Calendar,
    position: 'top-right',
    highlightElement: '.calendar-link',
    action: {
      label: 'Love it!',
      type: 'next'
    }
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'Ready to create winning proposals? Let\'s get started!',
    icon: Check,
    position: 'center',
    highlightElement: null,
    action: {
      label: 'Start Creating',
      type: 'complete'
    }
  }
];

export default function OnboardingTour({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour
    const tourCompleted = localStorage.getItem(`tour_completed_${user?.email}`);
    
    if (!tourCompleted && user) {
      // Small delay before showing tour
      setTimeout(() => {
        setIsVisible(true);
      }, 1000);
    } else {
      setHasSeenTour(true);
    }
  }, [user]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      highlightElement(TOUR_STEPS[currentStep + 1].highlightElement);
    } else {
      completeTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      highlightElement(TOUR_STEPS[currentStep - 1].highlightElement);
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const completeTour = () => {
    setIsVisible(false);
    localStorage.setItem(`tour_completed_${user?.email}`, 'true');
    setHasSeenTour(true);
    
    if (onComplete) {
      onComplete();
    }
  };

  const highlightElement = (selector) => {
    // Remove previous highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });

    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        element.classList.add('tour-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  if (hasSeenTour || !isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={handleSkip}
      />

      {/* Tour Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`fixed z-50 ${getPositionClasses(step.position)}`}
        >
          <Card className="w-96 border-none shadow-2xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                      Step {currentStep + 1} of {TOUR_STEPS.length}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkip}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-4">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </CardHeader>

            <CardContent>
              <CardDescription className="text-base mb-6">
                {step.description}
              </CardDescription>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>

                <div className="flex gap-2">
                  {currentStep < TOUR_STEPS.length - 1 && (
                    <Button
                      variant="outline"
                      onClick={handleSkip}
                    >
                      Skip Tour
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 gap-2"
                  >
                    {step.action?.label || 'Next'}
                    {currentStep < TOUR_STEPS.length - 1 ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Inline styles for highlight effect */}
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 51 !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          animation: pulse-highlight 2s ease-in-out infinite;
        }

        @keyframes pulse-highlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.7), 0 0 30px rgba(59, 130, 246, 0.5);
          }
        }
      `}</style>
    </>
  );
}

// Helper to get position classes
function getPositionClasses(position) {
  switch (position) {
    case 'top-left':
      return 'top-24 left-8';
    case 'top-right':
      return 'top-24 right-8';
    case 'bottom-left':
      return 'bottom-8 left-8';
    case 'bottom-right':
      return 'bottom-8 right-8';
    case 'center':
    default:
      return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
  }
}

// Quick Tour Trigger Button (can be placed in settings or help menu)
export function TourTriggerButton({ user, onStart }) {
  const [isTourActive, setIsTourActive] = useState(false);

  const restartTour = () => {
    localStorage.removeItem(`tour_completed_${user?.email}`);
    setIsTourActive(true);
    if (onStart) onStart();
    // Reload to show tour
    window.location.reload();
  };

  return (
    <Button
      variant="outline"
      onClick={restartTour}
      className="gap-2"
    >
      <Sparkles className="w-4 h-4" />
      Take Product Tour
    </Button>
  );
}