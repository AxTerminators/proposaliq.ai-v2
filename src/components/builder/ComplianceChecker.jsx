import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock,
  FileText,
  Download,
  Plus,
  Edit,
  Trash2,
  Upload,
  Loader2,
  Target,
  Search,
  Filter,
  Table2,
  FileSpreadsheet
} from "lucide-react";

export default function ComplianceChecker({ proposalId, proposalData, organizationId }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showExtractDialog, setShowExtractDialog] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const [formData, setFormData] = useState({
    requirement_id: "",
    requirement_title: "",
    requirement_type: "far",
    requirement_category: "mandatory",
    requirement_description: "",
    requirement_source: "",
    compliance_status: "not_started",
    addressed_in_sections: [],
    evidence_provided: "",
    compliance_notes: "",
    risk_level: "medium"
  });

  const { data: requirements, isLoading } = useQuery({
    queryKey: ['compliance-requirements', proposalId],
    queryFn: async () => {
      if (!proposalId || !organizationId) return [];
      return base44.entities.ComplianceRequirement.filter({
        proposal_id: proposalId,
        organization_id: organizationId
      }, 'requirement_id');
    },
    initialData: [],
    enabled: !!proposalId && !!organizationId
  });

  const { data: sections } = useQuery({
    queryKey: ['proposal-sections-compliance', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalSection.filter({ proposal_id: proposalId }, 'order');
    },
    initialData: [],
    enabled: !!proposalId
  });

  const createRequirementMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceRequirement.create({
      ...data,
      proposal_id: proposalId,
      organization_id: organizationId
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
      requirement_type: "far",
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

  const handleEdit = (requirement) => {
    setEditingRequirement(requirement);
    setFormData({
      requirement_id: requirement.requirement_id || "",
      requirement_title: requirement.requirement_title || "",
      requirement_type: requirement.requirement_type || "far",
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

  const handleSave = () => {
    if (!formData.requirement_title) {
      alert("Please enter a requirement title");
      return;
    }

    if (editingRequirement) {
      updateRequirementMutation.mutate({ id: editingRequirement.id, data: formData });
    } else {
      createRequirementMutation.mutate(formData);
    }
  };

  const extractRequirements = async () => {
    if (!proposalId || !organizationId) return;

    setIsExtracting(true);
    try {
      const solicitationDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: organizationId,
        document_type: { $in: ["rfp", "rfq", "sow", "pws"] }
      });

      if (solicitationDocs.length === 0) {
        alert("No solicitation documents found. Upload RFP/SOW documents first.");
        setIsExtracting(false);
        return;
      }

      const fileUrls = solicitationDocs.map(d => d.file_url).filter(url => url && !url.startsWith('proposal:'));

      const prompt = `You are an expert at analyzing government solicitation documents (RFPs, RFQs, SOWs) and extracting compliance requirements.

**YOUR TASK:**
Carefully read the provided solicitation documents and extract ALL compliance requirements. Focus on:

1. **Section L Requirements** (Instructions to Offerors - what to submit and how)
2. **Section M Requirements** (Evaluation criteria - how you'll be scored)
3. **Section C Requirements** (Statement of Work - technical requirements)
4. **FAR/DFARS Clauses** (Federal regulations)
5. **Mandatory Certifications** (Required forms, signatures, certificates)
6. **Format Requirements** (Page limits, fonts, margins, file types)
7. **Submission Requirements** (Copies needed, delivery method, deadlines)
8. **Technical Requirements** (Performance specs, standards, deliverables)

**FOR EACH REQUIREMENT, EXTRACT:**
- Requirement ID (e.g., "L.3.2" or "SOW-4.1")
- Title (brief name)
- Type (far, dfars, agency_specific, solicitation_specific, contract_clause, certification, submission_format)
- Category (mandatory or desirable)
- Description (what exactly is required)
- Source (where in the document - section number)
- Risk Level if not met (critical, high, medium, low)
- Any format requirements (page limits, fonts, etc.)

Return a JSON array of requirements. Be comprehensive - extract EVERY requirement you find.

**IMPORTANT:** 
- Mark things as "mandatory" if they say "shall", "must", "required"
- Mark as "desirable" if they say "should", "may", "desired"
- Include page limits and formatting requirements
- Include all certifications and representations
- Be specific in descriptions`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.slice(0, 10),
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
                  risk_level: { type: "string" },
                  format_requirements: { type: "object" }
                }
              }
            }
          }
        }
      });

      // Create all extracted requirements
      if (result.requirements && result.requirements.length > 0) {
        for (const req of result.requirements) {
          await base44.entities.ComplianceRequirement.create({
            proposal_id: proposalId,
            organization_id: organizationId,
            requirement_id: req.requirement_id || "",
            requirement_title: req.requirement_title,
            requirement_type: req.requirement_type || "solicitation_specific",
            requirement_category: req.requirement_category === "mandatory" ? "mandatory" : "desirable",
            requirement_description: req.requirement_description || "",
            requirement_source: req.requirement_source || "",
            compliance_status: "not_started",
            risk_level: req.risk_level || "medium",
            format_requirements: req.format_requirements || null,
            ai_detected: true,
            ai_confidence: 85
          });
        }

        queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
        alert(`✓ Extracted ${result.requirements.length} requirements from solicitation documents!`);
      } else {
        alert("No requirements found in documents. Try different documents or add manually.");
      }

      setShowExtractDialog(false);
    } catch (error) {
      console.error("Error extracting requirements:", error);
      alert("Error extracting requirements. Please try again.");
    }
    setIsExtracting(false);
  };

  const autoMapSections = async () => {
    if (requirements.length === 0 || sections.length === 0) {
      alert("Need both requirements and proposal sections to auto-map");
      return;
    }

    setIsAutoMapping(true);
    try {
      const sectionSummaries = sections.map(s => ({
        id: s.id,
        name: s.section_name,
        content_preview: s.content ? s.content.replace(/<[^>]*>/g, ' ').substring(0, 500) : ""
      }));

      for (const req of requirements) {
        if (req.addressed_in_sections && req.addressed_in_sections.length > 0) {
          continue; // Skip already mapped
        }

        const prompt = `You are analyzing a proposal requirement to determine which proposal section(s) address it.

**REQUIREMENT:**
ID: ${req.requirement_id}
Title: ${req.requirement_title}
Description: ${req.requirement_description}
Type: ${req.requirement_type}
Category: ${req.requirement_category}

**AVAILABLE PROPOSAL SECTIONS:**
${sectionSummaries.map((s, idx) => `${idx}. ${s.name}\n   Content: ${s.content_preview}`).join('\n\n')}

**YOUR TASK:**
Determine which section(s) (if any) address this requirement. Return the indices (0-${sectionSummaries.length - 1}) of relevant sections.

Return JSON: {
  "section_indices": [<array of numbers>],
  "confidence": <number 0-100>,
  "reasoning": "<why these sections were chosen>"
}`;

        try {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
              type: "object",
              properties: {
                section_indices: { type: "array", items: { type: "number" } },
                confidence: { type: "number" },
                reasoning: { type: "string" }
              }
            }
          });

          if (result.section_indices && result.section_indices.length > 0) {
            const sectionNames = result.section_indices
              .filter(idx => idx >= 0 && idx < sectionSummaries.length)
              .map(idx => sectionSummaries[idx].name);

            if (sectionNames.length > 0) {
              await base44.entities.ComplianceRequirement.update(req.id, {
                addressed_in_sections: sectionNames,
                compliance_status: "in_progress",
                compliance_notes: `Auto-mapped with ${result.confidence}% confidence: ${result.reasoning}`
              });
            }
          }
        } catch (error) {
          console.error(`Error mapping requirement ${req.requirement_id}:`, error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
      alert("✓ Auto-mapping complete! Review the mappings and adjust as needed.");
    } catch (error) {
      console.error("Error auto-mapping:", error);
      alert("Error during auto-mapping. Please try again.");
    }
    setIsAutoMapping(false);
  };

  const exportToExcel = () => {
    // Create CSV content
    const headers = [
      "Requirement ID",
      "Title",
      "Type",
      "Category",
      "Description",
      "Source",
      "Status",
      "Addressed In",
      "Evidence",
      "Risk Level",
      "Notes"
    ];

    const rows = filteredRequirements.map(req => [
      req.requirement_id || "",
      req.requirement_title || "",
      req.requirement_type || "",
      req.requirement_category || "",
      req.requirement_description || "",
      req.requirement_source || "",
      req.compliance_status || "",
      req.addressed_in_sections?.join(', ') || "",
      req.evidence_provided || "",
      req.risk_level || "",
      req.compliance_notes || ""
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-matrix-${proposalData.proposal_name || 'proposal'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-700 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'at_risk': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'non_compliant': return 'bg-red-100 text-red-700 border-red-300';
      case 'needs_review': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'not_applicable': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-amber-600 text-white';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = !searchQuery || 
      req.requirement_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requirement_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requirement_description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || req.compliance_status === filterStatus;
    const matchesCategory = filterCategory === "all" || req.requirement_category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = {
    total: requirements.length,
    compliant: requirements.filter(r => r.compliance_status === 'compliant').length,
    inProgress: requirements.filter(r => r.compliance_status === 'in_progress').length,
    notStarted: requirements.filter(r => r.compliance_status === 'not_started').length,
    nonCompliant: requirements.filter(r => r.compliance_status === 'non_compliant').length,
    mandatory: requirements.filter(r => r.requirement_category === 'mandatory').length,
    criticalRisk: requirements.filter(r => r.risk_level === 'critical').length
  };

  const compliancePercentage = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Shield className="w-7 h-7 text-indigo-600" />
                Compliance Matrix
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Track all solicitation requirements and compliance status
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowExtractDialog(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Extract
              </Button>
              <Button variant="outline" onClick={autoMapSections} disabled={isAutoMapping}>
                {isAutoMapping ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Target className="w-4 h-4 mr-2" />
                )}
                Auto-Map
              </Button>
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Requirement
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border-2">
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-600">Total</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-green-200">
              <p className="text-2xl font-bold text-green-600">{stats.compliant}</p>
              <p className="text-xs text-slate-600">Compliant</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-blue-200">
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              <p className="text-xs text-slate-600">In Progress</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-slate-200">
              <p className="text-2xl font-bold text-slate-600">{stats.notStarted}</p>
              <p className="text-xs text-slate-600">Not Started</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-red-200">
              <p className="text-2xl font-bold text-red-600">{stats.nonCompliant}</p>
              <p className="text-xs text-slate-600">Non-Compliant</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-purple-200">
              <p className="text-2xl font-bold text-purple-600">{stats.mandatory}</p>
              <p className="text-xs text-slate-600">Mandatory</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-orange-200">
              <p className="text-2xl font-bold text-orange-600">{compliancePercentage}%</p>
              <p className="text-xs text-slate-600">Complete</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="mandatory">Mandatory</SelectItem>
                <SelectItem value="desirable">Desirable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Matrix Table */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredRequirements.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Table2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 mb-2">No requirements yet</p>
              <p className="text-sm text-slate-500 mb-4">
                Extract requirements from RFP documents or add manually
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowExtractDialog(true)} variant="outline">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Extract from RFP
                </Button>
                <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Req ID</TableHead>
                    <TableHead className="w-64">Title</TableHead>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead className="w-24">Category</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-48">Addressed In</TableHead>
                    <TableHead className="w-24">Risk</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequirements.map((req) => (
                    <TableRow key={req.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-sm">{req.requirement_id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-sm">{req.requirement_title}</p>
                          {req.requirement_description && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                              {req.requirement_description}
                            </p>
                          )}
                          {req.requirement_source && (
                            <p className="text-xs text-slate-500 mt-1">
                              Source: {req.requirement_source}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {req.requirement_type?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={req.requirement_category === 'mandatory' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                          {req.requirement_category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(req.compliance_status)}>
                          {req.compliance_status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {req.addressed_in_sections && req.addressed_in_sections.length > 0 ? (
                            req.addressed_in_sections.map((section, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {section}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">Not mapped</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(req.risk_level)}>
                          {req.risk_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(req)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Delete this requirement?')) {
                                deleteRequirementMutation.mutate(req.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingRequirement ? 'Edit Requirement' : 'Add New Requirement'}
            </DialogTitle>
            <DialogDescription>
              Track compliance requirements from the solicitation
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Requirement ID</label>
                  <Input
                    placeholder="e.g., L.3.2 or FAR-52.215-1"
                    value={formData.requirement_id}
                    onChange={(e) => setFormData({ ...formData, requirement_id: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Title *</label>
                  <Input
                    placeholder="Brief requirement title"
                    value={formData.requirement_title}
                    onChange={(e) => setFormData({ ...formData, requirement_title: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Type</label>
                  <Select
                    value={formData.requirement_type}
                    onValueChange={(value) => setFormData({ ...formData, requirement_type: value })}
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

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Category</label>
                  <Select
                    value={formData.requirement_category}
                    onValueChange={(value) => setFormData({ ...formData, requirement_category: value })}
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

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Risk Level</label>
                  <Select
                    value={formData.risk_level}
                    onValueChange={(value) => setFormData({ ...formData, risk_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Description</label>
                <Textarea
                  placeholder="Detailed requirement description"
                  value={formData.requirement_description}
                  onChange={(e) => setFormData({ ...formData, requirement_description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Source</label>
                  <Input
                    placeholder="e.g., Section L.3, Page 12"
                    value={formData.requirement_source}
                    onChange={(e) => setFormData({ ...formData, requirement_source: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Compliance Status</label>
                  <Select
                    value={formData.compliance_status}
                    onValueChange={(value) => setFormData({ ...formData, compliance_status: value })}
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
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Evidence Provided</label>
                <Textarea
                  placeholder="Where/how this requirement is addressed"
                  value={formData.evidence_provided}
                  onChange={(e) => setFormData({ ...formData, evidence_provided: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Notes</label>
                <Textarea
                  placeholder="Additional notes about compliance"
                  value={formData.compliance_notes}
                  onChange={(e) => setFormData({ ...formData, compliance_notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {editingRequirement ? 'Update' : 'Add'} Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extract Dialog */}
      <Dialog open={showExtractDialog} onOpenChange={setShowExtractDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Extract Requirements
            </DialogTitle>
            <DialogDescription>
              Automatically extract compliance requirements from RFP/SOW documents
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="bg-purple-50 border-purple-200">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <AlertDescription className="text-sm text-purple-900">
                <strong>AI will analyze your solicitation documents and extract:</strong>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Section L requirements (Instructions to Offerors)</li>
                  <li>Section M criteria (Evaluation)</li>
                  <li>Section C requirements (Statement of Work)</li>
                  <li>FAR/DFARS clauses</li>
                  <li>Certifications and format requirements</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert className="bg-blue-50 border-blue-200">
              <FileText className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                Make sure you've uploaded RFP, RFQ, SOW, or PWS documents in Phase 3 before extracting.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtractDialog(false)}>
              Cancel
            </Button>
            <Button onClick={extractRequirements} disabled={isExtracting}>
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extract Requirements
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}