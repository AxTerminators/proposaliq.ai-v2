import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Star,
  FileText
} from "lucide-react";
import { toast } from "sonner";

export default function QuickExportPanel({ organization }) {
  const queryClient = useQueryClient();
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  // Fetch proposals
  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      return await base44.entities.Proposal.filter({
        organization_id: organization.id
      }, '-updated_date', 50);
    },
    enabled: !!organization?.id
  });

  // Fetch presets
  const { data: presets = [], isLoading: loadingPresets } = useQuery({
    queryKey: ['exportPresets', organization?.id],
    queryFn: async () => {
      return await base44.entities.ExportPreset.filter({
        organization_id: organization.id
      }, '-is_favorite,-created_date');
    },
    enabled: !!organization?.id
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['exportTemplates', organization?.id],
    queryFn: async () => {
      return await base44.entities.ExportTemplate.filter({
        organization_id: organization.id
      });
    },
    enabled: !!organization?.id
  });

  // Find default preset
  const defaultPreset = presets.find(p => p.is_default);

  // Quick export mutation
  const quickExportMutation = useMutation({
    mutationFn: async ({ proposalId, presetId }) => {
      const preset = presets.find(p => p.id === presetId);
      if (!preset) throw new Error('Preset not found');

      // Fetch proposal sections
      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId
      }, 'order');

      // Call export function
      const response = await base44.functions.invoke('generateProposalDocument', {
        proposalId,
        sectionIds: sections.map(s => s.id),
        format: preset.export_format,
        templateId: preset.template_id,
        options: {
          includeCoverPage: preset.include_cover_page,
          includeTableOfContents: preset.include_toc,
          applyWatermark: preset.apply_watermark
        }
      });

      return response.data;
    },
    onSuccess: (data) => {
      setExportResult(data);
      toast.success('Export completed successfully!');
      queryClient.invalidateQueries({ queryKey: ['exportHistory'] });
    },
    onError: (error) => {
      toast.error('Export failed: ' + error.message);
      setExportResult({ error: error.message });
    },
    onSettled: () => {
      setIsExporting(false);
    }
  });

  const handleQuickExport = () => {
    if (!selectedProposal) {
      toast.error('Please select a proposal');
      return;
    }

    const presetToUse = selectedPreset || defaultPreset?.id;
    if (!presetToUse) {
      toast.error('Please select a preset or create a default preset');
      return;
    }

    setIsExporting(true);
    setExportResult(null);
    quickExportMutation.mutate({
      proposalId: selectedProposal,
      presetId: presetToUse
    });
  };

  const handleDownload = () => {
    if (exportResult?.download_url) {
      const link = document.createElement('a');
      link.href = exportResult.download_url;
      link.download = exportResult.file_name;
      link.click();
    }
  };

  if (loadingProposals || loadingPresets) {
    return <Skeleton className="h-96 w-full" />;
  }

  const favoritePresets = presets.filter(p => p.is_favorite);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Quick Export</h2>
        <p className="text-slate-600">Export proposals instantly using saved presets</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Configure Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Proposal Selection */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Select Proposal *
              </label>
              <Select value={selectedProposal || ""} onValueChange={setSelectedProposal}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a proposal..." />
                </SelectTrigger>
                <SelectContent>
                  {proposals.map((proposal) => (
                    <SelectItem key={proposal.id} value={proposal.id}>
                      <div className="flex items-center gap-2">
                        <span>{proposal.proposal_name}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {proposal.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preset Selection */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Export Preset {defaultPreset && '(Optional)'}
              </label>
              <Select 
                value={selectedPreset || (defaultPreset?.id || "")} 
                onValueChange={setSelectedPreset}
              >
                <SelectTrigger>
                  <SelectValue placeholder={defaultPreset ? `${defaultPreset.preset_name} (Default)` : "Choose a preset..."} />
                </SelectTrigger>
                <SelectContent>
                  {defaultPreset && (
                    <SelectItem value={defaultPreset.id}>
                      <div className="flex items-center gap-2">
                        <span>{defaultPreset.preset_name}</span>
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      </div>
                    </SelectItem>
                  )}
                  {favoritePresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex items-center gap-2">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{preset.preset_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {presets.filter(p => !p.is_favorite && p.id !== defaultPreset?.id).map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.preset_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preset Preview */}
            {(selectedPreset || defaultPreset) && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Preset Settings</h4>
                {(() => {
                  const preset = presets.find(p => p.id === (selectedPreset || defaultPreset?.id));
                  const template = templates.find(t => t.id === preset?.template_id);
                  return (
                    <div className="space-y-1 text-xs text-slate-600">
                      <div>Format: <Badge className="ml-1 text-xs uppercase">{preset?.export_format}</Badge></div>
                      {template && <div>Template: {template.template_name}</div>}
                      {preset?.include_cover_page && <div>✓ Cover Page</div>}
                      {preset?.include_toc && <div>✓ Table of Contents</div>}
                      {preset?.apply_watermark && <div>✓ Watermark for Drafts</div>}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Export Button */}
            <Button
              onClick={handleQuickExport}
              disabled={!selectedProposal || isExporting}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Quick Export
                </>
              )}
            </Button>

            {presets.length === 0 && (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  No export presets found. Create a preset in the Presets tab first.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Export Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!exportResult && !isExporting && (
              <div className="text-center py-12 text-slate-500">
                <Download className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Export results will appear here</p>
              </div>
            )}

            {isExporting && (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 mx-auto mb-3 text-blue-600 animate-spin" />
                <p className="text-slate-600">Generating export...</p>
              </div>
            )}

            {exportResult && !exportResult.error && (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <AlertDescription>
                    <p className="font-semibold text-green-900">Export Complete!</p>
                    <p className="text-sm text-green-800 mt-1">
                      Your document is ready to download
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">File Name:</span>
                    <span className="font-medium text-slate-900">{exportResult.file_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Format:</span>
                    <Badge className="uppercase">{exportResult.format}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Size:</span>
                    <span className="font-medium text-slate-900">
                      {(exportResult.file_size_bytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  {exportResult.has_watermark && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Status:</span>
                      <Badge variant="outline" className="text-amber-700">Draft Version</Badge>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleDownload}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download File
                </Button>

                <p className="text-xs text-center text-slate-500">
                  Download link expires in 24 hours
                </p>
              </div>
            )}

            {exportResult?.error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <AlertDescription>
                  <p className="font-semibold text-red-900">Export Failed</p>
                  <p className="text-sm text-red-800 mt-1">{exportResult.error}</p>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}