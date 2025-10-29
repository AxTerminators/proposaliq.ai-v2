import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Sparkles,
  Loader2,
  Download,
  FileText,
  TrendingUp,
  AlertCircle,
  Info
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ComplianceChecker({ proposalId, proposalData, organizationId }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [extractionResults, setExtractionResults] = useState(null);

  const { data: requirements, isLoading } = useQuery({
    queryKey: ['compliance-requirements', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ComplianceRequirement.filter(
        { proposal_id: proposalId },
        'requirement_id'
      );
    },
    initialData: [],
    enabled: !!proposalId,
  });

  const { data: sections } = useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalSection.filter({ proposal_id: proposalId });
    },
    initialData: [],
    enabled: !!proposalId,
  });

  const { data: solicitationDocs } = useQuery({
    queryKey: ['solicitation-documents', proposalId],
    queryFn: async () => {
      if (!proposalId || !organizationId) return [];
      return base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: organizationId
      });
    },
    initialData: [],
    enabled: !!proposalId && !!organizationId,
  });

  const updateRequirementMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.ComplianceRequirement.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
      setSelectedRequirement(null);
    },
  });

  const deleteRequirementMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.ComplianceRequirement.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
      setSelectedRequirement(null);
    },
  });

  const runComplianceExtraction = async () => {
    if (!proposalId || !organizationId) {
      alert("Please save the proposal first");
      return;
    }

    setIsExtracting(true);
    setExtractionResults(null);

    try {
      const fileUrls = solicitationDocs
        .filter(doc => doc.file_url && ['rfp', 'rfq', 'sow', 'pws'].includes(doc.document_type))
        .map(doc => doc.file_url)
        .slice(0, 10);

      if (fileUrls.length === 0) {
        alert("Please upload solicitation documents first (RFP, RFQ, SOW, or PWS)");
        setIsExtracting(false);
        return;
      }

      const prompt = `You are an expert compliance analyst specializing in government contracts and federal acquisitions.

**PROPOSAL INFORMATION:**
- Agency: ${proposalData?.agency_name || 'Not specified'}
- Project: ${proposalData?.project_title || 'Not specified'}
- Solicitation: ${proposalData?.solicitation_number || 'Not specified'}
- Type: ${proposalData?.project_type || 'Not specified'}

**YOUR MISSION:**
Perform a comprehensive compliance analysis of these solicitation documents. Identify ALL compliance requirements, regulations, and mandatory clauses.

**EXTRACT THE FOLLOWING:**

1. **FAR Clauses:** All Federal Acquisition Regulation clauses referenced (e.g., FAR 52.212-1, FAR Part 15)
2. **DFARS Clauses:** All Defense Federal Acquisition Regulation Supplement clauses (e.g., DFARS 252.204-7012)
3. **Agency-Specific Regulations:** Department/agency-specific requirements (e.g., DHS Acquisition Manual, NASA FAR Supplement)
4. **Submission Requirements:** Format, page limits, fonts, margins, mandatory sections, number of copies
5. **Technical Requirements:** Performance standards, specifications, technical capabilities needed
6. **Management Requirements:** Organizational structure, key personnel qualifications, experience requirements
7. **Past Performance Requirements:** Number of references, recency, relevance, contract size
8. **Security/Clearance Requirements:** Facility clearances, personnel clearances, CMMC levels, classified work
9. **Certifications Required:** Small business, ISO, CMMI, industry-specific certifications
10. **Financial/Bonding Requirements:** Performance bonds, insurance, financial statements
11. **Socioeconomic Requirements:** Small business subcontracting plans, veteran-owned business participation
12. **Data Rights/IP Requirements:** Government data rights, intellectual property clauses

**For EACH requirement identified, provide:**
- requirement_id: Unique identifier (e.g., "FAR-52.212-1", "TECH-001", "MGMT-003")
- requirement_title: Short, clear title
- requirement_description: Detailed description of what's required
- requirement_type: "far" | "dfars" | "agency_specific" | "solicitation_specific" | "contract_clause" | "certification" | "submission_format" | "other"
- requirement_category: "mandatory" | "desirable" | "information_only"
- category: "technical" | "management" | "past_performance" | "submission_format" | "administrative" | "certification" | "security" | "financial" | "socioeconomic" | "data_rights"
- requirement_source: Section/page reference (e.g., "Section L.3.2, Page 45")
- risk_level: "critical" | "high" | "medium" | "low" (based on difficulty to meet and importance)
- compliance_notes: Brief notes on how to address or what to watch for
- format_requirements: If applicable, specific formatting rules (JSON object)

**COMPLIANCE RISK ASSESSMENT:**
Identify the top 10 highest-risk compliance items that could lead to proposal rejection if not addressed.

Return as comprehensive JSON:
{
  "requirements": [
    {
      "requirement_id": "string",
      "requirement_title": "string",
      "requirement_description": "string",
      "requirement_type": "string",
      "requirement_category": "string",
      "category": "string",
      "requirement_source": "string",
      "risk_level": "string",
      "compliance_notes": "string",
      "format_requirements": {
        "page_limit": number,
        "font": "string",
        "font_size": number,
        "margins": "string"
      }
    }
  ],
  "high_risk_items": [
    {
      "requirement_id": "string",
      "risk_description": "string",
      "mitigation_strategy": "string"
    }
  ],
  "summary": {
    "total_requirements": number,
    "critical_count": number,
    "high_count": number,
    "far_clauses_count": number,
    "dfars_clauses_count": number,
    "page_limit_total": number,
    "key_compliance_challenges": ["string"]
  }
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
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
                  requirement_description: { type: "string" },
                  requirement_type: { type: "string" },
                  requirement_category: { type: "string" },
                  category: { type: "string" },
                  requirement_source: { type: "string" },
                  risk_level: { type: "string" },
                  compliance_notes: { type: "string" },
                  format_requirements: { type: "object" }
                }
              }
            },
            high_risk_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  requirement_id: { type: "string" },
                  risk_description: { type: "string" },
                  mitigation_strategy: { type: "string" }
                }
              }
            },
            summary: {
              type: "object",
              properties: {
                total_requirements: { type: "number" },
                critical_count: { type: "number" },
                high_count: { type: "number" },
                far_clauses_count: { type: "number" },
                dfars_clauses_count: { type: "number" },
                page_limit_total: { type: "number" },
                key_compliance_challenges: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setExtractionResults(result);

      // Auto-create ComplianceRequirement records
      let createdCount = 0;
      if (result.requirements && result.requirements.length > 0) {
        for (const req of result.requirements) {
          try {
            await base44.entities.ComplianceRequirement.create({
              proposal_id: proposalId,
              organization_id: organizationId,
              requirement_id: req.requirement_id || `AUTO-${Date.now()}-${createdCount}`,
              requirement_title: req.requirement_title,
              requirement_type: req.requirement_type || "solicitation_specific",
              requirement_category: req.requirement_category || "mandatory",
              requirement_description: req.requirement_description,
              requirement_source: req.requirement_source,
              compliance_status: "not_started",
              risk_level: req.risk_level || "medium",
              compliance_notes: req.compliance_notes,
              format_requirements: req.format_requirements || {},
              ai_detected: true,
              ai_confidence: 90
            });
            createdCount++;
          } catch (error) {
            console.error("Error creating requirement:", error);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
      alert(`✓ Compliance extraction complete!\n\nCreated ${createdCount} compliance requirements.\nIdentified ${result.high_risk_items?.length || 0} high-risk items.`);

    } catch (error) {
      console.error("Error extracting compliance requirements:", error);
      alert("Error performing compliance analysis. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const autoMapSections = async () => {
    if (sections.length === 0) {
      alert("No proposal sections found. Please create sections first in Phase 6.");
      return;
    }

    setIsAutoMapping(true);
    try {
      let mappedCount = 0;
      
      for (const req of requirements.filter(r => r.compliance_status === "not_started")) {
        const sectionSummary = sections.map(s => 
          `- ${s.section_name} (${s.section_type}): ${s.content?.substring(0, 200) || 'Empty'}...`
        ).join('\n');

        const prompt = `Given this compliance requirement:
**ID:** ${req.requirement_id}
**Title:** ${req.requirement_title}
**Description:** ${req.requirement_description}
**Type:** ${req.requirement_type}
**Category:** ${req.category}

And these proposal sections:
${sectionSummary}

Which section(s) should address this requirement? Return section names as JSON array.
If no section is appropriate, return empty array.

Return format: { "sections": ["section_name1", "section_name2"] }`;

        try {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
              type: "object",
              properties: {
                sections: { type: "array", items: { type: "string" } }
              }
            }
          });

          if (result.sections && result.sections.length > 0) {
            await base44.entities.ComplianceRequirement.update(req.id, {
              addressed_in_sections: result.sections,
              compliance_status: "in_progress"
            });
            mappedCount++;
          }
        } catch (error) {
          console.error(`Error mapping requirement ${req.requirement_id}:`, error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
      alert(`✓ Auto-mapped ${mappedCount} requirements to sections!`);
    } catch (error) {
      console.error("Error auto-mapping sections:", error);
      alert("Error during auto-mapping. Please try again.");
    } finally {
      setIsAutoMapping(false);
    }
  };

  const exportComplianceMatrix = () => {
    const csv = [
      ['Requirement ID', 'Title', 'Type', 'Category', 'Risk Level', 'Status', 'Source', 'Addressed In', 'Notes'].join(','),
      ...filteredRequirements.map(req => [
        req.requirement_id,
        `"${req.requirement_title}"`,
        req.requirement_type,
        req.category,
        req.risk_level,
        req.compliance_status,
        `"${req.requirement_source || ''}"`,
        `"${req.addressed_in_sections?.join(', ') || ''}"`,
        `"${req.compliance_notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-matrix-${proposalData?.solicitation_number || 'proposal'}.csv`;
    a.click();
  };

  // Filtering
  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = !searchQuery || 
      req.requirement_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requirement_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requirement_description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || req.requirement_type === filterType;
    const matchesCategory = filterCategory === "all" || req.category === filterCategory;
    const matchesStatus = filterStatus === "all" || req.compliance_status === filterStatus;
    const matchesRisk = filterRisk === "all" || req.risk_level === filterRisk;

    return matchesSearch && matchesType && matchesCategory && matchesStatus && matchesRisk;
  });

  // Statistics
  const stats = {
    total: requirements.length,
    compliant: requirements.filter(r => r.compliance_status === "compliant").length,
    inProgress: requirements.filter(r => r.compliance_status === "in_progress").length,
    notStarted: requirements.filter(r => r.compliance_status === "not_started").length,
    nonCompliant: requirements.filter(r => r.compliance_status === "non_compliant").length,
    critical: requirements.filter(r => r.risk_level === "critical").length,
    high: requirements.filter(r => r.risk_level === "high").length,
    far: requirements.filter(r => r.requirement_type === "far").length,
    dfars: requirements.filter(r => r.requirement_type === "dfars").length,
  };

  const compliancePercentage = stats.total > 0 
    ? Math.round((stats.compliant / stats.total) * 100) 
    : 0;

  const getStatusColor = (status) => {
    switch (status) {
      case "compliant": return "bg-green-100 text-green-700 border-green-300";
      case "in_progress": return "bg-blue-100 text-blue-700 border-blue-300";
      case "not_started": return "bg-slate-100 text-slate-700 border-slate-300";
      case "non_compliant": return "bg-red-100 text-red-700 border-red-300";
      case "needs_review": return "bg-amber-100 text-amber-700 border-amber-300";
      default: return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case "critical": return "bg-red-100 text-red-700";
      case "high": return "bg-orange-100 text-orange-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "low": return "bg-blue-100 text-blue-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "compliant": return <CheckCircle2 className="w-4 h-4" />;
      case "non_compliant": return <XCircle className="w-4 h-4" />;
      case "in_progress": return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Shield className="w-6 h-6 text-blue-600" />
                Compliance Matrix & Analysis
              </CardTitle>
              <CardDescription className="mt-2">
                AI-powered compliance requirement tracking and risk assessment
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={runComplianceExtraction}
                disabled={isExtracting}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Extract Requirements
                  </>
                )}
              </Button>
              {sections.length > 0 && (
                <Button
                  onClick={autoMapSections}
                  disabled={isAutoMapping}
                  variant="outline"
                >
                  {isAutoMapping ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mapping...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Auto-Map Sections
                    </>
                  )}
                </Button>
              )}
              <Button onClick={exportComplianceMatrix} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4 mb-6">
            <Card className="border-2">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                <div className="text-xs text-slate-600 mt-1">Total Requirements</div>
              </CardContent>
            </Card>
            <Card className="border-2 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-700">{stats.compliant}</div>
                <div className="text-xs text-green-600 mt-1">Compliant</div>
              </CardContent>
            </Card>
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-700">{stats.inProgress}</div>
                <div className="text-xs text-blue-600 mt-1">In Progress</div>
              </CardContent>
            </Card>
            <Card className="border-2 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-700">{stats.critical + stats.high}</div>
                <div className="text-xs text-red-600 mt-1">High Risk Items</div>
              </CardContent>
            </Card>
            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-700">{stats.far + stats.dfars}</div>
                <div className="text-xs text-purple-600 mt-1">FAR/DFARS Clauses</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-900">Overall Compliance</span>
              <span className="font-bold text-slate-900">{compliancePercentage}%</span>
            </div>
            <Progress value={compliancePercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Extraction Results Summary */}
      {extractionResults && (
        <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-blue-900">AI Analysis Complete!</p>
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-blue-700">Total Requirements:</span>{' '}
                  <span className="font-semibold">{extractionResults.summary?.total_requirements || 0}</span>
                </div>
                <div>
                  <span className="text-blue-700">Critical Items:</span>{' '}
                  <span className="font-semibold text-red-600">{extractionResults.summary?.critical_count || 0}</span>
                </div>
                <div>
                  <span className="text-blue-700">FAR Clauses:</span>{' '}
                  <span className="font-semibold">{extractionResults.summary?.far_clauses_count || 0}</span>
                </div>
              </div>
              {extractionResults.summary?.key_compliance_challenges && (
                <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-2">Key Compliance Challenges:</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    {extractionResults.summary.key_compliance_challenges.slice(0, 5).map((challenge, idx) => (
                      <li key={idx}>• {challenge}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* High Risk Items */}
      {extractionResults?.high_risk_items && extractionResults.high_risk_items.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              High Risk Compliance Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {extractionResults.high_risk_items.slice(0, 10).map((item, idx) => (
                <div key={idx} className="p-4 bg-white border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Badge className="bg-red-600 text-white flex-shrink-0">
                      {item.requirement_id}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 mb-1">{item.risk_description}</p>
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-xs font-semibold text-green-800 mb-1">Mitigation:</p>
                        <p className="text-sm text-green-900">{item.mitigation_strategy}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="far">FAR</SelectItem>
                <SelectItem value="dfars">DFARS</SelectItem>
                <SelectItem value="agency_specific">Agency Specific</SelectItem>
                <SelectItem value="solicitation_specific">Solicitation</SelectItem>
                <SelectItem value="certification">Certification</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="past_performance">Past Performance</SelectItem>
                <SelectItem value="submission_format">Submission Format</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="non_compliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger>
                <SelectValue placeholder="Risk" />
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
        </CardContent>
      </Card>

      {/* Requirements Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="w-32">Risk</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequirements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="w-12 h-12 text-slate-300" />
                        <p className="text-slate-600">No compliance requirements found</p>
                        <Button onClick={runComplianceExtraction} size="sm">
                          <Sparkles className="w-4 h-4 mr-2" />
                          Extract Requirements with AI
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequirements.map((req) => (
                    <TableRow key={req.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedRequirement(req)}>
                      <TableCell className="font-mono text-xs">{req.requirement_id}</TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="font-medium text-sm">{req.requirement_title}</p>
                          <p className="text-xs text-slate-500 truncate">{req.requirement_description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {req.requirement_type?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {req.category?.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(req.risk_level)}>
                          {req.risk_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(req.compliance_status)}>
                          {getStatusIcon(req.compliance_status)}
                          <span className="ml-1">{req.compliance_status?.replace('_', ' ')}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequirement(req);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Requirement Detail Dialog */}
      {selectedRequirement && (
        <Dialog open={!!selectedRequirement} onOpenChange={(open) => !open && setSelectedRequirement(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                {selectedRequirement.requirement_title}
              </DialogTitle>
              <div className="flex gap-2 mt-2">
                <Badge className={getRiskColor(selectedRequirement.risk_level)}>
                  {selectedRequirement.risk_level} Risk
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selectedRequirement.requirement_type?.replace('_', ' ')}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {selectedRequirement.category?.replace('_', ' ')}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Requirement ID</Label>
                <p className="text-sm text-slate-600 font-mono mt-1">{selectedRequirement.requirement_id}</p>
              </div>

              <div>
                <Label className="text-sm font-semibold">Description</Label>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{selectedRequirement.requirement_description}</p>
              </div>

              {selectedRequirement.requirement_source && (
                <div>
                  <Label className="text-sm font-semibold">Source</Label>
                  <p className="text-sm text-slate-600 mt-1">{selectedRequirement.requirement_source}</p>
                </div>
              )}

              {selectedRequirement.compliance_notes && (
                <div>
                  <Label className="text-sm font-semibold">Compliance Notes</Label>
                  <p className="text-sm text-slate-600 mt-1">{selectedRequirement.compliance_notes}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold">Compliance Status</Label>
                <Select
                  value={selectedRequirement.compliance_status}
                  onValueChange={(value) => {
                    updateRequirementMutation.mutate({
                      id: selectedRequirement.id,
                      data: { compliance_status: value }
                    });
                    setSelectedRequirement({ ...selectedRequirement, compliance_status: value });
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

              {selectedRequirement.addressed_in_sections && selectedRequirement.addressed_in_sections.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Addressed In Sections</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedRequirement.addressed_in_sections.map((section, idx) => (
                      <Badge key={idx} variant="outline">{section}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm(`Delete requirement "${selectedRequirement.requirement_title}"?`)) {
                    deleteRequirementMutation.mutate(selectedRequirement.id);
                  }
                }}
                className="text-red-600 hover:text-red-700"
              >
                Delete
              </Button>
              <Button onClick={() => setSelectedRequirement(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}