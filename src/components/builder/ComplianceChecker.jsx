import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield,
  Check,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Sparkles,
  FileText,
  Loader2,
  Plus,
  Eye,
  TrendingUp,
  Target,
  Zap
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ComplianceChecker({ proposalId, organizationId }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [isRunningGapAnalysis, setIsRunningGapAnalysis] = useState(false);
  const [gapAnalysisResults, setGapAnalysisResults] = useState(null);
  const [selectedRequirement, setSelectedRequirement] = useState(null);

  const { data: requirements, isLoading } = useQuery({
    queryKey: ['compliance-requirements', proposalId],
    queryFn: async () => {
      if (!proposalId || !organizationId) return [];
      return base44.entities.ComplianceRequirement.filter({
        proposal_id: proposalId,
        organization_id: organizationId
      }, '-created_date');
    },
    initialData: [],
    enabled: !!proposalId && !!organizationId,
  });

  const { data: proposalSections } = useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalSection.filter({ proposal_id: proposalId });
    },
    initialData: [],
    enabled: !!proposalId,
  });

  const updateRequirementMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.ComplianceRequirement.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements', proposalId] });
    },
  });

  const runGapAnalysis = async () => {
    if (!proposalId || requirements.length === 0 || proposalSections.length === 0) {
      alert("Please ensure you have both requirements and proposal sections before running gap analysis");
      return;
    }

    setIsRunningGapAnalysis(true);
    setGapAnalysisResults(null);

    try {
      const prompt = `You are a proposal compliance expert. Analyze this proposal for compliance gaps.

**PROPOSAL REQUIREMENTS:**
${requirements.map((req, idx) => `
${idx + 1}. ${req.requirement_title}
   - ID: ${req.requirement_id}
   - Type: ${req.requirement_type}
   - Risk: ${req.risk_level}
   - Description: ${req.requirement_description}
   - Current Status: ${req.compliance_status}
   - Addressed in: ${req.addressed_in_sections?.join(', ') || 'None'}
`).join('\n')}

**PROPOSAL SECTIONS:**
${proposalSections.map(section => `
- ${section.section_name} (${section.section_type})
  Content length: ${section.content?.length || 0} chars
  Word count: ${section.word_count || 0} words
`).join('\n')}

**ANALYZE AND RETURN JSON:**
{
  "overall_compliance_score": number (0-100),
  "gaps": [
    {
      "requirement_id": "string",
      "requirement_title": "string",
      "severity": "critical|high|medium|low",
      "gap_description": "string (what's missing)",
      "recommended_action": "string (how to fix it)",
      "recommended_section": "string (which section should address this)"
    }
  ],
  "well_addressed": [
    {
      "requirement_id": "string",
      "requirement_title": "string",
      "addressed_in_section": "string"
    }
  ],
  "formatting_issues": [
    {
      "issue": "string",
      "severity": "critical|high|medium|low",
      "recommendation": "string"
    }
  ],
  "missing_sections": ["string"],
  "strengths": ["string"],
  "priority_actions": ["string"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_compliance_score: { type: "number" },
            gaps: { type: "array" },
            well_addressed: { type: "array" },
            formatting_issues: { type: "array" },
            missing_sections: { type: "array" },
            strengths: { type: "array" },
            priority_actions: { type: "array" }
          }
        }
      });

      setGapAnalysisResults(result);

      if (result.gaps) {
        for (const gap of result.gaps) {
          const req = requirements.find(r => r.requirement_id === gap.requirement_id);
          if (req && req.compliance_status === 'compliant') {
            await updateRequirementMutation.mutateAsync({
              id: req.id,
              data: { compliance_status: 'needs_review' }
            });
          }
        }
      }

    } catch (error) {
      console.error("Error running gap analysis:", error);
      alert("Error running gap analysis. Please try again.");
    } finally {
      setIsRunningGapAnalysis(false);
    }
  };

  const extractRequirements = async () => {
    if (!proposalId || !organizationId) {
      alert("Please save the proposal first");
      return;
    }

    setIsExtracting(true);

    try {
      const solicitationDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: organizationId
      });

      const fileUrls = solicitationDocs
        .filter(doc => doc.file_url && doc.document_type !== 'reference')
        .map(doc => doc.file_url)
        .slice(0, 10);

      if (fileUrls.length === 0) {
        alert("Please upload solicitation documents first in Phase 3");
        setIsExtracting(false);
        return;
      }

      const prompt = `Extract all compliance requirements from these solicitation documents.
      
Return as JSON array with this structure:
{
  "requirements": [
    {
      "requirement_id": "string",
      "requirement_title": "string",
      "requirement_description": "string",
      "requirement_type": "technical|submission_format|administrative|certification|solicitation_specific",
      "requirement_category": "mandatory|desirable",
      "requirement_source": "string (e.g., Section L.3.2)",
      "risk_level": "low|medium|high|critical"
    }
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls,
        response_json_schema: {
          type: "object",
          properties: {
            requirements: { type: "array" }
          }
        }
      });

      if (result.requirements && result.requirements.length > 0) {
        let count = 0;
        for (const req of result.requirements) {
          await base44.entities.ComplianceRequirement.create({
            proposal_id: proposalId,
            organization_id: organizationId,
            requirement_id: req.requirement_id || `EXTRACT-${Date.now()}-${count}`,
            requirement_title: req.requirement_title,
            requirement_type: req.requirement_type || "solicitation_specific",
            requirement_category: req.requirement_category || "mandatory",
            requirement_description: req.requirement_description,
            requirement_source: req.requirement_source,
            compliance_status: "not_started",
            risk_level: req.risk_level || "medium",
            ai_detected: true,
            ai_confidence: 80
          });
          count++;
        }

        queryClient.invalidateQueries({ queryKey: ['compliance-requirements', proposalId] });
        alert(`✓ Extracted ${count} requirements!`);
      }
    } catch (error) {
      console.error("Error extracting requirements:", error);
      alert("Error extracting requirements. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const autoMapSections = async () => {
    if (!proposalId || requirements.length === 0 || proposalSections.length === 0) {
      alert("Please ensure you have both requirements and proposal sections");
      return;
    }

    setIsAutoMapping(true);

    try {
      const prompt = `Map compliance requirements to proposal sections.

**REQUIREMENTS:**
${requirements.map(r => `${r.requirement_id}: ${r.requirement_title} (${r.requirement_type})`).join('\n')}

**SECTIONS:**
${proposalSections.map(s => `${s.id}: ${s.section_name} (${s.section_type})`).join('\n')}

Return JSON array of mappings:
{
  "mappings": [
    {
      "requirement_id": "string",
      "section_ids": ["string"]
    }
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            mappings: { type: "array" }
          }
        }
      });

      if (result.mappings) {
        for (const mapping of result.mappings) {
          const req = requirements.find(r => r.requirement_id === mapping.requirement_id);
          if (req) {
            await updateRequirementMutation.mutateAsync({
              id: req.id,
              data: { addressed_in_sections: mapping.section_ids }
            });
          }
        }
        alert("✓ Auto-mapped requirements to sections!");
      }
    } catch (error) {
      console.error("Error auto-mapping:", error);
      alert("Error auto-mapping sections. Please try again.");
    } finally {
      setIsAutoMapping(false);
    }
  };

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = req.requirement_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         req.requirement_description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || req.requirement_type === filterType;
    const matchesStatus = filterStatus === "all" || req.compliance_status === filterStatus;
    const matchesRisk = filterRisk === "all" || req.risk_level === filterRisk;
    return matchesSearch && matchesType && matchesStatus && matchesRisk;
  });

  const stats = {
    total: requirements.length,
    compliant: requirements.filter(r => r.compliance_status === 'compliant').length,
    inProgress: requirements.filter(r => r.compliance_status === 'in_progress').length,
    notStarted: requirements.filter(r => r.compliance_status === 'not_started').length,
    highRisk: requirements.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').length,
  };

  const compliancePercentage = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0;

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'non_compliant': return 'bg-red-100 text-red-700';
      case 'needs_review': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="matrix" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matrix">
            <Shield className="w-4 h-4 mr-2" />
            Compliance Matrix
          </TabsTrigger>
          <TabsTrigger value="gap-analysis">
            <Target className="w-4 h-4 mr-2" />
            Gap Analysis
            {gapAnalysisResults && (
              <Badge className="ml-2 bg-red-600">{gapAnalysisResults.gaps?.length || 0}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="readiness">
            <Zap className="w-4 h-4 mr-2" />
            Submission Readiness
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Compliant</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{stats.compliant}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">High Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{stats.highRisk}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{compliancePercentage}%</p>
                <Progress value={compliancePercentage} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle>Compliance Requirements</CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Track and manage all solicitation requirements
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={extractRequirements}
                    disabled={isExtracting}
                    variant="outline"
                    size="sm"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Extract Requirements
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={autoMapSections}
                    disabled={isAutoMapping || requirements.length === 0}
                    variant="outline"
                    size="sm"
                  >
                    {isAutoMapping ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mapping...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Auto-Map Sections
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search requirements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="submission_format">Submission Format</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="solicitation_specific">Solicitation Specific</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterRisk} onValueChange={setFilterRisk}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-slate-600">Loading requirements...</p>
                </div>
              ) : filteredRequirements.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium mb-2">No requirements found</p>
                  <p className="text-sm mb-4">
                    {requirements.length === 0 
                      ? "Use AI Extract Requirements to automatically identify compliance requirements from your solicitation documents" 
                      : "Try adjusting your filters"}
                  </p>
                  {requirements.length === 0 && (
                    <Button onClick={extractRequirements} disabled={isExtracting}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Extract Requirements
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequirements.map((req) => (
                    <Dialog key={req.id}>
                      <DialogTrigger asChild>
                        <Card className="hover:shadow-md transition-all cursor-pointer border-l-4"
                          style={{ borderLeftColor: 
                            req.risk_level === 'critical' ? '#dc2626' :
                            req.risk_level === 'high' ? '#ea580c' :
                            req.risk_level === 'medium' ? '#f59e0b' :
                            '#22c55e'
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-slate-900">{req.requirement_title}</h4>
                                  {req.ai_detected && (
                                    <Badge variant="outline" className="text-xs">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      AI
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {req.requirement_id}
                                  </Badge>
                                  <Badge className={`text-xs ${getRiskColor(req.risk_level)}`}>
                                    {req.risk_level} risk
                                  </Badge>
                                  <Badge className={`text-xs ${getStatusColor(req.compliance_status)}`}>
                                    {req.compliance_status?.replace('_', ' ')}
                                  </Badge>
                                  {req.requirement_source && (
                                    <Badge variant="secondary" className="text-xs">
                                      {req.requirement_source}
                                    </Badge>
                                  )}
                                </div>
                                {req.requirement_description && (
                                  <p className="text-sm text-slate-600 line-clamp-2">
                                    {req.requirement_description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                {req.compliance_status === 'compliant' ? (
                                  <Check className="w-6 h-6 text-green-600" />
                                ) : req.compliance_status === 'non_compliant' ? (
                                  <AlertTriangle className="w-6 h-6 text-red-600" />
                                ) : (
                                  <Clock className="w-6 h-6 text-slate-400" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{req.requirement_title}</DialogTitle>
                          <DialogDescription>
                            {req.requirement_id} • {req.requirement_source}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Description</Label>
                            <p className="text-sm text-slate-600 mt-1">
                              {req.requirement_description || "No description provided"}
                            </p>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label>Compliance Status</Label>
                              <Select
                                value={req.compliance_status}
                                onValueChange={(value) => {
                                  updateRequirementMutation.mutate({
                                    id: req.id,
                                    data: { compliance_status: value }
                                  });
                                }}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="not_started">Not Started</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="compliant">Compliant</SelectItem>
                                  <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                                  <SelectItem value="needs_review">Needs Review</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Risk Level</Label>
                              <Select
                                value={req.risk_level}
                                onValueChange={(value) => {
                                  updateRequirementMutation.mutate({
                                    id: req.id,
                                    data: { risk_level: value }
                                  });
                                }}
                              >
                                <SelectTrigger className="mt-1">
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
                          {req.addressed_in_sections && req.addressed_in_sections.length > 0 && (
                            <div>
                              <Label>Addressed In Sections</Label>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {req.addressed_in_sections.map((sectionId, idx) => {
                                  const section = proposalSections.find(s => s.id === sectionId);
                                  return (
                                    <Badge key={idx} variant="secondary">
                                      {section?.section_name || sectionId}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gap-analysis" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    AI Gap Analysis
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">
                    Identify missing requirements and compliance gaps before submission
                  </p>
                </div>
                <Button
                  onClick={runGapAnalysis}
                  disabled={isRunningGapAnalysis || requirements.length === 0 || proposalSections.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isRunningGapAnalysis ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Run Gap Analysis
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {!gapAnalysisResults ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Gap Analysis Yet</h3>
                  <p className="text-slate-600 mb-4">
                    Run AI-powered gap analysis to identify compliance issues and missing content
                  </p>
                  <Button
                    onClick={runGapAnalysis}
                    disabled={requirements.length === 0 || proposalSections.length === 0}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Run Analysis
                  </Button>
                  {(requirements.length === 0 || proposalSections.length === 0) && (
                    <p className="text-sm text-amber-600 mt-4">
                      ⚠️ Need requirements and proposal sections to run analysis
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <Card className="border-2" style={{
                    borderColor: gapAnalysisResults.overall_compliance_score >= 80 ? '#22c55e' :
                                 gapAnalysisResults.overall_compliance_score >= 60 ? '#f59e0b' : '#dc2626',
                    backgroundColor: gapAnalysisResults.overall_compliance_score >= 80 ? '#f0fdf4' :
                                     gapAnalysisResults.overall_compliance_score >= 60 ? '#fffbeb' : '#fef2f2'
                  }}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-1">Overall Compliance Score</h3>
                          <p className="text-sm text-slate-600">Based on requirement coverage and content quality</p>
                        </div>
                        <div className="text-right">
                          <p className="text-5xl font-bold" style={{
                            color: gapAnalysisResults.overall_compliance_score >= 80 ? '#16a34a' :
                                   gapAnalysisResults.overall_compliance_score >= 60 ? '#d97706' : '#dc2626'
                          }}>
                            {gapAnalysisResults.overall_compliance_score}%
                          </p>
                          <Progress value={gapAnalysisResults.overall_compliance_score} className="mt-2 w-32" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {gapAnalysisResults.priority_actions && gapAnalysisResults.priority_actions.length > 0 && (
                    <Card className="border-amber-200 bg-amber-50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          Priority Actions Required
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {gapAnalysisResults.priority_actions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              <span className="flex-1 text-amber-900">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {gapAnalysisResults.gaps && gapAnalysisResults.gaps.length > 0 && (
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="w-5 h-5" />
                          Identified Gaps ({gapAnalysisResults.gaps.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {gapAnalysisResults.gaps.map((gap, idx) => (
                            <Card key={idx} className={`border-2 ${
                              gap.severity === 'critical' ? 'border-red-300 bg-red-50' :
                              gap.severity === 'high' ? 'border-orange-300 bg-orange-50' :
                              gap.severity === 'medium' ? 'border-amber-300 bg-amber-50' :
                              'border-yellow-300 bg-yellow-50'
                            }`}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <Badge className={
                                    gap.severity === 'critical' ? 'bg-red-600' :
                                    gap.severity === 'high' ? 'bg-orange-600' :
                                    gap.severity === 'medium' ? 'bg-amber-600' :
                                    'bg-yellow-600'
                                  }>
                                    {gap.severity}
                                  </Badge>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-slate-900 mb-1">
                                      {gap.requirement_title}
                                    </h4>
                                    <p className="text-sm text-slate-700 mb-2">
                                      <strong>Gap:</strong> {gap.gap_description}
                                    </p>
                                    <div className="p-2 bg-white rounded border">
                                      <p className="text-sm text-green-700">
                                        <strong>✓ Recommended Action:</strong> {gap.recommended_action}
                                      </p>
                                      {gap.recommended_section && (
                                        <p className="text-xs text-slate-600 mt-1">
                                          <FileText className="w-3 h-3 inline mr-1" />
                                          Should be addressed in: <strong>{gap.recommended_section}</strong>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {gapAnalysisResults.well_addressed && gapAnalysisResults.well_addressed.length > 0 && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2 text-green-700">
                          <Check className="w-5 h-5" />
                          Well Addressed ({gapAnalysisResults.well_addressed.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-3">
                          {gapAnalysisResults.well_addressed.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border border-green-200">
                              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {item.requirement_title}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {item.addressed_in_section}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {gapAnalysisResults.strengths && gapAnalysisResults.strengths.length > 0 && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2 text-green-700">
                          <TrendingUp className="w-5 h-5" />
                          Proposal Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {gapAnalysisResults.strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
                              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Submission Readiness Check
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Final checklist before proposal submission
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {stats.compliant === stats.total && stats.total > 0 ? (
                      <Check className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    )}
                    <div>
                      <p className="font-semibold">All Requirements Addressed</p>
                      <p className="text-sm text-slate-600">
                        {stats.compliant} of {stats.total} requirements marked compliant
                      </p>
                    </div>
                  </div>
                  <Badge className={stats.compliant === stats.total && stats.total > 0 ? 'bg-green-600' : 'bg-amber-600'}>
                    {stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {stats.highRisk === 0 ? (
                      <Check className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    )}
                    <div>
                      <p className="font-semibold">High-Risk Items Resolved</p>
                      <p className="text-sm text-slate-600">
                        {stats.highRisk} high/critical risk items remaining
                      </p>
                    </div>
                  </div>
                  <Badge className={stats.highRisk === 0 ? 'bg-green-600' : 'bg-red-600'}>
                    {stats.highRisk}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {proposalSections.length > 0 ? (
                      <Check className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    )}
                    <div>
                      <p className="font-semibold">Proposal Content Written</p>
                      <p className="text-sm text-slate-600">
                        {proposalSections.length} sections created
                      </p>
                    </div>
                  </div>
                  <Badge className={proposalSections.length > 0 ? 'bg-green-600' : 'bg-amber-600'}>
                    {proposalSections.length}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {gapAnalysisResults ? (
                      gapAnalysisResults.overall_compliance_score >= 80 ? (
                        <Check className="w-6 h-6 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                      )
                    ) : (
                      <Clock className="w-6 h-6 text-slate-400" />
                    )}
                    <div>
                      <p className="font-semibold">Gap Analysis Complete</p>
                      <p className="text-sm text-slate-600">
                        {gapAnalysisResults ? `Score: ${gapAnalysisResults.overall_compliance_score}%` : 'Not run yet'}
                      </p>
                    </div>
                  </div>
                  {gapAnalysisResults ? (
                    <Badge className={gapAnalysisResults.overall_compliance_score >= 80 ? 'bg-green-600' : 'bg-amber-600'}>
                      {gapAnalysisResults.overall_compliance_score}%
                    </Badge>
                  ) : (
                    <Button size="sm" onClick={runGapAnalysis}>
                      Run Now
                    </Button>
                  )}
                </div>
              </div>

              {stats.compliant === stats.total && stats.total > 0 && stats.highRisk === 0 && gapAnalysisResults?.overall_compliance_score >= 80 && (
                <div className="mt-6 p-6 bg-green-50 border-2 border-green-200 rounded-lg text-center">
                  <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-900 mb-2">Ready for Submission!</h3>
                  <p className="text-green-700">
                    Your proposal meets all compliance requirements and is ready to submit.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}