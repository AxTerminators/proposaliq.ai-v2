import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  FileText,
  Upload,
  Loader2,
  TrendingUp,
  Eye,
  XCircle,
  Download
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ComplianceMatrixGenerator({ proposal, organization }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [analyzingGaps, setAnalyzingGaps] = useState(false);

  const [formData, setFormData] = useState({
    requirement_id: "",
    requirement_title: "",
    requirement_type: "solicitation_specific",
    requirement_category: "mandatory",
    requirement_description: "",
    requirement_source: "",
    compliance_status: "not_started",
    addressed_in_sections: [],
    evidence_provided: "",
    compliance_notes: "",
    risk_level: "medium"
  });

  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['compliance-requirements', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id || !organization?.id) return [];
      return base44.entities.ComplianceRequirement.filter({
        proposal_id: proposal.id,
        organization_id: organization.id
      }, '-created_date');
    },
    enabled: !!proposal?.id && !!organization?.id
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['proposal-sections', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.ProposalSection.filter({ proposal_id: proposal.id });
    },
    enabled: !!proposal?.id
  });

  const createRequirementMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceRequirement.create({
      ...data,
      proposal_id: proposal.id,
      organization_id: organization.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
      setShowAddDialog(false);
      resetForm();
    }
  });

  const updateRequirementMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceRequirement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
      setEditingRequirement(null);
      resetForm();
    }
  });

  const deleteRequirementMutation = useMutation({
    mutationFn: (id) => base44.entities.ComplianceRequirement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
    }
  });

  const resetForm = () => {
    setFormData({
      requirement_id: "",
      requirement_title: "",
      requirement_type: "solicitation_specific",
      requirement_category: "mandatory",
      requirement_description: "",
      requirement_source: "",
      compliance_status: "not_started",
      addressed_in_sections: [],
      evidence_provided: "",
      compliance_notes: "",
      risk_level: "medium"
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRequirement) {
      updateRequirementMutation.mutate({ id: editingRequirement.id, data: formData });
    } else {
      createRequirementMutation.mutate(formData);
    }
  };

  const handleEdit = (requirement) => {
    setEditingRequirement(requirement);
    setFormData({
      requirement_id: requirement.requirement_id || "",
      requirement_title: requirement.requirement_title || "",
      requirement_type: requirement.requirement_type || "solicitation_specific",
      requirement_category: requirement.requirement_category || "mandatory",
      requirement_description: requirement.requirement_description || "",
      requirement_source: requirement.requirement_source || "",
      compliance_status: requirement.compliance_status || "not_started",
      addressed_in_sections: requirement.addressed_in_sections || [],
      evidence_provided: requirement.evidence_provided || "",
      compliance_notes: requirement.compliance_notes || "",
      risk_level: requirement.risk_level || "medium"
    });
    setShowAddDialog(true);
  };

  const analyzeComplianceGaps = async () => {
    if (requirements.length === 0) {
      alert("No requirements to analyze. Please add or extract requirements first.");
      return;
    }

    setAnalyzingGaps(true);
    try {
      const requirementsSummary = requirements.map(r => ({
        id: r.requirement_id,
        title: r.requirement_title,
        status: r.compliance_status,
        risk: r.risk_level,
        sections: r.addressed_in_sections || []
      }));

      const sectionsSummary = sections.map(s => ({
        id: s.id,
        name: s.section_name,
        type: s.section_type,
        word_count: s.word_count,
        status: s.status
      }));

      const prompt = `You are a compliance expert analyzing proposal compliance. Analyze this proposal's compliance status and provide strategic recommendations.

**COMPLIANCE REQUIREMENTS:**
${JSON.stringify(requirementsSummary, null, 2)}

**PROPOSAL SECTIONS:**
${JSON.stringify(sectionsSummary, null, 2)}

**YOUR TASK:**
Provide a comprehensive compliance analysis with:

1. **Critical Gaps**: Requirements not addressed that could cause rejection
2. **Coverage Analysis**: Which sections address which requirements
3. **Risk Assessment**: High-risk compliance issues
4. **Recommendations**: Specific actions to improve compliance
5. **Compliance Score**: Overall compliance readiness (0-100)
6. **Section-Requirement Mapping**: Suggest which sections should address which requirements

Return detailed JSON following this schema.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_compliance_score: { type: "number", minimum: 0, maximum: 100 },
            compliance_level: { 
              type: "string", 
              enum: ["critical_gaps", "needs_improvement", "good", "excellent"] 
            },
            critical_gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  requirement_id: { type: "string" },
                  requirement_title: { type: "string" },
                  severity: { type: "string", enum: ["critical", "high", "medium"] },
                  impact: { type: "string" },
                  recommended_action: { type: "string" },
                  suggested_section: { type: "string" }
                }
              }
            },
            coverage_analysis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  requirement_id: { type: "string" },
                  requirement_title: { type: "string" },
                  coverage_percentage: { type: "number" },
                  addressed_in: { type: "array", items: { type: "string" } },
                  missing_elements: { type: "array", items: { type: "string" } }
                }
              }
            },
            section_requirement_mapping: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_name: { type: "string" },
                  should_address_requirements: { 
                    type: "array", 
                    items: { type: "string" } 
                  },
                  rationale: { type: "string" }
                }
              }
            },
            strategic_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
                  recommendation: { type: "string" },
                  expected_impact: { type: "string" },
                  estimated_hours: { type: "number" }
                }
              }
            },
            strengths: {
              type: "array",
              items: { type: "string" }
            },
            weaknesses: {
              type: "array",
              items: { type: "string" }
            },
            submission_ready: { type: "boolean" }
          }
        }
      });

      setAiRecommendations(result);
      alert("✓ AI compliance analysis complete!");

    } catch (error) {
      console.error("Error analyzing compliance gaps:", error);
      alert("Error analyzing compliance. Please try again.");
    } finally {
      setAnalyzingGaps(false);
    }
  };

  const smartExtractFromRFP = async () => {
    if (!proposal?.id || !organization?.id) {
      alert("Proposal data required");
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(0);

    try {
      // Get solicitation documents
      const docs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposal.id,
        organization_id: organization.id
      });

      const solicitationDocs = docs.filter(d => 
        ['rfp', 'rfq', 'rfi', 'sow', 'pws'].includes(d.document_type)
      );

      if (solicitationDocs.length === 0) {
        alert("Please upload solicitation documents first (Phase 3)");
        setIsExtracting(false);
        return;
      }

      setExtractionProgress(10);

      // Step 1: Use ExtractDataFromUploadedFile for structured extraction
      const extractionResults = [];
      
      for (let i = 0; i < Math.min(solicitationDocs.length, 3); i++) {
        const doc = solicitationDocs[i];
        setExtractionProgress(10 + (i * 20));

        try {
          const extractionSchema = {
            type: "object",
            properties: {
              requirements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    requirement_id: { type: "string" },
                    requirement_title: { type: "string" },
                    requirement_description: { type: "string" },
                    source_section: { type: "string" },
                    is_mandatory: { type: "boolean" },
                    category: { type: "string" }
                  }
                }
              }
            }
          };

          const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: doc.file_url,
            json_schema: extractionSchema
          });

          if (extracted.status === "success" && extracted.output) {
            extractionResults.push({
              doc_name: doc.file_name,
              data: extracted.output
            });
          }
        } catch (err) {
          console.error(`Error extracting from ${doc.file_name}:`, err);
        }
      }

      setExtractionProgress(60);

      // Step 2: Use AI to analyze and enhance extracted requirements
      const prompt = `You are an expert compliance analyst. Analyze these extracted requirements from RFP documents and create a comprehensive, structured compliance matrix.

**EXTRACTED DATA:**
${JSON.stringify(extractionResults, null, 2)}

**PROPOSAL CONTEXT:**
- Agency: ${proposal.agency_name}
- Project: ${proposal.project_title}
- Type: ${proposal.project_type}

**YOUR TASK:**
Analyze all extracted requirements and:
1. Deduplicate similar requirements
2. Categorize each requirement correctly
3. Assess risk level for each
4. Provide clear, actionable descriptions
5. Identify any implied requirements not explicitly stated
6. Group related requirements

Return a comprehensive requirements list.`;

      setExtractionProgress(70);

      const aiEnhanced = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            requirements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  requirement_id: { type: "string" },
                  requirement_title: { type: "string" },
                  requirement_type: { 
                    type: "string",
                    enum: ["far", "dfars", "agency_specific", "solicitation_specific", "contract_clause", "certification", "submission_format", "other"]
                  },
                  requirement_category: {
                    type: "string",
                    enum: ["mandatory", "desirable", "information_only"]
                  },
                  requirement_description: { type: "string" },
                  requirement_source: { type: "string" },
                  risk_level: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"]
                  },
                  suggested_sections: {
                    type: "array",
                    items: { type: "string" }
                  },
                  rationale: { type: "string" }
                }
              }
            },
            implied_requirements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  requirement_title: { type: "string" },
                  requirement_description: { type: "string" },
                  why_implied: { type: "string" }
                }
              }
            },
            extraction_summary: {
              type: "object",
              properties: {
                total_requirements: { type: "number" },
                mandatory_count: { type: "number" },
                critical_count: { type: "number" },
                key_compliance_areas: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setExtractionProgress(85);

      // Step 3: Create requirements in database
      let createdCount = 0;
      for (const req of aiEnhanced.requirements) {
        await base44.entities.ComplianceRequirement.create({
          proposal_id: proposal.id,
          organization_id: organization.id,
          requirement_id: req.requirement_id || `AUTO-${Date.now()}-${createdCount}`,
          requirement_title: req.requirement_title,
          requirement_type: req.requirement_type || "solicitation_specific",
          requirement_category: req.requirement_category || "mandatory",
          requirement_description: req.requirement_description,
          requirement_source: req.requirement_source || "RFP Document",
          compliance_status: "not_started",
          risk_level: req.risk_level || "medium",
          ai_detected: true,
          ai_confidence: 90,
          compliance_notes: req.rationale || ""
        });
        createdCount++;
      }

      setExtractionProgress(100);
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });

      alert(`✓ Successfully extracted and created ${createdCount} compliance requirements!\n\n${aiEnhanced.extraction_summary?.key_compliance_areas?.length > 0 ? 'Key Areas: ' + aiEnhanced.extraction_summary.key_compliance_areas.join(', ') : ''}`);

    } catch (error) {
      console.error("Error extracting requirements:", error);
      alert("Error extracting requirements: " + error.message);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(0);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      compliant: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
      needs_review: "bg-yellow-100 text-yellow-800",
      non_compliant: "bg-red-100 text-red-800",
      not_started: "bg-slate-100 text-slate-800",
      waived: "bg-purple-100 text-purple-800",
      not_applicable: "bg-slate-100 text-slate-500"
    };
    return colors[status] || colors.not_started;
  };

  const getRiskColor = (risk) => {
    const colors = {
      critical: "text-red-600 bg-red-100",
      high: "text-orange-600 bg-orange-100",
      medium: "text-yellow-600 bg-yellow-100",
      low: "text-green-600 bg-green-100"
    };
    return colors[risk] || colors.medium;
  };

  const stats = {
    total: requirements.length,
    compliant: requirements.filter(r => r.compliance_status === 'compliant').length,
    in_progress: requirements.filter(r => r.compliance_status === 'in_progress').length,
    not_started: requirements.filter(r => r.compliance_status === 'not_started').length,
    critical: requirements.filter(r => r.risk_level === 'critical').length
  };

  const compliancePercentage = stats.total > 0 ? (stats.compliant / stats.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Compliance Matrix</CardTitle>
                <CardDescription>Track and manage all compliance requirements</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={smartExtractFromRFP}
                disabled={isExtracting}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Extract from RFP
                  </>
                )}
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Requirement
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isExtracting && extractionProgress > 0 && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-900">AI Extraction in Progress...</span>
              <span className="text-sm text-indigo-700">{extractionProgress}%</span>
            </div>
            <Progress value={extractionProgress} className="h-2" />
            <p className="text-xs text-indigo-600 mt-2">
              {extractionProgress < 30 && "Reading RFP documents..."}
              {extractionProgress >= 30 && extractionProgress < 60 && "Extracting requirements with AI..."}
              {extractionProgress >= 60 && extractionProgress < 85 && "Analyzing and categorizing..."}
              {extractionProgress >= 85 && "Creating compliance records..."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-900 mb-1">Total</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-900 mb-1">Compliant</p>
                <p className="text-3xl font-bold text-green-600">{stats.compliant}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-900 mb-1">In Progress</p>
                <p className="text-3xl font-bold text-amber-600">{stats.in_progress}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-900 mb-1">Not Started</p>
                <p className="text-3xl font-bold text-slate-600">{stats.not_started}</p>
              </div>
              <XCircle className="w-8 h-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-900 mb-1">Critical</p>
                <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Progress */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Overall Compliance</span>
            <span className="text-2xl font-bold text-indigo-600">{compliancePercentage.toFixed(0)}%</span>
          </div>
          <Progress value={compliancePercentage} className="h-3" />
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={analyzeComplianceGaps}
              disabled={analyzingGaps || requirements.length === 0}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"
            >
              {analyzingGaps ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Analyze Gaps
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {aiRecommendations && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              AI Compliance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Score */}
            <div className="text-center p-6 bg-white rounded-lg">
              <p className="text-5xl font-bold text-indigo-600 mb-2">
                {aiRecommendations.overall_compliance_score}
              </p>
              <p className="text-sm text-slate-600 uppercase tracking-wider">Compliance Score</p>
              <Badge className={`mt-2 ${
                aiRecommendations.compliance_level === 'excellent' ? 'bg-green-600' :
                aiRecommendations.compliance_level === 'good' ? 'bg-blue-600' :
                aiRecommendations.compliance_level === 'needs_improvement' ? 'bg-yellow-600' :
                'bg-red-600'
              } text-white`}>
                {aiRecommendations.compliance_level.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>

            {/* Critical Gaps */}
            {aiRecommendations.critical_gaps?.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Gaps ({aiRecommendations.critical_gaps.length})
                </h4>
                <div className="space-y-2">
                  {aiRecommendations.critical_gaps.map((gap, idx) => (
                    <div key={idx} className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-semibold text-red-900">{gap.requirement_title}</h5>
                        <Badge className="bg-red-600 text-white">{gap.severity}</Badge>
                      </div>
                      <p className="text-sm text-red-800 mb-2">{gap.impact}</p>
                      <p className="text-sm text-green-800">
                        <strong>Action:</strong> {gap.recommended_action}
                      </p>
                      {gap.suggested_section && (
                        <p className="text-xs text-slate-600 mt-1">
                          → Address in: {gap.suggested_section}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Recommendations */}
            {aiRecommendations.strategic_recommendations?.length > 0 && (
              <div>
                <h4 className="font-semibold text-indigo-900 mb-3">Strategic Recommendations</h4>
                <div className="space-y-2">
                  {aiRecommendations.strategic_recommendations.slice(0, 5).map((rec, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={
                            rec.priority === 'urgent' ? 'bg-red-600' :
                            rec.priority === 'high' ? 'bg-orange-600' :
                            rec.priority === 'medium' ? 'bg-yellow-600' :
                            'bg-green-600'
                          }>{rec.priority.toUpperCase()}</Badge>
                          {rec.estimated_hours && (
                            <Badge variant="outline" className="text-xs">~{rec.estimated_hours}h</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-900 font-medium">{rec.recommendation}</p>
                        <p className="text-xs text-slate-600 mt-1">{rec.expected_impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h5 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Strengths
                </h5>
                <ul className="text-sm text-green-800 space-y-1">
                  {aiRecommendations.strengths?.map((str, idx) => (
                    <li key={idx}>• {str}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <h5 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Weaknesses
                </h5>
                <ul className="text-sm text-amber-800 space-y-1">
                  {aiRecommendations.weaknesses?.map((weak, idx) => (
                    <li key={idx}>• {weak}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirements List */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Requirements ({requirements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600">Loading requirements...</p>
            </div>
          ) : requirements.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Requirements Yet</h3>
              <p className="text-slate-600 mb-4">
                Use "AI Extract from RFP" to automatically extract requirements, or add them manually.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requirements.map((req) => (
                <div key={req.id} className="p-4 border-2 rounded-lg hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{req.requirement_title}</h4>
                        {req.ai_detected && (
                          <Badge variant="outline" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Detected
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className={getStatusColor(req.compliance_status)}>
                          {req.compliance_status.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={getRiskColor(req.risk_level)}>
                          {req.risk_level} risk
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {req.requirement_type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{req.requirement_description}</p>
                      {req.requirement_source && (
                        <p className="text-xs text-slate-500">
                          <strong>Source:</strong> {req.requirement_source}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(req)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Delete this requirement?')) {
                            deleteRequirementMutation.mutate(req.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRequirement ? 'Edit Requirement' : 'Add Compliance Requirement'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Requirement ID</label>
                <Input
                  value={formData.requirement_id}
                  onChange={(e) => setFormData({...formData, requirement_id: e.target.value})}
                  placeholder="e.g., L-001"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select
                  value={formData.requirement_type}
                  onValueChange={(value) => setFormData({...formData, requirement_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="far">FAR</SelectItem>
                    <SelectItem value="dfars">DFARS</SelectItem>
                    <SelectItem value="agency_specific">Agency Specific</SelectItem>
                    <SelectItem value="solicitation_specific">Solicitation Specific</SelectItem>
                    <SelectItem value="contract_clause">Contract Clause</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="submission_format">Submission Format</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input
                required
                value={formData.requirement_title}
                onChange={(e) => setFormData({...formData, requirement_title: e.target.value})}
                placeholder="Brief title of the requirement"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={formData.requirement_description}
                onChange={(e) => setFormData({...formData, requirement_description: e.target.value})}
                placeholder="Detailed description"
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select
                  value={formData.requirement_category}
                  onValueChange={(value) => setFormData({...formData, requirement_category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mandatory">Mandatory</SelectItem>
                    <SelectItem value="desirable">Desirable</SelectItem>
                    <SelectItem value="information_only">Information Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={formData.compliance_status}
                  onValueChange={(value) => setFormData({...formData, compliance_status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                    <SelectItem value="waived">Waived</SelectItem>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Risk Level</label>
                <Select
                  value={formData.risk_level}
                  onValueChange={(value) => setFormData({...formData, risk_level: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Source</label>
              <Input
                value={formData.requirement_source}
                onChange={(e) => setFormData({...formData, requirement_source: e.target.value})}
                placeholder="e.g., RFP Section L.3.2"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Compliance Notes</label>
              <Textarea
                value={formData.compliance_notes}
                onChange={(e) => setFormData({...formData, compliance_notes: e.target.value})}
                placeholder="Notes about compliance status and actions"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setEditingRequirement(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingRequirement ? 'Update' : 'Create'} Requirement
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}