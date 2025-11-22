import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Loader2,
  Play
} from "lucide-react";

/**
 * Export Quality Checker
 * Validates proposal content before export to ensure document quality
 * 
 * Quality checks include:
 * - Empty sections detection
 * - Word count validation
 * - Status validation
 * - Required sections check
 */
export default function ExportQualityChecker({ proposalId, onCheckComplete }) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResults, setCheckResults] = useState(null);

  // Fetch proposal data
  const { data: proposal } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: async () => {
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      return proposals[0];
    },
    enabled: !!proposalId
  });

  // Fetch proposal sections
  const { data: sections = [] } = useQuery({
    queryKey: ['proposalSections', proposalId],
    queryFn: async () => {
      const secs = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId
      }, 'order');
      return secs;
    },
    enabled: !!proposalId
  });

  // Run quality checks
  const runQualityChecks = () => {
    setIsChecking(true);

    // Simulate async check (in production, this could be a backend call)
    setTimeout(() => {
      const results = {
        passed: true,
        errors: [],
        warnings: [],
        info: []
      };

      // Check 1: Empty sections
      const emptySections = sections.filter(s => !s.content || s.content.trim().length === 0);
      if (emptySections.length > 0) {
        results.warnings.push({
          type: 'empty_sections',
          severity: 'warning',
          message: `${emptySections.length} section(s) are empty`,
          details: emptySections.map(s => s.section_name).join(', ')
        });
      }

      // Check 2: Very short sections (less than 50 words)
      const shortSections = sections.filter(s => {
        if (!s.content) return false;
        const wordCount = s.content.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
        return wordCount < 50 && wordCount > 0;
      });
      if (shortSections.length > 0) {
        results.warnings.push({
          type: 'short_sections',
          severity: 'warning',
          message: `${shortSections.length} section(s) have less than 50 words`,
          details: shortSections.map(s => s.section_name).join(', ')
        });
      }

      // Check 3: No sections at all
      if (sections.length === 0) {
        results.errors.push({
          type: 'no_sections',
          severity: 'error',
          message: 'Proposal has no sections',
          details: 'Add at least one section before exporting'
        });
        results.passed = false;
      }

      // Check 4: Proposal status check
      if (proposal) {
        if (proposal.status === 'draft' || proposal.status === 'evaluating') {
          results.info.push({
            type: 'draft_status',
            severity: 'info',
            message: 'Proposal is still in draft/evaluation stage',
            details: 'Final exports are typically generated from approved proposals'
          });
        }

        // Check 5: Missing key proposal details
        const missingFields = [];
        if (!proposal.proposal_name) missingFields.push('Proposal Name');
        if (!proposal.project_title) missingFields.push('Project Title');
        if (!proposal.agency_name) missingFields.push('Agency Name');
        
        if (missingFields.length > 0) {
          results.warnings.push({
            type: 'missing_details',
            severity: 'warning',
            message: 'Missing key proposal details',
            details: missingFields.join(', ')
          });
        }
      }

      // Check 6: Sections with "pending review" status
      const pendingSections = sections.filter(s => s.status === 'pending_review');
      if (pendingSections.length > 0) {
        results.info.push({
          type: 'pending_review',
          severity: 'info',
          message: `${pendingSections.length} section(s) are pending review`,
          details: pendingSections.map(s => s.section_name).join(', ')
        });
      }

      // Check 7: Unapproved sections
      const unapprovedSections = sections.filter(s => s.status !== 'approved');
      if (unapprovedSections.length > 0) {
        results.info.push({
          type: 'unapproved_content',
          severity: 'info',
          message: `${unapprovedSections.length} section(s) are not approved`,
          details: 'Consider getting approval before final export'
        });
      }

      // Check 8: Total word count
      const totalWords = sections.reduce((sum, s) => {
        if (!s.content) return sum;
        const wordCount = s.content.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
        return sum + wordCount;
      }, 0);

      if (totalWords < 100) {
        results.warnings.push({
          type: 'low_word_count',
          severity: 'warning',
          message: 'Total word count is very low',
          details: `Current total: ${totalWords} words`
        });
      } else {
        results.info.push({
          type: 'word_count',
          severity: 'info',
          message: `Total word count: ${totalWords.toLocaleString()} words`,
          details: `Across ${sections.length} sections`
        });
      }

      setCheckResults(results);
      setIsChecking(false);

      // Callback to parent
      if (onCheckComplete) {
        onCheckComplete(results);
      }
    }, 1500);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'info':
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600" />;
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'warning':
        return <Badge className="bg-amber-100 text-amber-800">Warning</Badge>;
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800">Info</Badge>;
      default:
        return <Badge variant="outline">Note</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Quality Check
          </span>
          {!checkResults && (
            <Button 
              onClick={runQualityChecks} 
              disabled={isChecking || !proposal}
              size="sm"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Check
                </>
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!checkResults && !isChecking && (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600 mb-4">
              Run a quality check to validate your proposal before exporting
            </p>
            <p className="text-sm text-slate-500">
              This will check for empty sections, missing details, and other potential issues
            </p>
          </div>
        )}

        {isChecking && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-slate-600">Running quality checks...</p>
            <p className="text-sm text-slate-500 mt-2">
              Validating {sections.length} sections
            </p>
          </div>
        )}

        {checkResults && (
          <div className="space-y-6">
            {/* Overall Status */}
            <Alert className={checkResults.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-3">
                {checkResults.passed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <p className={`font-semibold ${checkResults.passed ? 'text-green-900' : 'text-red-900'}`}>
                    {checkResults.passed ? 'Ready to Export' : 'Issues Found'}
                  </p>
                  <AlertDescription className={checkResults.passed ? 'text-green-700' : 'text-red-700'}>
                    {checkResults.passed 
                      ? 'Your proposal passed all critical quality checks'
                      : 'Please address the errors before exporting'
                    }
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{checkResults.errors.length}</p>
                <p className="text-sm text-red-700 mt-1">Errors</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-3xl font-bold text-amber-600">{checkResults.warnings.length}</p>
                <p className="text-sm text-amber-700 mt-1">Warnings</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{checkResults.info.length}</p>
                <p className="text-sm text-blue-700 mt-1">Info</p>
              </div>
            </div>

            {/* Errors */}
            {checkResults.errors.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-red-900 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Critical Errors
                </h4>
                {checkResults.errors.map((issue, index) => (
                  <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-red-900">{issue.message}</p>
                          {getSeverityBadge(issue.severity)}
                        </div>
                        <p className="text-sm text-red-700">{issue.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {checkResults.warnings.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Warnings
                </h4>
                {checkResults.warnings.map((issue, index) => (
                  <div key={index} className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-amber-900">{issue.message}</p>
                          {getSeverityBadge(issue.severity)}
                        </div>
                        <p className="text-sm text-amber-700">{issue.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info */}
            {checkResults.info.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Information
                </h4>
                {checkResults.info.map((issue, index) => (
                  <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-blue-900">{issue.message}</p>
                          {getSeverityBadge(issue.severity)}
                        </div>
                        <p className="text-sm text-blue-700">{issue.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recheck Button */}
            <div className="flex justify-center pt-4">
              <Button 
                onClick={runQualityChecks} 
                variant="outline"
                disabled={isChecking}
              >
                <Play className="w-4 h-4 mr-2" />
                Run Check Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}