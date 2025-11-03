import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const AI_ACTION_CONFIG = {
  run_ai_analysis_phase3: {
    title: "Run AI Compliance Analysis",
    description: "Analyze solicitation documents and extract compliance requirements using AI",
    action: async (proposal) => {
      // Get solicitation documents
      const docs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposal.id
      });
      
      if (docs.length === 0) {
        throw new Error("No solicitation documents found. Please upload documents first.");
      }

      // Run AI analysis
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the following solicitation and extract all compliance requirements, evaluation criteria, and submission requirements. 
        
Proposal: ${proposal.proposal_name}
Agency: ${proposal.agency_name}
Solicitation Number: ${proposal.solicitation_number}

For each requirement found, identify:
- Requirement ID/Reference
- Category (mandatory, desirable, or information_only)
- Description
- Source section
- Compliance status guidance

Return a structured JSON array of requirements.`,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            requirements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  requirement_id: { type: "string" },
                  title: { type: "string" },
                  category: { type: "string" },
                  description: { type: "string" },
                  source: { type: "string" }
                }
              }
            }
          }
        }
      });

      return response;
    }
  },
  run_evaluation_phase4: {
    title: "Run Strategic Evaluation",
    description: "Evaluate proposal fit and generate strategic recommendations",
    action: async (proposal) => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Perform a strategic evaluation for this proposal opportunity:

Proposal: ${proposal.proposal_name}
Agency: ${proposal.agency_name}
Project: ${proposal.project_title}
Contract Value: $${proposal.contract_value?.toLocaleString()}
Due Date: ${proposal.due_date}

Evaluate:
1. Strategic fit and alignment
2. Competitive positioning
3. Win probability
4. Risk factors
5. Resource requirements
6. Go/No-Go recommendation

Provide detailed analysis with specific recommendations.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            strategic_fit_score: { type: "number" },
            win_probability: { type: "number" },
            go_no_go_recommendation: { type: "string" },
            key_strengths: { type: "array", items: { type: "string" } },
            risk_factors: { type: "array", items: { type: "string" } },
            recommended_actions: { type: "array", items: { type: "string" } },
            detailed_analysis: { type: "string" }
          }
        }
      });

      return response;
    }
  },
  generate_win_themes_phase5: {
    title: "Generate Win Themes",
    description: "AI-powered win theme generation based on opportunity analysis",
    action: async (proposal) => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate compelling win themes for this proposal:

Proposal: ${proposal.proposal_name}
Agency: ${proposal.agency_name}
Project: ${proposal.project_title}

Generate 3-5 powerful win themes that:
1. Address agency pain points
2. Differentiate from competitors
3. Highlight unique value propositions
4. Include supporting evidence
5. Connect to evaluation criteria

For each theme provide: title, statement, supporting evidence, and discriminators.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            win_themes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  statement: { type: "string" },
                  supporting_evidence: { type: "array", items: { type: "string" } },
                  discriminators: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      return response;
    }
  },
  run_readiness_check_phase7: {
    title: "Run Submission Readiness Check",
    description: "Comprehensive pre-submission validation and readiness assessment",
    action: async (proposal) => {
      // Get all sections
      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposal.id
      });

      // Get compliance requirements
      const requirements = await base44.entities.ComplianceRequirement.filter({
        proposal_id: proposal.id
      });

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Perform a comprehensive submission readiness check for this proposal:

Proposal: ${proposal.proposal_name}
Sections Completed: ${sections.length}
Compliance Requirements: ${requirements.length}

Check for:
1. Section completeness
2. Compliance coverage
3. Formatting consistency
4. Required attachments
5. Page limits
6. Submission requirements
7. Critical gaps or issues

Provide a detailed readiness report with a go/no-go recommendation for submission.`,
        response_json_schema: {
          type: "object",
          properties: {
            readiness_score: { type: "number" },
            submission_ready: { type: "boolean" },
            critical_issues: { type: "array", items: { type: "string" } },
            warnings: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            detailed_report: { type: "string" }
          }
        }
      });

      return response;
    }
  }
};

export default function AIActionModal({ 
  isOpen, 
  onClose, 
  actionType,
  proposal,
  onComplete 
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('idle'); // idle, running, success, error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const config = AI_ACTION_CONFIG[actionType];

  const runAction = async () => {
    setStatus('running');
    setError(null);
    
    try {
      const result = await config.action(proposal);
      setResult(result);
      setStatus('success');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      
      if (onComplete) {
        onComplete(result);
      }
    } catch (err) {
      console.error("AI Action Error:", err);
      setError(err.message || "An error occurred while running the AI action");
      setStatus('error');
    }
  };

  const handleClose = () => {
    if (status === 'running') {
      if (!confirm('AI action is still running. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  if (!config) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-2xl">{config.title}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={status === 'running'}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-slate-600">{config.description}</p>

          {status === 'idle' && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                This AI-powered action will analyze your proposal data and generate intelligent insights. 
                Click "Run AI Action" to begin.
              </AlertDescription>
            </Alert>
          )}

          {status === 'running' && (
            <Alert className="bg-blue-50 border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-900">
                AI is analyzing your proposal... This may take 10-30 seconds.
              </AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  AI analysis completed successfully!
                </AlertDescription>
              </Alert>

              <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <h3 className="font-semibold mb-3">Results:</h3>
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </>
          )}

          {status === 'error' && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="border-t pt-4 flex justify-between">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={status === 'running'}
          >
            {status === 'success' ? 'Close' : 'Cancel'}
          </Button>
          
          {(status === 'idle' || status === 'error') && (
            <Button
              onClick={runAction}
              disabled={status === 'running'}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Run AI Action
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}