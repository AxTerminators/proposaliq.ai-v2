import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileText,
  Target,
  Sparkles,
  Calendar,
  DollarSign,
  Building2
} from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * AI Workflow Validator Component
 * 
 * Validates that a proposal is ready for AI-assisted writing by checking:
 * - Basic proposal information completeness
 * - Strategy configuration status
 * - Reference proposal availability
 * - Required data presence
 * 
 * Provides actionable feedback to guide users through prerequisites.
 */
export default function AIWorkflowValidator({ proposal, onValidationComplete }) {
  const [validationResults, setValidationResults] = React.useState(null);
  const [isValidating, setIsValidating] = React.useState(false);

  const runValidation = React.useCallback(async () => {
    setIsValidating(true);
    const results = {
      overall: 'pass',
      checks: []
    };

    try {
      // Check 1: Basic Information
      const basicInfoCheck = {
        id: 'basic_info',
        name: 'Basic Proposal Information',
        icon: FileText,
        status: 'pass',
        issues: []
      };

      if (!proposal.proposal_name || proposal.proposal_name.trim().length < 3) {
        basicInfoCheck.status = 'fail';
        basicInfoCheck.issues.push('Proposal name is missing or too short');
      }
      if (!proposal.agency_name) {
        basicInfoCheck.status = 'warning';
        basicInfoCheck.issues.push('Agency name not set (recommended)');
      }
      if (!proposal.solicitation_number) {
        basicInfoCheck.status = 'warning';
        basicInfoCheck.issues.push('Solicitation number not set (recommended)');
      }
      if (!proposal.project_title) {
        basicInfoCheck.status = 'warning';
        basicInfoCheck.issues.push('Project title not set (recommended)');
      }

      results.checks.push(basicInfoCheck);
      if (basicInfoCheck.status === 'fail') results.overall = 'fail';

      // Check 2: Timeline & Due Date
      const timelineCheck = {
        id: 'timeline',
        name: 'Timeline & Deadlines',
        icon: Calendar,
        status: 'pass',
        issues: []
      };

      if (!proposal.due_date) {
        timelineCheck.status = 'fail';
        timelineCheck.issues.push('Due date is required for AI context');
      }
      if (proposal.timeline_status !== 'complete') {
        timelineCheck.status = 'warning';
        timelineCheck.issues.push('Timeline not configured (AI will have limited context)');
      }

      results.checks.push(timelineCheck);
      if (timelineCheck.status === 'fail') results.overall = 'fail';

      // Check 3: Contract Value
      const contractCheck = {
        id: 'contract',
        name: 'Contract Value',
        icon: DollarSign,
        status: 'pass',
        issues: []
      };

      if (!proposal.contract_value || proposal.contract_value <= 0) {
        contractCheck.status = 'warning';
        contractCheck.issues.push('Contract value not set (AI cannot estimate effort/scale)');
      }

      results.checks.push(contractCheck);

      // Check 4: Strategy Configuration
      const strategyCheck = {
        id: 'strategy',
        name: 'AI Strategy Configuration',
        icon: Target,
        status: 'pass',
        issues: []
      };

      if (!proposal.strategy_config) {
        strategyCheck.status = 'fail';
        strategyCheck.issues.push('Strategy not configured - run "Configure AI Strategy" first');
      } else {
        try {
          const config = typeof proposal.strategy_config === 'string' 
            ? JSON.parse(proposal.strategy_config) 
            : proposal.strategy_config;

          if (!config.ai_settings || !config.sections) {
            strategyCheck.status = 'fail';
            strategyCheck.issues.push('Strategy configuration is incomplete');
          } else {
            const enabledSections = Object.values(config.sections).filter(s => s.enabled).length;
            if (enabledSections === 0) {
              strategyCheck.status = 'fail';
              strategyCheck.issues.push('No proposal sections enabled in strategy');
            } else {
              strategyCheck.issues.push(`${enabledSections} sections configured for AI writing`);
            }
          }
        } catch (error) {
          strategyCheck.status = 'fail';
          strategyCheck.issues.push('Strategy configuration is corrupted - please reconfigure');
        }
      }

      results.checks.push(strategyCheck);
      if (strategyCheck.status === 'fail') results.overall = 'fail';

      // Check 5: Reference Proposals
      const referencesCheck = {
        id: 'references',
        name: 'Reference Proposals',
        icon: Sparkles,
        status: 'pass',
        issues: []
      };

      const referenceIds = proposal.reference_proposal_ids || [];
      if (referenceIds.length === 0) {
        referencesCheck.status = 'warning';
        referencesCheck.issues.push('No reference proposals selected (AI will use generic knowledge only)');
      } else {
        // Validate that reference proposals exist and are accessible
        try {
          const references = await base44.entities.Proposal.filter({
            id: { $in: referenceIds }
          });
          
          if (references.length !== referenceIds.length) {
            referencesCheck.status = 'warning';
            referencesCheck.issues.push(`${referenceIds.length - references.length} reference(s) not found or inaccessible`);
          }
          
          referencesCheck.issues.push(`${references.length} reference proposal(s) available for AI context`);
        } catch (error) {
          referencesCheck.status = 'warning';
          referencesCheck.issues.push('Could not validate reference proposals');
        }
      }

      results.checks.push(referencesCheck);

      // Check 6: Organization Context
      const orgCheck = {
        id: 'organization',
        name: 'Organization Context',
        icon: Building2,
        status: 'pass',
        issues: []
      };

      if (!proposal.organization_id) {
        orgCheck.status = 'fail';
        orgCheck.issues.push('Proposal not linked to organization');
      } else {
        try {
          const org = await base44.entities.Organization.filter({ id: proposal.organization_id });
          if (!org || org.length === 0) {
            orgCheck.status = 'fail';
            orgCheck.issues.push('Organization not found');
          } else {
            orgCheck.issues.push(`Organization: ${org[0].organization_name}`);
          }
        } catch (error) {
          orgCheck.status = 'warning';
          orgCheck.issues.push('Could not validate organization');
        }
      }

      results.checks.push(orgCheck);
      if (orgCheck.status === 'fail') results.overall = 'fail';

      // Determine overall status
      const hasFailures = results.checks.some(c => c.status === 'fail');
      const hasWarnings = results.checks.some(c => c.status === 'warning');
      
      if (hasFailures) {
        results.overall = 'fail';
      } else if (hasWarnings) {
        results.overall = 'warning';
      } else {
        results.overall = 'pass';
      }

      setValidationResults(results);

      if (onValidationComplete) {
        onValidationComplete(results);
      }

    } catch (error) {
      console.error('[AIWorkflowValidator] Validation error:', error);
      setValidationResults({
        overall: 'error',
        error: error.message,
        checks: []
      });
    } finally {
      setIsValidating(false);
    }
  }, [proposal, onValidationComplete]);

  React.useEffect(() => {
    if (proposal) {
      runValidation();
    }
  }, [proposal?.id]); // Only re-run when proposal ID changes

  if (isValidating) {
    return (
      <Card className="border-2 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 text-blue-600">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-medium">Validating proposal readiness...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validationResults) {
    return null;
  }

  if (validationResults.overall === 'error') {
    return (
      <Alert className="border-2 border-red-300 bg-red-50">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-900">Validation Error</AlertTitle>
        <AlertDescription className="text-red-800">
          {validationResults.error || 'An unexpected error occurred during validation'}
        </AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={runValidation}
          className="mt-3"
        >
          Retry Validation
        </Button>
      </Alert>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-800">✓ Ready</Badge>;
      case 'warning':
        return <Badge className="bg-amber-100 text-amber-800">⚠ Warning</Badge>;
      case 'fail':
        return <Badge className="bg-red-100 text-red-800">✗ Required</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getOverallMessage = () => {
    switch (validationResults.overall) {
      case 'pass':
        return {
          title: '✅ Ready for AI Writing',
          description: 'All prerequisites met. You can proceed with AI-assisted content generation.',
          className: 'border-green-300 bg-green-50',
          titleClass: 'text-green-900',
          descClass: 'text-green-800'
        };
      case 'warning':
        return {
          title: '⚠️ Can Proceed with Warnings',
          description: 'AI writing is available, but some recommended items are missing. Results may be less optimal.',
          className: 'border-amber-300 bg-amber-50',
          titleClass: 'text-amber-900',
          descClass: 'text-amber-800'
        };
      case 'fail':
        return {
          title: '❌ Prerequisites Required',
          description: 'Please complete required items before using AI writing features.',
          className: 'border-red-300 bg-red-50',
          titleClass: 'text-red-900',
          descClass: 'text-red-800'
        };
      default:
        return {
          title: 'Validation Status Unknown',
          description: '',
          className: 'border-slate-300 bg-slate-50',
          titleClass: 'text-slate-900',
          descClass: 'text-slate-800'
        };
    }
  };

  const overallMsg = getOverallMessage();

  return (
    <div className="space-y-4">
      <Alert className={`border-2 ${overallMsg.className}`}>
        <AlertTitle className={`text-lg font-semibold ${overallMsg.titleClass}`}>
          {overallMsg.title}
        </AlertTitle>
        <AlertDescription className={overallMsg.descClass}>
          {overallMsg.description}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Validation Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {validationResults.checks.map((check) => {
            const Icon = check.icon;
            return (
              <Card 
                key={check.id}
                className={`border-2 ${
                  check.status === 'pass' ? 'border-green-200 bg-green-50' :
                  check.status === 'warning' ? 'border-amber-200 bg-amber-50' :
                  'border-red-200 bg-red-50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 ${
                      check.status === 'pass' ? 'text-green-600' :
                      check.status === 'warning' ? 'text-amber-600' :
                      'text-red-600'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-slate-900">{check.name}</h4>
                        {getStatusBadge(check.status)}
                      </div>
                      {check.issues.length > 0 && (
                        <ul className="text-sm space-y-1">
                          {check.issues.map((issue, idx) => (
                            <li key={idx} className={`${
                              check.status === 'pass' ? 'text-green-700' :
                              check.status === 'warning' ? 'text-amber-700' :
                              'text-red-700'
                            }`}>
                              • {issue}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={runValidation}
          className="gap-2"
        >
          <Loader2 className="w-4 h-4" />
          Re-validate
        </Button>
      </div>
    </div>
  );
}