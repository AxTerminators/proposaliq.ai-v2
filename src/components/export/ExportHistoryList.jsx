import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  FileType,
  Download,
  Clock,
  User,
  HardDrive,
  Droplet,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ExportHistoryList({ proposal }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['export-history', proposal.id],
    queryFn: async () => {
      const records = await base44.entities.ExportHistory.filter({
        proposal_id: proposal.id
      });
      return records.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      ).slice(0, 10); // Last 10 exports
    },
    enabled: !!proposal.id
  });

  const handleRedownload = async (record) => {
    try {
      // Check if signed URL is still valid
      const expiresAt = new Date(record.expires_at);
      const now = new Date();

      if (now > expiresAt) {
        toast.error('Download link expired', {
          description: 'Please generate a new export'
        });
        return;
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = record.download_url;
      link.download = record.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started');

      // TODO: Track download event in Phase 8 analytics
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file', {
        description: error.message
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-slate-600">
            No exports yet. Create your first export above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((record) => {
        const isExpired = new Date(record.expires_at) < new Date();
        const formatIcon = record.export_format === 'pdf' ? FileType : FileText;
        const FormatIcon = formatIcon;

        return (
          <Card key={record.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Format Icon */}
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <FormatIcon className="w-6 h-6 text-slate-600" />
                </div>

                {/* Export Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-slate-900 truncate">
                      {record.file_name}
                    </h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Watermark Status Badge */}
                      {record.has_watermark ? (
                        <Badge className="bg-orange-500">
                          <Droplet className="w-3 h-3 mr-1" />
                          DRAFT
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          FINAL
                        </Badge>
                      )}
                      
                      {/* Format Badge */}
                      <Badge variant="outline" className="uppercase">
                        {record.export_format}
                      </Badge>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{record.exported_by_name || record.exported_by_email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(record.created_date), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      <span>{(record.file_size_bytes / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  {/* Proposal Status at Export */}
                  {record.proposal_status_at_export && (
                    <div className="text-xs text-slate-500 mb-2">
                      Status at export: <span className="font-medium capitalize">{record.proposal_status_at_export}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRedownload(record)}
                      disabled={isExpired}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {isExpired ? 'Link Expired' : 'Re-download'}
                    </Button>

                    {isExpired && (
                      <span className="text-xs text-orange-600">
                        Generate a new export above
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}