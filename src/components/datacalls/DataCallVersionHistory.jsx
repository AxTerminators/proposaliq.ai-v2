import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  History, 
  Clock, 
  User, 
  FileText,
  RotateCcw,
  ChevronRight
} from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";

export default function DataCallVersionHistory({ 
  dataCall, 
  isOpen, 
  onClose,
  onRestore 
}) {
  // Fetch version history (stored in a separate entity or metadata)
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['data-call-versions', dataCall?.id],
    queryFn: async () => {
      if (!dataCall?.id) return [];
      
      // Create version history from creation and updates
      const history = [
        {
          version: 'current',
          date: dataCall.updated_date || dataCall.created_date,
          changed_by: dataCall.created_by_email,
          changed_by_name: dataCall.created_by_name,
          changes: ['Current version'],
          snapshot: dataCall
        }
      ];

      // In production, you'd fetch actual version snapshots from a VersionHistory entity
      // For now, we show the current state
      return history;
    },
    enabled: !!dataCall?.id && isOpen
  });

  const getChangeDescription = (changes) => {
    if (!changes || changes.length === 0) return 'No changes recorded';
    return changes.join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <History className="w-6 h-6 text-indigo-600" />
            Version History
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Track all changes made to this data call request
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : versions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <History className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600">No version history available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

              <div className="space-y-6">
                {versions.map((version, index) => {
                  const isLatest = index === 0;
                  
                  return (
                    <div key={version.version} className="relative">
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute left-4 w-5 h-5 rounded-full border-4 border-white",
                        isLatest ? "bg-blue-600" : "bg-slate-400"
                      )} />

                      <div className="ml-12">
                        <Card className={cn(
                          "border-2",
                          isLatest && "border-blue-400 bg-blue-50"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-slate-900">
                                    {isLatest ? 'Current Version' : `Version ${version.version}`}
                                  </h4>
                                  {isLatest && (
                                    <Badge className="bg-blue-600">Latest</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {moment(version.date).format('MMM D, YYYY h:mm A')}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {version.changed_by_name || version.changed_by}
                                  </span>
                                </div>
                              </div>

                              {!isLatest && onRestore && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onRestore(version.snapshot)}
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Restore
                                </Button>
                              )}
                            </div>

                            {/* Changes Summary */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-slate-700">Changes:</p>
                              <div className="space-y-1">
                                {version.changes.map((change, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-sm">
                                    <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    <span className="text-slate-600">{change}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Snapshot Preview */}
                            {version.snapshot && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-slate-500">Status: </span>
                                    <span className="font-semibold">{version.snapshot.overall_status}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Priority: </span>
                                    <span className="font-semibold">{version.snapshot.priority}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Items: </span>
                                    <span className="font-semibold">
                                      {version.snapshot.checklist_items?.length || 0}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Due: </span>
                                    <span className="font-semibold">
                                      {version.snapshot.due_date 
                                        ? moment(version.snapshot.due_date).format('MMM D')
                                        : 'Not set'
                                      }
                                    </span>
                                  </div>
                                </div>
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

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-amber-900">
              <FileText className="w-4 h-4 inline mr-1" />
              <strong>Note:</strong> Full version tracking is in development. Currently showing latest state.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}