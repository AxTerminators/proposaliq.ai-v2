import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  Eye, 
  Download, 
  Edit, 
  Trash2,
  Mail,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock
} from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";

const ACTION_ICONS = {
  data_call_viewed: Eye,
  data_call_exported_pdf: Download,
  data_call_exported_excel: Download,
  data_call_batch_exported: Download,
  data_call_portal_accessed: ExternalLink,
  data_call_portal_copied: Copy,
  data_call_sensitive_accessed: AlertTriangle,
  data_call_files_downloaded: Download,
  data_call_edited: Edit,
  data_call_deleted: Trash2,
  data_call_approval_decision: CheckCircle2,
  data_call_reminder_sent: Mail
};

const ACTION_COLORS = {
  data_call_viewed: 'bg-blue-100 text-blue-700',
  data_call_exported_pdf: 'bg-purple-100 text-purple-700',
  data_call_exported_excel: 'bg-green-100 text-green-700',
  data_call_batch_exported: 'bg-indigo-100 text-indigo-700',
  data_call_portal_accessed: 'bg-cyan-100 text-cyan-700',
  data_call_portal_copied: 'bg-slate-100 text-slate-700',
  data_call_sensitive_accessed: 'bg-red-100 text-red-700',
  data_call_files_downloaded: 'bg-amber-100 text-amber-700',
  data_call_edited: 'bg-yellow-100 text-yellow-700',
  data_call_deleted: 'bg-red-100 text-red-700',
  data_call_approval_decision: 'bg-green-100 text-green-700',
  data_call_reminder_sent: 'bg-blue-100 text-blue-700'
};

export default function DataCallAuditTrail({ 
  dataCallId, 
  isOpen, 
  onClose 
}) {
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['data-call-audit', dataCallId],
    queryFn: async () => {
      if (!dataCallId) return [];
      
      const logs = await base44.entities.AuditLog.filter({
        target_entity: `data_call:${dataCallId}`
      }, '-created_date');
      
      return logs;
    },
    enabled: !!dataCallId && isOpen
  });

  const getActionLabel = (actionType) => {
    return actionType
      .replace('data_call_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Shield className="w-6 h-6 text-blue-600" />
            Security Audit Trail
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Complete history of who accessed or modified this data call
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : auditLogs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600">No audit logs recorded yet</p>
                <p className="text-xs text-slate-500 mt-2">
                  Actions will appear here as users interact with this data call
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

              <div className="space-y-4">
                {auditLogs.map((log, index) => {
                  const Icon = ACTION_ICONS[log.action_type] || Shield;
                  const colorClass = ACTION_COLORS[log.action_type] || 'bg-slate-100 text-slate-700';
                  const details = log.details ? JSON.parse(log.details) : {};
                  const isSensitive = log.action_type === 'data_call_sensitive_accessed';

                  return (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute left-4 w-5 h-5 rounded-full border-4 border-white",
                        isSensitive ? "bg-red-600" : "bg-blue-600"
                      )} />

                      <div className="ml-12">
                        <Card className={cn(
                          "border-2",
                          isSensitive && "border-red-400 bg-red-50"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center",
                                  colorClass
                                )}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {getActionLabel(log.action_type)}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    by {log.admin_email}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500">
                                  {moment(log.created_date).format('MMM D, YYYY')}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {moment(log.created_date).format('h:mm A')}
                                </p>
                              </div>
                            </div>

                            {/* Action Details */}
                            {Object.keys(details).length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="space-y-1">
                                  {details.export_format && (
                                    <p className="text-xs text-slate-600">
                                      <strong>Format:</strong> {details.export_format}
                                    </p>
                                  )}
                                  {details.files_count && (
                                    <p className="text-xs text-slate-600">
                                      <strong>Files Downloaded:</strong> {details.files_count}
                                    </p>
                                  )}
                                  {details.ip_address && (
                                    <p className="text-xs text-slate-600">
                                      <strong>IP Address:</strong> {details.ip_address}
                                    </p>
                                  )}
                                  {details.decision && (
                                    <p className="text-xs text-slate-600">
                                      <strong>Decision:</strong> {details.decision}
                                    </p>
                                  )}
                                  {details.changes && (
                                    <p className="text-xs text-slate-600">
                                      <strong>Changes:</strong> {details.changes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {isSensitive && (
                              <div className="mt-3 pt-3 border-t border-red-200">
                                <Badge className="bg-red-600">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Sensitive Data Access
                                </Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}