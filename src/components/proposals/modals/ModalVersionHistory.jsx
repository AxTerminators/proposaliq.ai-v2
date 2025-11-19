import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, User, FileText, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Phase 3.1: Modal Version History Component
 * 
 * Displays version history of modal submissions for audit trails and rollback capabilities.
 * Tracks who submitted what data and when, allowing users to view and restore previous versions.
 */
export default function ModalVersionHistory({ isOpen, onClose, config, entityId }) {
  const [expandedVersion, setExpandedVersion] = useState(null);

  // Fetch version history for this entity
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['modal_versions', config?.modalId, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      // Query ModalInteraction records for this modal/entity
      const interactions = await base44.entities.ModalInteraction.filter({
        proposal_id: config?.proposalId,
        modal_template_id: config?.modalId,
        interaction_type: 'submitted'
      }, '-created_date', 50);

      return interactions;
    },
    enabled: isOpen && !!entityId
  });

  const handleRestore = async (version) => {
    try {
      const snapshot = JSON.parse(version.form_data_snapshot);
      
      if (config?.onRestore) {
        await config.onRestore(snapshot);
        toast.success(`Restored version from ${moment(version.created_date).format('MMM D, YYYY h:mm A')}`);
        onClose();
      } else {
        toast.error('Restore functionality not configured');
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    }
  };

  const toggleExpand = (versionId) => {
    setExpandedVersion(expandedVersion === versionId ? null : versionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            Version History
          </DialogTitle>
          <p className="text-sm text-slate-500">
            View and restore previous submissions
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading version history...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No version history available</p>
            </div>
          ) : (
            versions.map((version, index) => {
              const isExpanded = expandedVersion === version.id;
              const snapshot = version.form_data_snapshot ? JSON.parse(version.form_data_snapshot) : null;
              const isLatest = index === 0;

              return (
                <Card key={version.id} className={cn(
                  "border-2 transition-all",
                  isLatest ? "border-blue-200 bg-blue-50/50" : "border-slate-200"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {isLatest && (
                            <Badge className="bg-blue-600 text-white">Current Version</Badge>
                          )}
                          <Badge variant="outline">
                            Version {versions.length - index}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{version.user_email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{moment(version.created_date).format('MMM D, YYYY h:mm A')}</span>
                          </div>
                        </div>

                        {version.fields_filled && version.total_fields && (
                          <div className="mt-2 text-xs text-slate-500">
                            {version.fields_filled} of {version.total_fields} fields completed
                          </div>
                        )}

                        {version.time_to_complete_seconds && (
                          <div className="mt-1 text-xs text-slate-500">
                            Completed in {Math.round(version.time_to_complete_seconds / 60)} minutes
                          </div>
                        )}

                        {/* Expandable data preview */}
                        {snapshot && (
                          <div className="mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(version.id)}
                              className="h-8 text-xs"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4 mr-1" />
                                  Hide Details
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 mr-1" />
                                  View Details
                                </>
                              )}
                            </Button>

                            {isExpanded && (
                              <div className="mt-3 p-3 bg-slate-50 border rounded-lg">
                                <pre className="text-xs text-slate-700 whitespace-pre-wrap overflow-auto max-h-64">
                                  {JSON.stringify(snapshot, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {!isLatest && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version)}
                          className="flex items-center gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}