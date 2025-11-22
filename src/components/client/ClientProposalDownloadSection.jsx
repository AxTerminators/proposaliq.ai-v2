import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Shield
} from "lucide-react";
import moment from "moment";

export default function ClientProposalDownloadSection({ 
  proposal, 
  client, 
  currentMember,
  organization 
}) {
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState(null);

  // Fetch export history for this proposal
  const { data: exportHistory = [], isLoading } = useQuery({
    queryKey: ['client-export-history', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      const history = await base44.entities.ExportHistory.filter(
        { proposal_id: proposal.id },
        '-created_date',
        10
      );
      return history;
    },
    enabled: !!proposal?.id
  });

  // Fetch download logs to show download count
  const { data: downloadLogs = [] } = useQuery({
    queryKey: ['client-download-logs', proposal?.id, client?.id],
    queryFn: async () => {
      if (!proposal?.id || !client?.id) return [];
      const logs = await base44.entities.ClientDownloadLog.filter({
        proposal_id: proposal.id,
        client_id: client.id
      });
      return logs;
    },
    enabled: !!proposal?.id && !!client?.id
  });

  // Log download mutation
  const logDownloadMutation = useMutation({
    mutationFn: async ({ exportRecord }) => {
      // Create download log
      await base44.entities.ClientDownloadLog.create({
        organization_id: proposal.organization_id,
        proposal_id: proposal.id,
        export_history_id: exportRecord.id,
        client_id: client?.id || null,
        team_member_id: currentMember?.id !== 'primary' ? currentMember?.id : null,
        downloaded_by_name: currentMember.member_name,
        downloaded_by_email: currentMember.member_email,
        download_type: exportRecord.has_watermark ? 'draft' : 'final',
        export_format: exportRecord.export_format,
        file_name: exportRecord.file_name
      });

      // Create notification for team
      await base44.entities.Notification.create({
        organization_id: proposal.organization_id,
        user_email: proposal.lead_writer_email || proposal.created_by,
        notification_type: 'status_change',
        title: `Client Downloaded ${exportRecord.has_watermark ? 'Draft' : 'Final'} Proposal`,
        message: `${currentMember.member_name} from ${client.client_name} downloaded ${exportRecord.has_watermark ? 'a draft version' : 'the final version'} of "${proposal.proposal_name}"`,
        related_proposal_id: proposal.id,
        priority: exportRecord.has_watermark ? 'normal' : 'high',
        action_url: `/proposal/${proposal.id}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-download-logs', proposal.id]);
    }
  });

  const handleDownload = async (exportRecord) => {
    setDownloadingId(exportRecord.id);

    try {
      // Check if URL is expired
      const now = new Date();
      const expiresAt = new Date(exportRecord.expires_at);
      const isExpired = now >= expiresAt;

      let downloadUrl = exportRecord.download_url;

      // Regenerate URL if expired
      if (isExpired) {
        const result = await base44.functions.invoke('regenerateExportDownload', {
          exportHistoryId: exportRecord.id
        });
        downloadUrl = result.download_url;
      }

      // Log the download
      await logDownloadMutation.mutateAsync({ exportRecord });

      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = exportRecord.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Get latest export
  const latestExport = exportHistory.length > 0 ? exportHistory[0] : null;
  const isDraft = latestExport?.has_watermark;

  // Calculate download stats
  const draftDownloads = downloadLogs.filter(log => log.download_type === 'draft').length;
  const finalDownloads = downloadLogs.filter(log => log.download_type === 'final').length;

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading export options...</p>
        </CardContent>
      </Card>
    );
  }

  if (exportHistory.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600 mb-2">No exports available yet</p>
          <p className="text-sm text-slate-500">The proposal team will provide download options soon</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          Download Proposal
        </CardTitle>
        <CardDescription>
          Export and download the proposal document
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Alert */}
        {isDraft ? (
          <Alert className="border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="ml-2">
              <p className="font-semibold text-orange-900 mb-1">Draft Version Available</p>
              <p className="text-sm text-orange-700">
                This proposal is currently in draft status. Downloaded documents will include a "DRAFT" watermark for review purposes. 
                The team will provide a final version once approved.
              </p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="ml-2">
              <p className="font-semibold text-green-900 mb-1">Final Version Available</p>
              <p className="text-sm text-green-700">
                This proposal has been approved and finalized. Downloaded documents will not include any watermarks.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Latest Export Card */}
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-slate-900">Latest Version</h3>
                <Badge className={isDraft ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}>
                  {isDraft ? (
                    <>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      DRAFT
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      FINAL
                    </>
                  )}
                </Badge>
                <Badge variant="outline" className="uppercase">
                  {latestExport.export_format}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mb-1">
                <strong>File:</strong> {latestExport.file_name}
              </p>
              <p className="text-sm text-slate-600 mb-1">
                <strong>Size:</strong> {(latestExport.file_size_bytes / 1024).toFixed(1)} KB
              </p>
              <p className="text-sm text-slate-600">
                <strong>Generated:</strong> {moment(latestExport.created_date).format('MMMM D, YYYY [at] h:mm A')}
              </p>
            </div>
          </div>

          <Button
            onClick={() => handleDownload(latestExport)}
            disabled={downloadingId === latestExport.id}
            className={`w-full ${
              isDraft 
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700' 
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
            }`}
            size="lg"
          >
            {downloadingId === latestExport.id ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {isDraft ? 'Download Draft for Review' : 'Download Final Proposal'}
              </>
            )}
          </Button>
        </div>

        {/* Download Statistics */}
        {(draftDownloads > 0 || finalDownloads > 0) && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{draftDownloads}</p>
              <p className="text-sm text-slate-600">Draft Downloads</p>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{finalDownloads}</p>
              <p className="text-sm text-slate-600">Final Downloads</p>
            </div>
          </div>
        )}

        {/* Previous Versions */}
        {exportHistory.length > 1 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Previous Versions ({exportHistory.length - 1})
            </h4>
            <div className="space-y-2">
              {exportHistory.slice(1, 4).map((exp) => (
                <div 
                  key={exp.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs uppercase">
                        {exp.export_format}
                      </Badge>
                      <Badge className={exp.has_watermark ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}>
                        {exp.has_watermark ? 'DRAFT' : 'FINAL'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 truncate">
                      {moment(exp.created_date).format('MMM D, YYYY [at] h:mm A')} • {(exp.file_size_bytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(exp)}
                    disabled={downloadingId === exp.id}
                  >
                    {downloadingId === exp.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="pt-4 border-t">
          <p className="text-xs text-slate-500 flex items-start gap-2">
            <Shield className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <span>
              All downloads are logged and tracked for security purposes. Download links are secure and expire after 7 days.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}