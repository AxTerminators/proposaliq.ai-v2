import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Loader2,
  FileText,
  Search,
  Download,
  AlertCircle,
  BookOpen,
  Scale,
  Target,
  TrendingUp
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ComplianceChecker({ proposalId, proposalData, organizationId }) {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [complianceScore, setComplianceScore] = useState(0);

  const { data: requirements, isLoading } = useQuery({
    queryKey: ['compliance-requirements', proposalId],
    queryFn: () => proposalId ? base44.entities.ComplianceRequirement.filter({ proposal_id: proposalId }, '-risk_level,-compliance_status') : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: solicitationDocs } = useQuery({
    queryKey: ['solicitation-docs', proposalId],
    queryFn: () => proposalId ? base44.entities.SolicitationDocument.filter({ proposal_id: proposalId }) : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: proposalSections } = useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: () => proposalId ? base44.entities.ProposalSection.filter({ proposal_id: proposalId }) : [],
    initialData: [],
    enabled: !!proposalId
  });

  const updateRequirementMutation = useMutation({
    mutationFn: async ({ requirementId, updates }) => {
      await base44.entities.ComplianceRequirement.update(requirementId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
      setShowDetailDialog(false);
    }
  });

  const createRequirementMutation = useMutation({
    mutationFn: async (requirementData) => {
      await base44.entities.ComplianceRequirement.create({
        ...requirementData,
        proposal_id: proposalId,
        organization_id: organizationId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
    }
  });

  const runComplianceScan = async () => {
    if (!proposalId || !organizationId) {
      alert("Please save the proposal first");
      return;
    }

    setIsScanning(true);
    try {
      const fileUrls = solicitationDocs
        .filter(doc => doc.file_url)
        .map(doc => doc.file_url)
        .slice(0, 10);

      const sectionContent = proposalSections.map(s => ({
        name: s.section_name,
        content: s.content?.replace(/<[^>]*>/g, '').substring(0, 1000)
      }));

      const prompt = `You are an expert government contracting compliance analyst with deep knowledge of FAR (Federal Acquisition Regulation) and DFARS (Defense Federal Acquisition Regulation Supplement).

**PROPOSAL DETAILS:**
- Type: ${proposalData.project_type}
- Agency: ${proposalData.agency_name}
- Solicitation: ${proposalData.solicitation_number || 'N/A'}
- Project: ${proposalData.project_title}

**SOLICITATION DOCUMENTS:**
${fileUrls.length} documents uploaded for analysis

**CURRENT PROPOSAL SECTIONS:**
${sectionContent.map(s => `- ${s.name}`).join('\n')}

**YOUR TASK:**
1. Analyze the solicitation documents for ALL compliance requirements
2. Check against FAR/DFARS mandatory clauses
3. Identify agency-specific requirements
4. Verify format/submission requirements
5. Check current proposal sections for compliance
6. Identify gaps and risks

Return comprehensive JSON:
{
  "overall_compliance_score": <number 0-100>,
  "requirements": [
    {
      "requirement_id": "<string: e.g., FAR-52.215-1 or SOL-L-3.2>",
      "requirement_title": "<string>",
      "requirement_type": "<far|dfars|agency_specific|solicitation_specific|contract_clause|certification|submission_format>",
      "requirement_category": "<mandatory|desirable|information_only>",
      "requirement_description": "<detailed description>",
      "requirement_source": "<where found: e.g., RFP Section L, FAR Part 15>",
      "compliance_status": "<not_started|in_progress|compliant|non_compliant|needs_review>",
      "addressed_in_sections": [<section names that address this>],
      "evidence_provided": "<what evidence exists or 'None'>",
      "risk_level": "<low|medium|high|critical>",
      "remediation_actions": [<specific actions needed>],
      "ai_confidence": <number 0-100>,
      "page_limit": <number or null>,
      "format_requirements": {
        "font": "<font name or null>",
        "font_size": <number or null>,
        "margins": "<margin spec or null>",
        "line_spacing": <number or null>
      }
    }
  ],
  "critical_gaps": [
    {
      "gap": "<what's missing>",
      "impact": "<why it matters>",
      "recommendation": "<what to do>"
    }
  ],
  "far_dfars_clauses": [
    {
      "clause_number": "<e.g., FAR 52.215-1>",
      "clause_title": "<clause name>",
      "applicable": <boolean>,
      "compliance_status": "<compliant|non_compliant|needs_review>",
      "notes": "<specific compliance notes>"
    }
  ],
  "format_compliance": {
    "page_limits_met": <boolean>,
    "font_requirements_met": <boolean>,
    "margin_requirements_met": <boolean>,
    "issues": [<list of format issues>]
  },
  "submission_checklist": [
    {
      "item": "<submission requirement>",
      "status": "<complete|incomplete|not_applicable>",
      "notes": "<details>"
    }
  ],
  "recommendations": [
    {
      "priority": "<high|medium|low>",
      "recommendation": "<actionable recommendation>",
      "deadline": "<suggested deadline>"
    }
  ]
}

Be thorough and specific. Flag everything that could cause proposal rejection.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            overall_compliance_score: { type: "number" },
            requirements: { type: "array" },
            critical_gaps: { type: "array" },
            far_dfars_clauses: { type: "array" },
            format_compliance: { type: "object" },
            submission_checklist: { type: "array" },
            recommendations: { type: "array" }
          }
        }
      });

      setScanResults(result);
      setComplianceScore(result.overall_compliance_score);

      // Create/update requirements in database
      for (const req of result.requirements || []) {
        await createRequirementMutation.mutateAsync({
          ...req,
          ai_detected: true,
          last_checked_date: new Date().toISOString()
        });
      }

      alert(`✓ Compliance scan complete! Found ${result.requirements?.length || 0} requirements.`);

    } catch (error) {
      console.error("Error running compliance scan:", error);
      alert("Error running compliance scan. Please try again.");
    }
    setIsScanning(false);
  };

  const getStatusColor = (status) => {
    if (status === 'compliant') return 'bg-green-100 text-green-700 border-green-300';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-700 border-blue-300';
    if (status === 'non_compliant') return 'bg-red-100 text-red-700 border-red-300';
    if (status === 'needs_review') return 'bg-amber-100 text-amber-700 border-amber-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const getRiskColor = (risk) => {
    if (risk === 'critical') return 'bg-red-600 text-white';
    if (risk === 'high') return 'bg-orange-600 text-white';
    if (risk === 'medium') return 'bg-amber-600 text-white';
    return 'bg-blue-600 text-white';
  };

  const statusCounts = requirements.reduce((acc, req) => {
    acc[req.compliance_status] = (acc[req.compliance_status] || 0) + 1;
    return acc;
  }, {});

  const calculatedScore = requirements.length > 0
    ? ((statusCounts.compliant || 0) / requirements.length) * 100
    : complianceScore;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                AI-Powered Compliance Checker
              </CardTitle>
              <CardDescription>
                Automated FAR/DFARS compliance analysis and requirement tracking
              </CardDescription>
            </div>
            <Button onClick={runComplianceScan} disabled={isScanning} size="lg">
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Compliance Scan
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compliance Score */}
          <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Overall Compliance Score</p>
                  <p className="text-5xl font-bold text-blue-600">
                    {Math.round(calculatedScore)}%
                  </p>
                </div>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                  calculatedScore >= 90 ? 'bg-green-100' :
                  calculatedScore >= 70 ? 'bg-blue-100' :
                  calculatedScore >= 50 ? 'bg-amber-100' :
                  'bg-red-100'
                }`}>
                  {calculatedScore >= 90 ? (
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  ) : calculatedScore >= 70 ? (
                    <Target className="w-12 h-12 text-blue-600" />
                  ) : calculatedScore >= 50 ? (
                    <AlertCircle className="w-12 h-12 text-amber-600" />
                  ) : (
                    <XCircle className="w-12 h-12 text-red-600" />
                  )}
                </div>
              </div>
              <Progress value={calculatedScore} className="h-3 mb-3" />
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-white rounded border">
                  <p className="text-2xl font-bold text-green-600">{statusCounts.compliant || 0}</p>
                  <p className="text-xs text-slate-600">Compliant</p>
                </div>
                <div className="p-2 bg-white rounded border">
                  <p className="text-2xl font-bold text-blue-600">{statusCounts.in_progress || 0}</p>
                  <p className="text-xs text-slate-600">In Progress</p>
                </div>
                <div className="p-2 bg-white rounded border">
                  <p className="text-2xl font-bold text-red-600">{statusCounts.non_compliant || 0}</p>
                  <p className="text-xs text-slate-600">Non-Compliant</p>
                </div>
                <div className="p-2 bg-white rounded border">
                  <p className="text-2xl font-bold text-amber-600">{statusCounts.needs_review || 0}</p>
                  <p className="text-xs text-slate-600">Needs Review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading compliance data...</p>
            </div>
          ) : requirements.length === 0 ? (
            <Alert className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <Search className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>No compliance scan yet!</strong><br/>
                Click "Run Compliance Scan" to analyze your solicitation documents for FAR/DFARS requirements, agency-specific rules, and format specifications.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="requirements" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="requirements">
                  <FileText className="w-4 h-4 mr-2" />
                  Requirements
                </TabsTrigger>
                <TabsTrigger value="critical">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Critical
                </TabsTrigger>
                <TabsTrigger value="far-dfars">
                  <Scale className="w-4 h-4 mr-2" />
                  FAR/DFARS
                </TabsTrigger>
                <TabsTrigger value="format">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Format
                </TabsTrigger>
                <TabsTrigger value="checklist">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Checklist
                </TabsTrigger>
              </TabsList>

              {/* Requirements Tab */}
              <TabsContent value="requirements" className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">All Compliance Requirements</h3>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Requirements</SelectItem>
                      <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                      <SelectItem value="needs_review">Needs Review</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="compliant">Compliant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-4">
                    {requirements.map((req) => (
                      <Card 
                        key={req.id} 
                        className="border-2 cursor-pointer hover:border-blue-300 transition-all"
                        onClick={() => {
                          setSelectedRequirement(req);
                          setShowDetailDialog(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-slate-900">{req.requirement_title}</h4>
                                {req.ai_detected && (
                                  <Badge variant="outline" className="text-purple-700 border-purple-300">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI
                                  </Badge>
                                )}
                              </div>
                              {req.requirement_id && (
                                <p className="text-xs text-slate-500 mb-2">{req.requirement_id}</p>
                              )}
                              <p className="text-sm text-slate-600 line-clamp-2">{req.requirement_description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-4">
                              <Badge className={getStatusColor(req.compliance_status)}>
                                {req.compliance_status?.replace('_', ' ')}
                              </Badge>
                              {req.risk_level && (
                                <Badge className={getRiskColor(req.risk_level)}>
                                  {req.risk_level} risk
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="capitalize">Type: {req.requirement_type?.replace('_', ' ')}</span>
                            <span className="capitalize">Category: {req.requirement_category}</span>
                            {req.requirement_source && (
                              <span>Source: {req.requirement_source}</span>
                            )}
                          </div>

                          {req.remediation_actions && req.remediation_actions.length > 0 && (
                            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                              <p className="text-xs font-semibold text-amber-900 mb-1">Action Required:</p>
                              <p className="text-xs text-amber-800">{req.remediation_actions[0]}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Critical Tab */}
              <TabsContent value="critical" className="space-y-3">
                {scanResults?.critical_gaps && scanResults.critical_gaps.length > 0 ? (
                  <div className="space-y-3">
                    {scanResults.critical_gaps.map((gap, idx) => (
                      <Card key={idx} className="border-2 border-red-300 bg-red-50">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                              <h4 className="font-bold text-red-900 mb-2">{gap.gap}</h4>
                              <p className="text-sm text-red-800 mb-3"><strong>Impact:</strong> {gap.impact}</p>
                              <div className="p-3 bg-white border border-red-200 rounded">
                                <p className="text-sm font-semibold text-blue-900 mb-1">Recommended Action:</p>
                                <p className="text-sm text-slate-700">{gap.recommendation}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription>
                      No critical gaps detected. Run a compliance scan to analyze your proposal.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* FAR/DFARS Tab */}
              <TabsContent value="far-dfars" className="space-y-3">
                {scanResults?.far_dfars_clauses && scanResults.far_dfars_clauses.length > 0 ? (
                  <div className="space-y-3">
                    {scanResults.far_dfars_clauses.map((clause, idx) => (
                      <Card key={idx} className={`border-2 ${
                        clause.compliance_status === 'compliant' ? 'border-green-300 bg-green-50' :
                        clause.compliance_status === 'non_compliant' ? 'border-red-300 bg-red-50' :
                        'border-amber-300 bg-amber-50'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-bold text-slate-900">{clause.clause_number}</h4>
                              <p className="text-sm text-slate-700">{clause.clause_title}</p>
                            </div>
                            <Badge className={getStatusColor(clause.compliance_status)}>
                              {clause.compliance_status?.replace('_', ' ')}
                            </Badge>
                          </div>
                          {clause.notes && (
                            <p className="text-sm text-slate-600 mt-2">{clause.notes}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <Scale className="w-4 h-4" />
                    <AlertDescription>
                      Run a compliance scan to check FAR/DFARS clause applicability.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Format Tab */}
              <TabsContent value="format" className="space-y-4">
                {scanResults?.format_compliance ? (
                  <>
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card className={scanResults.format_compliance.page_limits_met ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
                        <CardContent className="p-4 text-center">
                          {scanResults.format_compliance.page_limits_met ? (
                            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          ) : (
                            <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                          )}
                          <p className="font-semibold">Page Limits</p>
                          <p className="text-sm text-slate-600">
                            {scanResults.format_compliance.page_limits_met ? 'Met' : 'Not Met'}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className={scanResults.format_compliance.font_requirements_met ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
                        <CardContent className="p-4 text-center">
                          {scanResults.format_compliance.font_requirements_met ? (
                            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          ) : (
                            <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                          )}
                          <p className="font-semibold">Font Requirements</p>
                          <p className="text-sm text-slate-600">
                            {scanResults.format_compliance.font_requirements_met ? 'Met' : 'Not Met'}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className={scanResults.format_compliance.margin_requirements_met ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
                        <CardContent className="p-4 text-center">
                          {scanResults.format_compliance.margin_requirements_met ? (
                            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          ) : (
                            <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                          )}
                          <p className="font-semibold">Margin Requirements</p>
                          <p className="text-sm text-slate-600">
                            {scanResults.format_compliance.margin_requirements_met ? 'Met' : 'Not Met'}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {scanResults.format_compliance.issues && scanResults.format_compliance.issues.length > 0 && (
                      <Card className="border-amber-300 bg-amber-50">
                        <CardHeader>
                          <CardTitle className="text-base">Format Issues Detected</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {scanResults.format_compliance.issues.map((issue, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Alert>
                    <BookOpen className="w-4 h-4" />
                    <AlertDescription>
                      Run a compliance scan to check format requirements.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Checklist Tab */}
              <TabsContent value="checklist" className="space-y-3">
                {scanResults?.submission_checklist && scanResults.submission_checklist.length > 0 ? (
                  <div className="space-y-2">
                    {scanResults.submission_checklist.map((item, idx) => (
                      <Card key={idx} className={`border ${
                        item.status === 'complete' ? 'border-green-300 bg-green-50' :
                        item.status === 'incomplete' ? 'border-red-300 bg-red-50' :
                        'border-slate-300 bg-slate-50'
                      }`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {item.status === 'complete' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : item.status === 'incomplete' ? (
                                <XCircle className="w-5 h-5 text-red-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-slate-500" />
                              )}
                              <div>
                                <p className="font-medium text-slate-900">{item.item}</p>
                                {item.notes && (
                                  <p className="text-sm text-slate-600">{item.notes}</p>
                                )}
                              </div>
                            </div>
                            <Badge className={
                              item.status === 'complete' ? 'bg-green-600 text-white' :
                              item.status === 'incomplete' ? 'bg-red-600 text-white' :
                              'bg-slate-600 text-white'
                            }>
                              {item.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle2 className="w-4 h-4" />
                    <AlertDescription>
                      Run a compliance scan to generate submission checklist.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Recommendations */}
          {scanResults?.recommendations && scanResults.recommendations.length > 0 && (
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Priority Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scanResults.recommendations
                    .sort((a, b) => {
                      const priorityOrder = { high: 0, medium: 1, low: 2 };
                      return priorityOrder[a.priority] - priorityOrder[b.priority];
                    })
                    .map((rec, idx) => (
                      <div key={idx} className="p-3 bg-white border-2 border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Badge className={
                            rec.priority === 'high' ? 'bg-red-600 text-white' :
                            rec.priority === 'medium' ? 'bg-amber-600 text-white' :
                            'bg-blue-600 text-white'
                          }>
                            {rec.priority} priority
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 mb-1">{rec.recommendation}</p>
                            {rec.deadline && (
                              <p className="text-xs text-slate-500">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Deadline: {rec.deadline}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {requirements.length > 0 && (
            <div className="flex gap-3">
              <Button onClick={runComplianceScan} variant="outline" className="flex-1">
                <Sparkles className="w-4 h-4 mr-2" />
                Re-scan Compliance
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export Compliance Matrix
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requirement Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compliance Requirement Details</DialogTitle>
            <DialogDescription>
              View and update compliance status
            </DialogDescription>
          </DialogHeader>

          {selectedRequirement && (
            <div className="space-y-4">
              <div>
                <Label>Requirement ID</Label>
                <Input value={selectedRequirement.requirement_id || 'N/A'} disabled />
              </div>

              <div>
                <Label>Title</Label>
                <Input value={selectedRequirement.requirement_title} disabled />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea 
                  value={selectedRequirement.requirement_description} 
                  disabled 
                  className="h-24"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Input value={selectedRequirement.requirement_type?.replace('_', ' ')} disabled className="capitalize" />
                </div>

                <div>
                  <Label>Category</Label>
                  <Input value={selectedRequirement.requirement_category} disabled className="capitalize" />
                </div>
              </div>

              <div>
                <Label>Compliance Status</Label>
                <Select
                  value={selectedRequirement.compliance_status}
                  onValueChange={(value) => setSelectedRequirement({...selectedRequirement, compliance_status: value})}
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
                <Label>Compliance Notes</Label>
                <Textarea
                  value={selectedRequirement.compliance_notes || ''}
                  onChange={(e) => setSelectedRequirement({...selectedRequirement, compliance_notes: e.target.value})}
                  placeholder="Add notes about compliance status..."
                  className="h-24"
                />
              </div>

              {selectedRequirement.remediation_actions && selectedRequirement.remediation_actions.length > 0 && (
                <div>
                  <Label>Remediation Actions</Label>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <ul className="space-y-1">
                      {selectedRequirement.remediation_actions.map((action, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-amber-600">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedRequirement?.id) {
                  updateRequirementMutation.mutate({
                    requirementId: selectedRequirement.id,
                    updates: {
                      compliance_status: selectedRequirement.compliance_status,
                      compliance_notes: selectedRequirement.compliance_notes,
                      last_checked_date: new Date().toISOString()
                    }
                  });
                }
              }}
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}