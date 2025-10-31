import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Filter,
  Loader2,
  Edit,
  Save,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ComplianceMatrixGenerator({ proposal, organization }) {
  const [requirements, setRequirements] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    if (proposal?.id) {
      loadData();
    }
  }, [proposal?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqs, secs] = await Promise.all([
        base44.entities.ComplianceRequirement.filter({
          proposal_id: proposal.id,
          organization_id: organization.id
        }),
        base44.entities.ProposalSection.filter({
          proposal_id: proposal.id
        })
      ]);

      setRequirements(reqs);
      setSections(secs);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMatrix = async () => {
    if (!proposal?.id || !organization?.id) return;

    setGenerating(true);
    try {
      // Get solicitation documents
      const solicitationDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposal.id,
        organization_id: organization.id
      });

      if (solicitationDocs.length === 0) {
        alert("Please upload solicitation documents in Phase 3 first.");
        setGenerating(false);
        return;
      }

      // This would typically be done in Phase 3, but we can regenerate/refine here
      const fileUrls = solicitationDocs
        .filter(doc => doc.file_url)
        .map(doc => doc.file_url)
        .slice(0, 5);

      if (fileUrls.length === 0) {
        alert("No valid document URLs found.");
        setGenerating(false);
        return;
      }

      const prompt = `You are a compliance expert. Analyze these solicitation documents and create a comprehensive compliance matrix.

Extract ALL requirements including:
- Section L requirements (instructions to offerors)
- Section M requirements (evaluation criteria)
- Section C requirements (statement of work)
- FAR/DFARS clauses
- Formatting requirements
- Submission requirements
- Certifications required

For each requirement, identify:
1. Requirement ID (e.g., L-001, M-002, FAR-52.215-1)
2. Requirement Title
3. Requirement Type (far, dfars, agency_specific, solicitation_specific, certification, submission_format)
4. Category (mandatory, desirable, information_only)
5. Description of what's required
6. Source section in solicitation
7. Risk level if not compliant (low, medium, high, critical)

Return a JSON array of requirements. Maximum 50 requirements (prioritize mandatory and high-risk ones).

Return ONLY valid JSON with this structure:
[
  {
    "requirement_id": "string",
    "requirement_title": "string",
    "requirement_type": "string",
    "requirement_category": "string",
    "requirement_description": "string",
    "requirement_source": "string",
    "risk_level": "string"
  }
]`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: fileUrls,
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
                  requirement_type: { type: "string" },
                  requirement_category: { type: "string" },
                  requirement_description: { type: "string" },
                  requirement_source: { type: "string" },
                  risk_level: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.requirements && result.requirements.length > 0) {
        // Delete old requirements if regenerating
        const existingReqs = await base44.entities.ComplianceRequirement.filter({
          proposal_id: proposal.id,
          organization_id: organization.id
        });

        for (const req of existingReqs) {
          await base44.entities.ComplianceRequirement.delete(req.id);
        }

        // Create new requirements
        for (const req of result.requirements) {
          await base44.entities.ComplianceRequirement.create({
            proposal_id: proposal.id,
            organization_id: organization.id,
            requirement_id: req.requirement_id,
            requirement_title: req.requirement_title,
            requirement_type: req.requirement_type || 'solicitation_specific',
            requirement_category: req.requirement_category || 'mandatory',
            requirement_description: req.requirement_description,
            requirement_source: req.requirement_source,
            compliance_status: 'not_started',
            risk_level: req.risk_level || 'medium',
            ai_detected: true,
            ai_confidence: 85
          });
        }

        await loadData();
        alert(`✓ Generated ${result.requirements.length} compliance requirements!`);
      } else {
        alert("No requirements found in documents.");
      }
    } catch (error) {
      console.error("Error generating matrix:", error);
      alert("Error generating compliance matrix: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const updateRequirement = async (reqId, updates) => {
    try {
      await base44.entities.ComplianceRequirement.update(reqId, updates);
      await loadData();
      setEditingId(null);
      setEditData({});
    } catch (error) {
      console.error("Error updating requirement:", error);
      alert("Error updating requirement");
    }
  };

  const exportToExcel = () => {
    // Create CSV content
    const headers = [
      "Req ID",
      "Title",
      "Type",
      "Category",
      "Status",
      "Description",
      "Source",
      "Risk Level",
      "Addressed In Sections",
      "Evidence"
    ];

    const rows = filteredRequirements.map(req => [
      req.requirement_id,
      req.requirement_title,
      req.requirement_type,
      req.requirement_category,
      req.compliance_status,
      req.requirement_description,
      req.requirement_source,
      req.risk_level,
      req.addressed_in_sections?.join(', ') || '',
      req.evidence_provided || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-matrix-${proposal.proposal_name}.csv`;
    a.click();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'needs_review': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'non_compliant': return 'bg-red-100 text-red-700 border-red-200';
      case 'not_started': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'compliant': return CheckCircle2;
      case 'non_compliant': return XCircle;
      case 'needs_review': return AlertTriangle;
      case 'in_progress': return Clock;
      default: return Clock;
    }
  };

  const filteredRequirements = requirements.filter(req => {
    const statusMatch = filterStatus === 'all' || req.compliance_status === filterStatus;
    const riskMatch = filterRisk === 'all' || req.risk_level === filterRisk;
    return statusMatch && riskMatch;
  });

  const complianceStats = {
    total: requirements.length,
    compliant: requirements.filter(r => r.compliance_status === 'compliant').length,
    inProgress: requirements.filter(r => r.compliance_status === 'in_progress').length,
    notStarted: requirements.filter(r => r.compliance_status === 'not_started').length,
    nonCompliant: requirements.filter(r => r.compliance_status === 'non_compliant').length,
    criticalRisk: requirements.filter(r => r.risk_level === 'critical').length,
    highRisk: requirements.filter(r => r.risk_level === 'high').length
  };

  const compliancePercentage = requirements.length > 0
    ? Math.round((complianceStats.compliant / requirements.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="w-6 h-6 text-blue-600" />
                Compliance Matrix
              </CardTitle>
              <CardDescription>
                Track all solicitation requirements and compliance status
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel} disabled={requirements.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={generateMatrix} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {requirements.length > 0 ? 'Regenerate Matrix' : 'Generate Matrix'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {requirements.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Compliance Matrix Yet
            </h3>
            <p className="text-slate-600 mb-6">
              Generate an automated compliance matrix from your solicitation documents. 
              AI will extract all requirements and help you track compliance.
            </p>
            <Button onClick={generateMatrix} disabled={generating} size="lg">
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Compliance Matrix
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid md:grid-cols-5 gap-4">
            <Card className="border-none shadow-lg">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{complianceStats.total}</p>
                  <p className="text-xs text-slate-600 mt-1">Total Requirements</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{complianceStats.compliant}</p>
                  <p className="text-xs text-slate-600 mt-1">Compliant</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{complianceStats.inProgress}</p>
                  <p className="text-xs text-slate-600 mt-1">In Progress</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{complianceStats.criticalRisk}</p>
                  <p className="text-xs text-slate-600 mt-1">Critical Risk</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{compliancePercentage}%</p>
                  <p className="text-xs text-slate-600 mt-1">Compliance Rate</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overall Progress */}
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Overall Compliance Progress</span>
                <span className="text-2xl font-bold text-blue-600">{compliancePercentage}%</span>
              </div>
              <Progress value={compliancePercentage} className="h-3" />
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Filter className="w-5 h-5 text-slate-400" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterRisk} onValueChange={setFilterRisk}>
                  <SelectTrigger className="w-48">
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

                <span className="text-sm text-slate-600 ml-auto">
                  Showing {filteredRequirements.length} of {requirements.length}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Requirements Table */}
          <div className="space-y-3">
            {filteredRequirements.map((req) => {
              const StatusIcon = getStatusIcon(req.compliance_status);
              const isEditing = editingId === req.id;

              return (
                <Card key={req.id} className="border-none shadow-lg">
                  <CardContent className="p-6">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Requirement ID</label>
                            <Input
                              value={editData.requirement_id || req.requirement_id}
                              onChange={(e) => setEditData({...editData, requirement_id: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Status</label>
                            <Select
                              value={editData.compliance_status || req.compliance_status}
                              onValueChange={(value) => setEditData({...editData, compliance_status: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_started">Not Started</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="needs_review">Needs Review</SelectItem>
                                <SelectItem value="compliant">Compliant</SelectItem>
                                <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1 block">Evidence / Notes</label>
                          <Textarea
                            value={editData.evidence_provided || req.evidence_provided || ''}
                            onChange={(e) => setEditData({...editData, evidence_provided: e.target.value})}
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateRequirement(req.id, editData)}>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setEditingId(null);
                            setEditData({});
                          }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <StatusIcon className={cn(
                                "w-5 h-5",
                                req.compliance_status === 'compliant' ? 'text-green-600' :
                                req.compliance_status === 'non_compliant' ? 'text-red-600' :
                                req.compliance_status === 'needs_review' ? 'text-yellow-600' :
                                'text-blue-600'
                              )} />
                              <h3 className="font-semibold text-slate-900">{req.requirement_title}</h3>
                              <Badge variant="outline" className="text-xs">
                                {req.requirement_id}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-3">{req.requirement_description}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingId(req.id);
                            setEditData({});
                          }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge className={getStatusColor(req.compliance_status)}>
                            {req.compliance_status?.replace(/_/g, ' ')}
                          </Badge>
                          <Badge className={getRiskColor(req.risk_level)}>
                            {req.risk_level} risk
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {req.requirement_type?.replace(/_/g, ' ')}
                          </Badge>
                          {req.requirement_category && (
                            <Badge variant="outline" className="capitalize">
                              {req.requirement_category}
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-slate-500">
                          <p><strong>Source:</strong> {req.requirement_source}</p>
                          {req.addressed_in_sections && req.addressed_in_sections.length > 0 && (
                            <p className="mt-1"><strong>Addressed in:</strong> {req.addressed_in_sections.join(', ')}</p>
                          )}
                          {req.evidence_provided && (
                            <p className="mt-1"><strong>Evidence:</strong> {req.evidence_provided}</p>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}