import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Shield,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  Search,
  Filter,
  Loader2,
  FileSpreadsheet,
  Link as LinkIcon,
  Unlink
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function EnhancedComplianceMatrix({ proposal, organization }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [autoMapping, setAutoMapping] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const { data: requirements = [] } = useQuery({
    queryKey: ['compliance-requirements', proposal.id],
    queryFn: () => base44.entities.ComplianceRequirement.filter({
      proposal_id: proposal.id
    }, 'requirement_id'),
    initialData: []
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['proposal-sections-compliance', proposal.id],
    queryFn: () => base44.entities.ProposalSection.filter({
      proposal_id: proposal.id
    }, 'order'),
    initialData: []
  });

  const updateRequirementMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceRequirement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-requirements'] });
    }
  });

  // Auto-map requirements to sections using AI
  const performAutoMapping = async () => {
    if (!sections.length || !requirements.length) {
      alert("Need sections and requirements to auto-map");
      return;
    }

    setAutoMapping(true);
    
    try {
      // TOKEN SAFETY: Process in batches of 10 requirements at a time
      const batchSize = 10;
      const totalBatches = Math.ceil(requirements.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, requirements.length);
        const batchRequirements = requirements.slice(batchStart, batchEnd);

        // TOKEN SAFETY: Minimal section info - only ID, name, type (no content preview)
        const sectionsInfo = sections.map(s => ({
          id: s.id,
          name: s.section_name,
          type: s.section_type
        }));

        // TOKEN SAFETY: Minimal requirement info
        const requirementsInfo = batchRequirements.map(r => ({
          id: r.id,
          title: r.requirement_title,
          type: r.requirement_type
        }));

        const prompt = `Map each compliance requirement to the most appropriate proposal section(s) based on section type and requirement type.

**SECTIONS:**
${JSON.stringify(sectionsInfo, null, 2)}

**REQUIREMENTS (Batch ${batchIndex + 1}/${totalBatches}):**
${JSON.stringify(requirementsInfo, null, 2)}

Return JSON:
{
  "mappings": [
    {
      "requirement_id": "string",
      "section_ids": ["string"],
      "cross_reference": "string (e.g., 'See Section 3.2')",
      "confidence": 85
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

        // Apply mappings for this batch
        for (const mapping of result.mappings || []) {
          const req = batchRequirements.find(r => r.id === mapping.requirement_id);
          if (req) {
            await updateRequirementMutation.mutateAsync({
              id: req.id,
              data: {
                addressed_in_sections: mapping.section_ids,
                evidence_provided: mapping.cross_reference,
                compliance_status: mapping.section_ids.length > 0 ? 'in_progress' : 'not_started'
              }
            });
          }
        }

        // Small delay between batches to avoid rate limits
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      alert(`✓ Auto-mapped ${requirements.length} requirements to sections!`);
    } catch (error) {
      console.error("Error auto-mapping:", error);
      alert("Error during auto-mapping. Please try again.");
    } finally {
      setAutoMapping(false);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    setExportingExcel(true);
    
    try {
      const headers = ["Req ID", "Title", "Type", "Category", "Status", "Risk", "Addressed In", "Evidence", "Source"];
      const rows = filteredRequirements.map(req => [
        req.requirement_id || '',
        req.requirement_title || '',
        req.requirement_type || '',
        req.requirement_category || '',
        req.compliance_status || '',
        req.risk_level || '',
        (req.addressed_in_sections || []).map(sId => {
          const sec = sections.find(s => s.id === sId);
          return sec?.section_name || sId;
        }).join('; '),
        req.evidence_provided || '',
        req.requirement_source || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proposal.proposal_name}_Compliance_Matrix.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

    } catch (error) {
      console.error("Error exporting:", error);
      alert("Error exporting to Excel");
    } finally {
      setExportingExcel(false);
    }
  };

  const analyzeGaps = async () => {
    const unmapped = requirements.filter(r => 
      !r.addressed_in_sections || r.addressed_in_sections.length === 0
    );

    if (unmapped.length === 0) {
      alert("✓ No gaps found! All requirements are mapped to sections.");
      return;
    }

    alert(`⚠️ Gap Analysis:\n\n${unmapped.length} requirements are not mapped to any section.\n\nCritical: ${unmapped.filter(r => r.risk_level === 'critical').length}\nHigh: ${unmapped.filter(r => r.risk_level === 'high').length}`);
  };

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = !searchQuery || 
      req.requirement_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requirement_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requirement_description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || req.compliance_status === filterStatus;
    const matchesRisk = filterRisk === 'all' || req.risk_level === filterRisk;
    
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const statusCounts = {
    total: requirements.length,
    compliant: requirements.filter(r => r.compliance_status === 'compliant').length,
    in_progress: requirements.filter(r => r.compliance_status === 'in_progress').length,
    not_started: requirements.filter(r => r.compliance_status === 'not_started').length,
    critical_unmapped: requirements.filter(r => 
      r.risk_level === 'critical' && (!r.addressed_in_sections || r.addressed_in_sections.length === 0)
    ).length
  };

  const getStatusColor = (status) => {
    const colors = {
      compliant: 'bg-green-500',
      in_progress: 'bg-blue-500',
      not_started: 'bg-slate-400',
      non_compliant: 'bg-red-500',
      needs_review: 'bg-yellow-500'
    };
    return colors[status] || 'bg-slate-400';
  };

  const getRiskColor = (risk) => {
    const colors = {
      critical: 'bg-red-100 text-red-700 border-red-300',
      high: 'bg-orange-100 text-orange-700 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-green-100 text-green-700 border-green-300'
    };
    return colors[risk] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-700">{statusCounts.total}</p>
            <p className="text-xs text-blue-900">Total Requirements</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-700">{statusCounts.compliant}</p>
            <p className="text-xs text-green-900">Compliant</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <Loader2 className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-amber-700">{statusCounts.in_progress}</p>
            <p className="text-xs text-amber-900">In Progress</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-700">{statusCounts.critical_unmapped}</p>
            <p className="text-xs text-red-900">Critical Gaps</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="non_compliant">Non-Compliant</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={performAutoMapping}
              disabled={autoMapping}
              variant="outline"
              className="bg-gradient-to-r from-indigo-50 to-purple-50"
            >
              {autoMapping ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Auto-Map
            </Button>

            <Button onClick={analyzeGaps} variant="outline">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Gap Analysis
            </Button>

            <Button
              onClick={exportToExcel}
              disabled={exportingExcel}
              variant="outline"
            >
              {exportingExcel ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requirements List */}
      <div className="space-y-3">
        {filteredRequirements.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Requirements Found</h3>
              <p className="text-slate-600">
                {searchQuery || filterStatus !== 'all' || filterRisk !== 'all'
                  ? 'No requirements match your filters'
                  : 'Upload solicitation documents to auto-extract requirements'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequirements.map((req) => (
            <RequirementCard
              key={req.id}
              requirement={req}
              sections={sections}
              onUpdate={(data) => updateRequirementMutation.mutate({ id: req.id, data })}
              getStatusColor={getStatusColor}
              getRiskColor={getRiskColor}
            />
          ))
        )}
      </div>
    </div>
  );
}

function RequirementCard({ requirement, sections, onUpdate, getStatusColor, getRiskColor }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState(false);
  const [evidenceText, setEvidenceText] = useState(requirement.evidence_provided || '');

  const linkedSections = (requirement.addressed_in_sections || [])
    .map(sId => sections.find(s => s.id === sId))
    .filter(Boolean);

  const saveEvidence = () => {
    onUpdate({ evidence_provided: evidenceText });
    setEditingEvidence(false);
  };

  const toggleSection = (sectionId) => {
    const current = requirement.addressed_in_sections || [];
    const updated = current.includes(sectionId)
      ? current.filter(id => id !== sectionId)
      : [...current, sectionId];
    
    onUpdate({ 
      addressed_in_sections: updated,
      compliance_status: updated.length > 0 ? 'in_progress' : 'not_started'
    });
  };

  return (
    <Card className={cn(
      "border-2 transition-all",
      isExpanded && "shadow-lg"
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {requirement.requirement_id && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {requirement.requirement_id}
                  </Badge>
                )}
                <Badge className={getStatusColor(requirement.compliance_status)}>
                  {requirement.compliance_status?.replace('_', ' ')}
                </Badge>
                <Badge className={cn("border-2", getRiskColor(requirement.risk_level))}>
                  {requirement.risk_level} risk
                </Badge>
                {requirement.ai_detected && (
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Detected
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold text-sm mb-1">{requirement.requirement_title}</h4>
              {requirement.requirement_source && (
                <p className="text-xs text-slate-500">Source: {requirement.requirement_source}</p>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <>
              {requirement.requirement_description && (
                <div className="p-3 bg-slate-50 rounded text-sm border">
                  <p className="text-slate-700 line-clamp-5">{requirement.requirement_description}</p>
                </div>
              )}

              {/* Link to Sections */}
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Addressed in Sections:
                </p>
                {linkedSections.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {linkedSections.map(sec => (
                      <Badge key={sec.id} variant="secondary" className="gap-2">
                        <LinkIcon className="w-3 h-3" />
                        {sec.section_name}
                        <button
                          onClick={() => toggleSection(sec.id)}
                          className="hover:text-red-600"
                        >
                          <Unlink className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-orange-600 mb-2">⚠️ Not mapped to any section</p>
                )}
                
                <Select onValueChange={(value) => toggleSection(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Link to a section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map(sec => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.section_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Evidence */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-700">Evidence/Cross-Reference:</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingEvidence(!editingEvidence)}
                    className="h-7 text-xs"
                  >
                    {editingEvidence ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
                {editingEvidence ? (
                  <div className="space-y-2">
                    <Textarea
                      value={evidenceText}
                      onChange={(e) => setEvidenceText(e.target.value)}
                      placeholder="e.g., See Section 3.2, pages 15-17..."
                      className="text-sm"
                      rows={3}
                    />
                    <Button size="sm" onClick={saveEvidence}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Save Evidence
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded border">
                    {requirement.evidence_provided || 'No evidence provided yet'}
                  </p>
                )}
              </div>

              {/* Status Update */}
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">Update Status:</p>
                <Select
                  value={requirement.compliance_status}
                  onValueChange={(value) => onUpdate({ compliance_status: value })}
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}