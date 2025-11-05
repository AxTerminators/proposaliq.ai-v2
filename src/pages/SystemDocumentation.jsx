import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Workflow, 
  Database, 
  Code, 
  CheckCircle,
  ArrowRight,
  FileText,
  Settings,
  Users,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const PHASE_DOCUMENTATION = [
  {
    id: "phase1",
    label: "Phase 1: Prime Contractor",
    description: "Establish the team structure and identify key stakeholders",
    component: "Phase1.jsx",
    kanbanColumns: ["New", "Prime Selection"],
    status: "evaluating",
    keyFeatures: [
      "Select or add prime contractor from organization or teaming partners",
      "Add additional teaming partners",
      "Enter basic proposal information (name, solicitation number)",
      "Set project type and initial metadata"
    ],
    requiredData: [
      "proposal_name (required)",
      "prime_contractor_id",
      "prime_contractor_name",
      "project_type"
    ],
    autoSave: true
  },
  {
    id: "phase2",
    label: "Phase 2: Referenced Docs",
    description: "Gather and link all reference materials and boilerplate content",
    component: "Phase2.jsx",
    kanbanColumns: ["Gather Docs"],
    status: "evaluating",
    keyFeatures: [
      "Search and link boilerplate templates",
      "Link past proposals for reference",
      "Link proposal templates",
      "Link past performance records",
      "Upload additional reference documents"
    ],
    requiredData: [],
    autoSave: true,
    notes: "All data loads from ProposalResource entity. Auto-saves on phase navigation."
  },
  {
    id: "phase3",
    label: "Phase 3: Solicitation Details",
    description: "Upload and analyze solicitation documents",
    component: "Phase3.jsx",
    kanbanColumns: ["Solicitation"],
    status: "evaluating",
    keyFeatures: [
      "Upload solicitation documents (RFP, RFQ, RFI, etc.)",
      "AI extraction of requirements and sections",
      "Compliance requirement parsing",
      "Set contract value and due date",
      "Agency and project details"
    ],
    requiredData: [
      "solicitation_number",
      "agency_name",
      "project_title",
      "due_date",
      "contract_value"
    ],
    autoSave: true
  },
  {
    id: "phase4",
    label: "Phase 4: Evaluator",
    description: "AI-powered strategic evaluation and fit assessment",
    component: "Phase4.jsx",
    kanbanColumns: ["Evaluate"],
    status: "evaluating",
    keyFeatures: [
      "AI evaluates proposal fit and match score",
      "Competitive analysis",
      "Risk assessment",
      "Capability alignment",
      "Go/No-Go decision support"
    ],
    requiredData: [],
    autoSave: true,
    aiFeatures: ["Match scoring", "Competitive analysis", "Risk prediction"]
  },
  {
    id: "phase5",
    label: "Phase 5: Strategy",
    description: "Define win themes and writing strategy",
    component: "Phase5.jsx",
    kanbanColumns: ["Strategy"],
    status: "draft",
    keyFeatures: [
      "AI-generated win themes",
      "Competitive strategy development",
      "Writing tone and style configuration",
      "Section selection and planning",
      "Strategy configuration storage"
    ],
    requiredData: [],
    autoSave: true,
    aiFeatures: ["Win theme generation", "Strategic recommendations"]
  },
  {
    id: "phase6",
    label: "Phase 6: Proposal Writer",
    description: "Create and edit proposal content with AI assistance",
    component: "Phase6.jsx",
    kanbanColumns: ["Drafting"],
    status: "draft",
    keyFeatures: [
      "AI-powered content generation",
      "Rich text editing",
      "Version control and history",
      "Collaboration features",
      "Section-by-section development"
    ],
    requiredData: [],
    autoSave: true,
    aiFeatures: ["Content generation", "Section writing", "Rewrite suggestions"]
  },
  {
    id: "phase7",
    label: "Phase 7: Pricing & Cost Build",
    description: "Build comprehensive pricing structure and cost estimates",
    component: "Phase7Pricing.jsx",
    kanbanColumns: ["Pricing"],
    status: "in_progress",
    keyFeatures: [
      "Labor category management with rates",
      "CLIN (Contract Line Item) builder",
      "ODC (Other Direct Costs) tracking",
      "Multi-year projections",
      "Pricing analysis and recommendations"
    ],
    requiredData: [],
    autoSave: true,
    entities: ["LaborCategory", "CLIN", "LaborAllocation", "ODCItem", "PricingStrategy"]
  },
  {
    id: "phase8",
    label: "Phase 8: Finalize",
    description: "Final review and submission readiness",
    component: "Phase7.jsx (renamed from original Phase 7)",
    kanbanColumns: ["Review", "Finalize"],
    status: "in_progress",
    keyFeatures: [
      "Submission readiness checker",
      "Final compliance review",
      "Export capabilities",
      "Mark as submitted functionality"
    ],
    requiredData: [],
    autoSave: true,
    aiFeatures: ["Readiness scoring", "Quality check"]
  }
];

const ENTITY_REFERENCE = [
  {
    name: "Proposal",
    description: "Core proposal entity",
    keyFields: [
      "proposal_name",
      "current_phase (phase1-phase8)",
      "status (evaluating/draft/in_progress/submitted/won/lost)",
      "organization_id",
      "prime_contractor_id",
      "contract_value",
      "due_date"
    ]
  },
  {
    name: "ProposalSection",
    description: "Individual proposal sections",
    keyFields: [
      "proposal_id",
      "section_name",
      "section_type",
      "content (HTML)",
      "status",
      "order"
    ]
  },
  {
    name: "ProposalResource",
    description: "Reference documents and boilerplate",
    keyFields: [
      "organization_id",
      "resource_type",
      "file_url",
      "boilerplate_content"
    ]
  },
  {
    name: "LaborCategory",
    description: "Labor rates for pricing (Phase 7)",
    keyFields: [
      "organization_id",
      "category_name",
      "base_hourly_rate",
      "fringe_rate",
      "overhead_rate",
      "ga_rate",
      "loaded_hourly_rate"
    ]
  },
  {
    name: "CLIN",
    description: "Contract Line Items (Phase 7)",
    keyFields: [
      "proposal_id",
      "clin_number",
      "clin_type",
      "total_cost",
      "total_price"
    ]
  },
  {
    name: "KanbanConfig",
    description: "Kanban board configuration",
    keyFields: [
      "organization_id",
      "columns (array)",
      "phase_mapping",
      "checklist_items"
    ]
  }
];

const STATUS_PHASE_MAPPING = [
  {
    phases: ["phase1", "phase2", "phase3", "phase4"],
    status: "evaluating",
    description: "Initial evaluation and information gathering phases"
  },
  {
    phases: ["phase5", "phase6"],
    status: "draft",
    description: "Strategy development and content creation phases"
  },
  {
    phases: ["phase7", "phase8"],
    status: "in_progress",
    description: "Pricing, finalization, and submission preparation"
  }
];

export default function SystemDocumentation() {
  const [selectedPhase, setSelectedPhase] = useState("phase1");

  const currentPhase = PHASE_DOCUMENTATION.find(p => p.id === selectedPhase);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            System Documentation
          </h1>
          <p className="text-slate-600">Complete reference for the 8-phase proposal builder workflow</p>
        </div>

        <Tabs defaultValue="phases" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="phases">
              <Workflow className="w-4 h-4 mr-2" />
              Phases
            </TabsTrigger>
            <TabsTrigger value="entities">
              <Database className="w-4 h-4 mr-2" />
              Entities
            </TabsTrigger>
            <TabsTrigger value="mapping">
              <Settings className="w-4 h-4 mr-2" />
              Mapping
            </TabsTrigger>
            <TabsTrigger value="api">
              <Code className="w-4 h-4 mr-2" />
              API Reference
            </TabsTrigger>
            <TabsTrigger value="testing">
              <CheckCircle className="w-4 h-4 mr-2" />
              Testing Guide
            </TabsTrigger>
          </TabsList>

          {/* Phases Documentation */}
          <TabsContent value="phases" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>8-Phase Workflow Overview</CardTitle>
                <CardDescription>
                  ProposalIQ.ai uses an 8-phase workflow to guide users through the entire proposal development process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid lg:grid-cols-4 gap-4 mb-6">
                  {PHASE_DOCUMENTATION.map((phase, idx) => (
                    <button
                      key={phase.id}
                      onClick={() => setSelectedPhase(phase.id)}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        selectedPhase === phase.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold",
                          selectedPhase === phase.id ? "bg-blue-600" : "bg-slate-400"
                        )}>
                          {idx + 1}
                        </div>
                        <Badge variant={selectedPhase === phase.id ? "default" : "outline"}>
                          {phase.id}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900 mb-1">
                        {phase.label.replace(/^Phase \d+: /, '')}
                      </h3>
                      <p className="text-xs text-slate-600">
                        Status: {phase.status}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Selected Phase Details */}
                {currentPhase && (
                  <div className="space-y-4 bg-slate-50 rounded-lg p-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">{currentPhase.label}</h2>
                      <p className="text-slate-600">{currentPhase.description}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">Component</h3>
                        <code className="bg-slate-800 text-green-400 px-3 py-1 rounded text-sm">
                          {currentPhase.component}
                        </code>
                      </div>

                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">Kanban Columns</h3>
                        <div className="flex flex-wrap gap-2">
                          {currentPhase.kanbanColumns.map((col, idx) => (
                            <Badge key={idx} className="bg-blue-600">
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">Proposal Status</h3>
                        <Badge variant="outline" className="capitalize">
                          {currentPhase.status}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">Auto-Save</h3>
                        <div className="flex items-center gap-2">
                          {currentPhase.autoSave ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-green-600 text-sm">Enabled</span>
                            </>
                          ) : (
                            <span className="text-slate-500 text-sm">Manual Save</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">Key Features</h3>
                      <ul className="space-y-2">
                        {currentPhase.keyFeatures.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {currentPhase.requiredData.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">Required Data Fields</h3>
                        <div className="flex flex-wrap gap-2">
                          {currentPhase.requiredData.map((field, idx) => (
                            <code key={idx} className="bg-slate-800 text-amber-400 px-2 py-1 rounded text-xs">
                              {field}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentPhase.aiFeatures && (
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          AI Features
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {currentPhase.aiFeatures.map((feature, idx) => (
                            <Badge key={idx} className="bg-gradient-to-r from-purple-600 to-pink-600">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentPhase.entities && (
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-2">Related Entities</h3>
                        <div className="flex flex-wrap gap-2">
                          {currentPhase.entities.map((entity, idx) => (
                            <Badge key={idx} variant="outline">
                              {entity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentPhase.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-900">
                          <strong>Note:</strong> {currentPhase.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entity Documentation */}
          <TabsContent value="entities" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Core Entities</CardTitle>
                <CardDescription>
                  Key database entities used throughout the 8-phase workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ENTITY_REFERENCE.map((entity) => (
                    <div key={entity.name} className="border rounded-lg p-4 bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{entity.name}</h3>
                      <p className="text-sm text-slate-600 mb-3">{entity.description}</p>
                      <div>
                        <p className="text-sm font-semibold text-slate-700 mb-2">Key Fields:</p>
                        <div className="flex flex-wrap gap-2">
                          {entity.keyFields.map((field, idx) => (
                            <code key={idx} className="bg-slate-800 text-green-400 px-2 py-1 rounded text-xs">
                              {field}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mapping Documentation */}
          <TabsContent value="mapping" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Phase → Status → Kanban Mapping</CardTitle>
                <CardDescription>
                  How phases map to proposal statuses and Kanban board columns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {STATUS_PHASE_MAPPING.map((mapping, idx) => (
                    <div key={idx} className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center gap-3 mb-4">
                        <Badge className="text-base px-4 py-1 capitalize bg-blue-600">
                          {mapping.status}
                        </Badge>
                        <span className="text-slate-600">{mapping.description}</span>
                      </div>
                      
                      <div className="grid gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-2">Phases:</p>
                          <div className="flex flex-wrap gap-2">
                            {mapping.phases.map((phase) => {
                              const phaseDoc = PHASE_DOCUMENTATION.find(p => p.id === phase);
                              return (
                                <Badge key={phase} variant="outline" className="text-sm">
                                  {phaseDoc?.label}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-2">Kanban Columns:</p>
                          <div className="flex flex-wrap gap-2">
                            {mapping.phases.map((phase) => {
                              const phaseDoc = PHASE_DOCUMENTATION.find(p => p.id === phase);
                              return phaseDoc?.kanbanColumns.map((col, colIdx) => (
                                <Badge key={`${phase}-${colIdx}`} className="bg-slate-700">
                                  {col}
                                </Badge>
                              ));
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 mb-2">Important Notes:</h3>
                    <ul className="space-y-1 text-sm text-amber-800">
                      <li>• Status automatically updates based on current_phase</li>
                      <li>• Kanban columns are mapped via phase_mapping field in KanbanConfig</li>
                      <li>• Multiple Kanban columns can map to the same phase</li>
                      <li>• Once status is "submitted", it no longer auto-updates</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Reference */}
          <TabsContent value="api" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>API Reference</CardTitle>
                <CardDescription>
                  Common API operations for the 8-phase workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Create New Proposal</h3>
                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`const proposal = await base44.entities.Proposal.create({
  proposal_name: "New Proposal",
  organization_id: organization.id,
  current_phase: "phase1",
  status: "evaluating"
});`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Update Phase</h3>
                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`await base44.entities.Proposal.update(proposalId, {
  current_phase: "phase2",
  status: getKanbanStatusFromPhase("phase2")
});`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Load Phase Data</h3>
                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`const proposals = await base44.entities.Proposal.filter({
  id: proposalId,
  organization_id: organization.id
}, '-created_date', 1);

const proposal = proposals[0];`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Auto-Save on Navigation</h3>
                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`const handleNext = async () => {
  // Validate minimum data
  if (!proposalData.proposal_name?.trim()) {
    alert("Please enter Proposal Name");
    return;
  }

  // Save current state
  const savedId = await saveProposal();
  
  // Move to next phase
  const currentIndex = PHASES.findIndex(p => p.id === currentPhase);
  if (currentIndex < PHASES.length - 1) {
    setCurrentPhase(PHASES[currentIndex + 1].id);
  }
};`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Guide */}
          <TabsContent value="testing" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Comprehensive Testing Guide</CardTitle>
                <CardDescription>
                  Step-by-step testing procedures for the 8-phase workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Testing Prerequisites
                    </h3>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li>✓ User account with organization created</li>
                      <li>✓ Sample data cleared (if applicable)</li>
                      <li>✓ Organization has active subscription</li>
                      <li>✓ All entities accessible and created</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Test 1: Create New Proposal Flow</h3>
                    <ol className="space-y-3 text-sm">
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">1.</span>
                        <div>
                          <strong>Navigate to ProposalBuilder</strong>
                          <p className="text-slate-600 mt-1">Should start at Phase 1 with empty form</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">2.</span>
                        <div>
                          <strong>Enter Proposal Name</strong>
                          <p className="text-slate-600 mt-1">Required field - try leaving blank and clicking Next (should show alert)</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">3.</span>
                        <div>
                          <strong>Select Prime Contractor</strong>
                          <p className="text-slate-600 mt-1">Choose from organization or teaming partners</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">4.</span>
                        <div>
                          <strong>Click Next</strong>
                          <p className="text-slate-600 mt-1">Should auto-save and navigate to Phase 2</p>
                          <p className="text-amber-600 mt-1">✓ Check for "Last saved [time]" message</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">5.</span>
                        <div>
                          <strong>Verify Phase 2 Loads</strong>
                          <p className="text-slate-600 mt-1">Should see search fields for resources and documents</p>
                        </div>
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Test 2: Navigate All 8 Phases</h3>
                    <div className="space-y-3 text-sm">
                      {PHASE_DOCUMENTATION.map((phase, idx) => (
                        <div key={phase.id} className="border-l-4 border-blue-600 pl-4 py-2">
                          <strong className="text-slate-900">{phase.label}</strong>
                          <p className="text-slate-600 mt-1">✓ Verify phase loads without errors</p>
                          <p className="text-slate-600">✓ Check auto-save on navigation</p>
                          {phase.aiFeatures && (
                            <p className="text-purple-600">✓ Test AI features: {phase.aiFeatures.join(', ')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Test 3: Data Persistence</h3>
                    <ol className="space-y-3 text-sm">
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">1.</span>
                        <div>
                          <strong>Enter data in Phase 2</strong>
                          <p className="text-slate-600 mt-1">Link some resources</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">2.</span>
                        <div>
                          <strong>Navigate to Phase 3</strong>
                          <p className="text-slate-600 mt-1">Should auto-save Phase 2 data</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">3.</span>
                        <div>
                          <strong>Go back to Phase 2</strong>
                          <p className="text-slate-600 mt-1">Data should still be there</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">4.</span>
                        <div>
                          <strong>Navigate to Pipeline</strong>
                          <p className="text-slate-600 mt-1">Proposal should appear in correct Kanban column</p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-bold text-blue-600 flex-shrink-0">5.</span>
                        <div>
                          <strong>Click on proposal card</strong>
                          <p className="text-slate-600 mt-1">Should open at last saved phase with all data intact</p>
                        </div>
                      </li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Test 4: Kanban Integration</h3>
                    <ol className="space-y-3 text-sm">
                      <li>✓ Create proposal in Phase 1 - should appear in "New" or "Prime Selection" column</li>
                      <li>✓ Move to Phase 2 - should move to "Gather Docs" column</li>
                      <li>✓ Progress to Phase 7 - status should change to "in_progress"</li>
                      <li>✓ Verify all phase transitions update Kanban board correctly</li>
                    </ol>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">Success Criteria</h3>
                    <ul className="space-y-1 text-sm text-green-800">
                      <li>✓ All 8 phases load without errors</li>
                      <li>✓ Auto-save works on every phase navigation</li>
                      <li>✓ Data persists across sessions</li>
                      <li>✓ Kanban board correctly reflects proposal phase</li>
                      <li>✓ No console errors during navigation</li>
                      <li>✓ Phase 7 (Pricing) loads all tabs correctly</li>
                      <li>✓ Phase 8 (Finalize) submission readiness works</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}