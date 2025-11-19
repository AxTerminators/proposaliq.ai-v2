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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles,
  FileText,
  Database,
  Settings,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Quality Check Modal
 * Pre-generation checklist and post-generation quality validation
 */
export default function QualityCheckModal({
  isOpen,
  onClose,
  onProceed,
  mode = 'pre', // 'pre' or 'post'
  checkResults = {},
  generatedContent = null
}) {
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState(false);

  // Pre-generation checks
  const preChecks = {
    hasReferences: {
      label: 'Reference proposals selected',
      passed: checkResults.hasReferences || false,
      required: false,
      message: 'Using references improves AI generation quality'
    },
    hasSolicitation: {
      label: 'Solicitation documents uploaded',
      passed: checkResults.hasSolicitation || false,
      required: false,
      message: 'Solicitation context helps meet requirements'
    },
    hasAiConfig: {
      label: 'AI configuration active',
      passed: checkResults.hasAiConfig || false,
      required: true,
      message: 'AI settings are required for generation'
    },
    withinTokenBudget: {
      label: 'Within token budget',
      passed: checkResults.withinTokenBudget !== false,
      required: true,
      message: 'Token usage is within acceptable limits'
    }
  };

  // Post-generation checks
  const postChecks = {
    meetsWordCount: {
      label: 'Meets word count requirements',
      passed: checkResults.meetsWordCount || false,
      required: false,
      message: generatedContent?.word_count 
        ? `Generated ${generatedContent.word_count} words`
        : 'Word count not available'
    },
    hasConfidence: {
      label: 'Confidence score acceptable',
      passed: (checkResults.confidence_score || 0) >= 60,
      required: false,
      message: checkResults.confidence_score 
        ? `Confidence: ${checkResults.confidence_score}%`
        : 'No confidence score available'
    },
    noHighIssues: {
      label: 'No critical compliance issues',
      passed: (checkResults.highComplianceIssues || 0) === 0,
      required: false,
      message: checkResults.highComplianceIssues > 0
        ? `${checkResults.highComplianceIssues} high-severity issues found`
        : 'No critical issues detected'
    },
    hasContent: {
      label: 'Content generated successfully',
      passed: !!generatedContent?.content,
      required: true,
      message: 'Content was generated without errors'
    }
  };

  const checks = mode === 'pre' ? preChecks : postChecks;
  const checkItems = Object.entries(checks);
  
  const requiredChecks = checkItems.filter(([_, c]) => c.required);
  const optionalChecks = checkItems.filter(([_, c]) => !c.required);
  
  const requiredPassed = requiredChecks.every(([_, c]) => c.passed);
  const optionalPassed = optionalChecks.filter(([_, c]) => c.passed).length;
  const optionalTotal = optionalChecks.length;
  
  const hasWarnings = !requiredPassed || optionalPassed < optionalTotal;
  const canProceed = requiredPassed && (!hasWarnings || acknowledgedWarnings);

  const getCheckIcon = (check) => {
    if (check.passed) {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    } else if (check.required) {
      return <XCircle className="w-5 h-5 text-red-600" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-amber-600" />;
    }
  };

  const qualityScore = Math.round(
    ((requiredChecks.filter(([_, c]) => c.passed).length / requiredChecks.length) * 70) +
    ((optionalPassed / optionalTotal) * 30)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'pre' ? (
              <>
                <Settings className="w-5 h-5" />
                Pre-Generation Quality Check
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                Post-Generation Quality Review
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'pre' 
              ? 'Review requirements before generating AI content'
              : 'Validate generated content quality before saving'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quality Score */}
          <Card className={cn(
            "border-2",
            qualityScore >= 80 && "border-green-200 bg-green-50",
            qualityScore >= 60 && qualityScore < 80 && "border-amber-200 bg-amber-50",
            qualityScore < 60 && "border-red-200 bg-red-50"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Quality Score</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {requiredChecks.filter(([_, c]) => c.passed).length}/{requiredChecks.length} required • {optionalPassed}/{optionalTotal} optional
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{qualityScore}</p>
                  <p className="text-xs text-slate-600">/ 100</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Required Checks */}
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              Required Checks
            </h3>
            <div className="space-y-2">
              {requiredChecks.map(([key, check]) => (
                <Card key={key} className={cn(
                  "border",
                  check.passed ? "border-green-200" : "border-red-200"
                )}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {getCheckIcon(check)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{check.label}</p>
                        <p className="text-xs text-slate-600 mt-1">{check.message}</p>
                      </div>
                      <Badge className={check.passed ? "bg-green-600" : "bg-red-600"}>
                        {check.passed ? 'Pass' : 'Fail'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Optional Checks */}
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Recommended Checks
            </h3>
            <div className="space-y-2">
              {optionalChecks.map(([key, check]) => (
                <Card key={key} className={cn(
                  "border",
                  check.passed ? "border-green-200" : "border-amber-200"
                )}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {getCheckIcon(check)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{check.label}</p>
                        <p className="text-xs text-slate-600 mt-1">{check.message}</p>
                      </div>
                      <Badge variant="outline" className={check.passed ? "text-green-700" : "text-amber-700"}>
                        {check.passed ? 'Pass' : 'Warning'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Warning Acknowledgment */}
          {hasWarnings && !canProceed && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-amber-900">
                      Quality warnings detected
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      {mode === 'pre' 
                        ? 'You can proceed, but generation quality may be affected.'
                        : 'You can save, but content may require additional review.'
                      }
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAcknowledgedWarnings(true)}
                      className="mt-2 text-xs"
                    >
                      Acknowledge & Continue
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={onProceed}
            disabled={!canProceed}
            className={cn(
              !canProceed && "opacity-50 cursor-not-allowed",
              qualityScore >= 80 && "bg-green-600 hover:bg-green-700"
            )}
          >
            {mode === 'pre' ? (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Content
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Content
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}