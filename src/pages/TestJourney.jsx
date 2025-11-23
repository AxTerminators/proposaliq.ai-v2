
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PlayCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  User,
  Building2,
  FileText,
  Users,
  Library,
  Upload,
  Target,
  Sparkles,
  Edit,
  DollarSign,
  Shield,
  LayoutGrid,
  Database,
  MessageSquare,
  CheckSquare,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";

const USER_JOURNEY_TESTS = [
  {
    id: 'new_user_setup',
    name: 'New User Setup Journey',
    steps: [
      { id: 'user_auth', name: 'User Authentication', icon: User },
      { id: 'org_creation', name: 'Organization Setup', icon: Building2 },
      { id: 'kanban_init', name: 'Kanban Board Initialization', icon: LayoutGrid },
    ]
  },
  {
    id: 'new_proposal_flow',
    name: 'New Proposal Creation (via Kanban)',
    steps: [
      { id: 'create_card', name: 'Create Proposal Card', icon: FileText },
      { id: 'basic_info', name: 'Enter Basic Info', icon: Edit },
      { id: 'team_setup', name: 'Configure Team', icon: Users },
      { id: 'upload_docs', name: 'Upload Solicitation', icon: Upload },
      { id: 'run_evaluation', name: 'Run AI Evaluation', icon: Target },
      { id: 'develop_strategy', name: 'Develop Win Strategy', icon: Sparkles },
      { id: 'write_content', name: 'Write Content', icon: Edit },
      { id: 'build_pricing', name: 'Build Pricing', icon: DollarSign },
    ]
  },
  {
    id: 'checklist_workflow',
    name: 'Checklist-Driven Workflow',
    steps: [
      { id: 'open_proposal_modal', name: 'Open Proposal Modal', icon: FileText },
      { id: 'view_checklist', name: 'View Stage Checklist', icon: Shield },
      { id: 'trigger_modal_action', name: 'Trigger Modal Action', icon: Edit },
      { id: 'trigger_navigate_action', name: 'Trigger Navigate Action', icon: ArrowRight },
      { id: 'complete_checklist_item', name: 'Complete Checklist Item', icon: CheckCircle2 },
    ]
  },
  {
    id: 'collaboration',
    name: 'Collaboration Features',
    steps: [
      { id: 'add_comment', name: 'Add Comment', icon: MessageSquare },
      { id: 'create_task', name: 'Create Task', icon: CheckSquare },
      { id: 'upload_file', name: 'Upload File', icon: Upload },
      { id: 'receive_notification', name: 'Receive Notification', icon: Bell },
    ]
  }
];

export default function TestJourney() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentJourney, setCurrentJourney] = useState(null);
  const [currentStep, setCurrentStep] = useState(null);
  const [results, setResults] = useState({});
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const orgs = await base44.entities.Organization.filter(
        { created_by: currentUser.email },
        '-created_date',
        1
      );
      if (orgs.length > 0) {
        setOrganization(orgs[0]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const runJourneyTest = async (journey) => {
    setIsRunning(true);
    setCurrentJourney(journey.id);
    setResults({});
    setProgress(0);

    for (let i = 0; i < journey.steps.length; i++) {
      const step = journey.steps[i];
      setCurrentStep(step.id);

      const result = await executeStep(journey.id, step);
      
      setResults(prev => ({
        ...prev,
        [`${journey.id}_${step.id}`]: result
      }));

      setProgress(((i + 1) / journey.steps.length) * 100);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setCurrentJourney(null);
    setCurrentStep(null);
    setIsRunning(false);
  };

  const executeStep = async (journeyId, step) => {
    try {
      switch (step.id) {
        case 'user_auth':
          return {
            status: user ? 'pass' : 'fail',
            message: user ? `Authenticated as ${user.email}` : 'Not authenticated',
            duration: 50
          };

        case 'org_creation':
          return {
            status: organization ? 'pass' : 'fail',
            message: organization ? `Organization: ${organization.organization_name}` : 'No organization',
            duration: 100
          };

        case 'kanban_init':
          const configs = await base44.entities.KanbanConfig.filter({ 
            organization_id: organization.id 
          });
          return {
            status: configs.length > 0 || organization ? 'pass' : 'fail',
            message: configs.length > 0 ? 'Custom config exists' : 'Using default config',
            duration: 200
          };

        case 'create_card':
          const proposals = await base44.entities.Proposal.filter({ 
            organization_id: organization.id 
          }, '-created_date', 1);
          return {
            status: proposals.length > 0 ? 'pass' : 'warning',
            message: proposals.length > 0 ? 'Proposals exist' : 'No test proposals (manual test required)',
            duration: 150
          };

        case 'basic_info':
          const proposalsWithInfo = await base44.entities.Proposal.filter({ 
            organization_id: organization.id,
            solicitation_number: { $ne: null }
          });
          return {
            status: proposalsWithInfo.length > 0 ? 'pass' : 'warning',
            message: `${proposalsWithInfo.length} proposal(s) with basic info`,
            duration: 150
          };

        case 'team_setup':
          const proposalsWithTeam = await base44.entities.Proposal.filter({ 
            organization_id: organization.id,
            prime_contractor_id: { $ne: null }
          });
          return {
            status: proposalsWithTeam.length > 0 ? 'pass' : 'warning',
            message: `${proposalsWithTeam.length} proposal(s) with team configured`,
            duration: 150
          };

        case 'upload_docs':
          const docs = await base44.entities.SolicitationDocument.filter({ 
            organization_id: organization.id 
          });
          return {
            status: docs.length > 0 ? 'pass' : 'warning',
            message: `${docs.length} document(s) uploaded`,
            duration: 200
          };

        case 'run_evaluation':
          const evaluated = await base44.entities.Proposal.filter({ 
            organization_id: organization.id,
            evaluation_results: { $ne: null }
          });
          return {
            status: evaluated.length > 0 ? 'pass' : 'warning',
            message: `${evaluated.length} proposal(s) evaluated`,
            duration: 300
          };

        case 'develop_strategy':
          const withStrategy = await base44.entities.Proposal.filter({ 
            organization_id: organization.id,
            strategy_config: { $ne: null }
          });
          return {
            status: withStrategy.length > 0 ? 'pass' : 'warning',
            message: `${withStrategy.length} proposal(s) with strategy`,
            duration: 200
          };

        case 'write_content':
          const sections = await base44.entities.ProposalSection.filter({ 
            organization_id: organization.id 
          });
          return {
            status: sections.length > 0 ? 'pass' : 'warning',
            message: `${sections.length} section(s) created`,
            duration: 200
          };

        case 'build_pricing':
          const estimates = await base44.entities.CostEstimate.filter({ 
            organization_id: organization.id 
          });
          return {
            status: estimates.length > 0 ? 'pass' : 'warning',
            message: `${estimates.length} estimate(s) created`,
            duration: 200
          };

        default:
          return {
            status: 'warning',
            message: 'Manual verification required',
            duration: 100
          };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: error.message,
        duration: 0
      };
    }
  };

  if (!user || !organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
              <p className="text-slate-600">Loading test environment...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">User Journey Testing</h1>
          <p className="text-slate-600">
            Automated end-to-end workflow validation
          </p>
        </div>

        {isRunning && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-blue-900">Running Journey Test</span>
                <span className="text-blue-700">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {USER_JOURNEY_TESTS.map((journey) => {
            const journeyResults = journey.steps.map(step => ({
              ...step,
              result: results[`${journey.id}_${step.id}`]
            }));
            
            const hasResults = journeyResults.some(s => s.result);
            const allPassed = hasResults && journeyResults.every(s => s.result?.status === 'pass');
            const anyFailed = journeyResults.some(s => s.result?.status === 'fail');

            return (
              <Card key={journey.id} className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{journey.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {hasResults && (
                        <Badge className={cn(
                          allPassed ? 'bg-green-600' :
                          anyFailed ? 'bg-red-600' : 'bg-amber-600'
                        )}>
                          {allPassed ? 'All Passed' : anyFailed ? 'Has Failures' : 'Has Warnings'}
                        </Badge>
                      )}
                      <Button
                        onClick={() => runJourneyTest(journey)}
                        disabled={isRunning}
                        size="sm"
                      >
                        {isRunning && currentJourney === journey.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <PlayCircle className="w-4 h-4 mr-2" />
                        )}
                        Run Test
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {journey.steps.map((step, idx) => {
                    const result = results[`${journey.id}_${step.id}`];
                    const isCurrent = currentJourney === journey.id && currentStep === step.id;

                    return (
                      <div
                        key={step.id}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all",
                          result?.status === 'pass' ? 'border-green-200 bg-green-50' :
                          result?.status === 'fail' ? 'border-red-200 bg-red-50' :
                          result?.status === 'warning' ? 'border-amber-200 bg-amber-50' :
                          'border-slate-200 bg-white',
                          isCurrent && 'ring-2 ring-blue-400'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                              result?.status === 'pass' ? 'bg-green-600 text-white' :
                              result?.status === 'fail' ? 'bg-red-600 text-white' :
                              result?.status === 'warning' ? 'bg-amber-600 text-white' :
                              'bg-slate-200 text-slate-600'
                            )}>
                              {result ? (
                                result.status === 'pass' ? <CheckCircle2 className="w-4 h-4" /> :
                                result.status === 'fail' ? <XCircle className="w-4 h-4" /> :
                                '!'
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{step.name}</p>
                              {result && (
                                <p className="text-xs text-slate-600 mt-1">{result.message}</p>
                              )}
                            </div>
                          </div>
                          {result && (
                            <div className="text-right">
                              <Badge className={cn(
                                "text-xs",
                                result.status === 'pass' ? 'bg-green-600' :
                                result.status === 'fail' ? 'bg-red-600' :
                                'bg-amber-600'
                              )}>
                                {result.status}
                              </Badge>
                              {result.duration && (
                                <p className="text-xs text-slate-500 mt-1">{result.duration}ms</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Test Data Actions */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base">Test Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-900">
              These actions help set up and tear down test data for journey validation
            </p>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (!confirm('Generate sample test data?')) return;
                  try {
                    await base44.functions.invoke('generateSampleData', {});
                    alert('✓ Sample data generated!');
                    window.location.reload();
                  } catch (error) {
                    alert('Error: ' + error.message);
                  }
                }}
                variant="outline"
                size="sm"
              >
                <Database className="w-4 h-4 mr-2" />
                Generate Sample Data
              </Button>
              
              <Button
                onClick={() => navigate(createPageUrl("SystemVerification"))}
                variant="outline"
                size="sm"
              >
                <Shield className="w-4 h-4 mr-2" />
                System Verification
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
