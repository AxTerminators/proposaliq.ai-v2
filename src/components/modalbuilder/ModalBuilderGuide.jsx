import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, X, HelpCircle } from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Modal Builder',
    description: 'This guided tour will help you create powerful, dynamic forms for your proposals. Let\'s get started!',
    target: null,
  },
  {
    id: 'basic-info',
    title: 'Step 1: Basic Information',
    description: 'Start by giving your modal a clear name and description. Choose an emoji icon to help identify it quickly.',
    target: 'basic-info-section',
    highlightRequired: ['name', 'description'],
  },
  {
    id: 'fields',
    title: 'Step 2: Add Form Fields',
    description: 'Drag field types from the palette on the left or click them to add to your form. Then configure each field\'s properties.',
    target: 'fields-tab',
    highlightRequired: ['field-palette', 'canvas-area'],
  },
  {
    id: 'field-config',
    title: 'Step 3: Configure Fields',
    description: 'Click on any field in the canvas to edit its properties: label, placeholder, validation rules, and more.',
    target: 'canvas-area',
  },
  {
    id: 'steps',
    title: 'Step 4: Multi-Step Forms (Optional)',
    description: 'Create multi-step forms by organizing your fields into logical sections. This is optional for simple forms.',
    target: 'steps-tab',
  },
  {
    id: 'operations',
    title: 'Step 5: Entity Operations',
    description: 'Define what happens when the form is submitted: create/update database records, send webhooks, or trigger emails.',
    target: 'operations-tab',
    highlightRequired: ['entity-operations'],
  },
  {
    id: 'validation',
    title: 'Step 6: Check Completion Status',
    description: 'Use the health indicator in the top-right to see what\'s missing. Green checkmarks mean you\'re ready to save!',
    target: 'health-indicator',
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    description: 'Click "Save Modal" when all required sections are complete. You can restart this tour anytime from the help button.',
    target: null,
  },
];

export default function ModalBuilderGuide({ isOpen, onClose, onStepChange }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);
  const [highlightRect, setHighlightRect] = useState(null);

  useEffect(() => {
    // Check if user has seen guide before
    const seen = localStorage.getItem('hasSeenModalBuilderGuide');
    if (seen === 'true') {
      setHasSeenGuide(true);
    }
  }, []);

  useEffect(() => {
    if (onStepChange && isOpen) {
      onStepChange(TOUR_STEPS[currentStep]);
    }

    // Highlight target element with delay to ensure DOM is ready
    if (isOpen && TOUR_STEPS[currentStep].target) {
      setTimeout(() => {
        const element = document.getElementById(TOUR_STEPS[currentStep].target);
        if (element) {
          const rect = element.getBoundingClientRect();
          setHighlightRect({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height
          });
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          console.warn(`Element not found: ${TOUR_STEPS[currentStep].target}`);
          setHighlightRect(null);
        }
      }, 100);
    } else {
      setHighlightRect(null);
    }
  }, [currentStep, isOpen, onStepChange]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenModalBuilderGuide', 'true');
    setHasSeenGuide(true);
    setCurrentStep(0);
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenModalBuilderGuide', 'true');
    setHasSeenGuide(true);
    setCurrentStep(0);
    onClose();
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <>
      {/* Spotlight overlay with cutout */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 pointer-events-none"
          style={{
            background: highlightRect 
              ? `radial-gradient(
                  circle at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px,
                  transparent ${Math.max(highlightRect.width, highlightRect.height) / 2 + 20}px,
                  rgba(0, 0, 0, 0.7) ${Math.max(highlightRect.width, highlightRect.height) / 2 + 80}px
                )`
              : 'rgba(0, 0, 0, 0.7)'
          }}
        >
          {/* Animated pulsing border around highlighted element */}
          {highlightRect && (
            <>
              <div
                className="absolute border-4 border-blue-500 rounded-lg animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                style={{
                  top: highlightRect.top - 8,
                  left: highlightRect.left - 8,
                  width: highlightRect.width + 16,
                  height: highlightRect.height + 16,
                }}
              />
              {/* Arrow pointing from guide to target */}
              <svg
                className="absolute"
                style={{
                  top: highlightRect.top + highlightRect.height / 2 - 2,
                  left: highlightRect.left + highlightRect.width + 20,
                  width: '100px',
                  height: '4px',
                }}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                  </marker>
                </defs>
                <line
                  x1="0"
                  y1="2"
                  x2="90"
                  y2="2"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  markerEnd="url(#arrowhead)"
                />
              </svg>
            </>
          )}
        </div>
      )}

      {/* Compact floating guide card */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[60] max-w-md pointer-events-auto">
          <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                <span className="text-xs text-slate-500">
                  Step {currentStep + 1} of {TOUR_STEPS.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              {step.description}
            </p>

            {/* Progress indicator */}
            <div className="flex gap-1 mb-4">
              {TOUR_STEPS.map((s, idx) => (
                <div
                  key={s.id}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    idx === currentStep
                      ? 'bg-blue-600'
                      : idx < currentStep
                      ? 'bg-blue-300'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-slate-500 text-xs"
                size="sm"
              >
                Skip Tour
              </Button>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handleBack} size="sm">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
                <Button onClick={handleNext} size="sm">
                  {currentStep === TOUR_STEPS.length - 1 ? (
                    'Get Started'
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper component to trigger guide from anywhere
export function GuideButton({ onClick }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="gap-2"
    >
      <HelpCircle className="w-4 h-4" />
      Guide
    </Button>
  );
}