import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Database, FileJson, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useOrganization } from "@/components/layout/OrganizationContext";

// All entities in the system
const ENTITIES = [
  'Proposal', 'ProposalSection', 'ProposalWorkflowTemplate', 'KanbanConfig',
  'Organization', 'TeamingPartner', 'ProposalResource', 'SolicitationDocument',
  'ChatMessage', 'Subscription', 'TokenUsage', 'Discussion', 'DiscussionComment',
  'AdminData', 'AuditLog', 'ProposalSectionHistory', 'ProposalComment', 'ProposalTask',
  'Notification', 'ActivityLog', 'PastPerformanceRecord', 'KeyPersonnel',
  'CalendarEvent', 'DataCallRequest'
];

export default function SystemBackup() {
  const { organization, user } = useOrganization();
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, entity: '' });
  const [exportResults, setExportResults] = useState(null);

  const isSuperAdmin = user?.admin_role === 'super_admin';

  // Get counts for all entities
  const { data: entityCounts = {}, isLoading } = useQuery({
    queryKey: ['entity-counts', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return {};
      
      const counts = {};
      for (const entity of ENTITIES) {
        try {
          const data = await base44.entities[entity].filter(
            { organization_id: organization.id }
          );
          counts[entity] = data.length;
        } catch (error) {
          counts[entity] = 0;
        }
      }
      return counts;
    },
    enabled: !!organization?.id
  });

  const handleExportAll = async () => {
    if (!organization?.id) return;

    setExporting(true);
    setExportResults(null);
    const exportData = {
      metadata: {
        organization_id: organization.id,
        organization_name: organization.organization_name,
        export_date: new Date().toISOString(),
        exported_by: user?.email
      },
      entities: {}
    };

    let successCount = 0;
    let errorCount = 0;
    
    setExportProgress({ current: 0, total: ENTITIES.length, entity: '' });

    for (let i = 0; i < ENTITIES.length; i++) {
      const entity = ENTITIES[i];
      setExportProgress({ current: i + 1, total: ENTITIES.length, entity });
      
      try {
        const data = await base44.entities[entity].filter(
          { organization_id: organization.id }
        );
        exportData.entities[entity] = data;
        successCount++;
      } catch (error) {
        console.error(`Error exporting ${entity}:`, error);
        exportData.entities[entity] = { error: error.message };
        errorCount++;
      }
    }

    // Download as JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `govhq-backup-${organization.organization_name}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportResults({ successCount, errorCount, total: ENTITIES.length });
    setExporting(false);
  };

  const handleExportEntity = async (entityName) => {
    if (!organization?.id) return;

    try {
      const data = await base44.entities[entityName].filter(
        { organization_id: organization.id }
      );

      const exportData = {
        metadata: {
          organization_id: organization.id,
          organization_name: organization.organization_name,
          entity: entityName,
          export_date: new Date().toISOString(),
          exported_by: user?.email,
          record_count: data.length
        },
        records: data
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityName}-${organization.organization_name}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`✅ Exported ${data.length} ${entityName} records`);
    } catch (error) {
      alert(`Error exporting ${entityName}: ${error.message}`);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md border-2 border-red-200">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Admin Only</h2>
            <p className="text-slate-600">This page is only accessible to super administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">System Backup & Export</h1>
            <p className="text-slate-600">Export all organization data for backup and rollback preparation</p>
          </div>
          <Badge className="bg-blue-100 text-blue-700">Phase 0: Preparation</Badge>
        </div>

        {/* Warning */}
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 mb-1">Critical: Store Backups Safely</p>
                <p className="text-sm text-amber-800">
                  Downloaded files contain all organization data including sensitive information. 
                  Store securely and keep multiple copies before making system changes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Quick Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-semibold text-slate-900">Full Organization Export</p>
                <p className="text-sm text-slate-600">
                  Export all {ENTITIES.length} entity types to single JSON file
                </p>
              </div>
              <Button
                onClick={handleExportAll}
                disabled={exporting || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export All Data
                  </>
                )}
              </Button>
            </div>

            {exporting && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm font-medium text-blue-900">
                    Exporting {exportProgress.entity}... ({exportProgress.current}/{exportProgress.total})
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {exportResults && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-900">Export Complete!</span>
                </div>
                <p className="text-sm text-green-800">
                  Successfully exported {exportResults.successCount}/{exportResults.total} entities
                  {exportResults.errorCount > 0 && ` (${exportResults.errorCount} errors)`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entity List */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-blue-600" />
              Individual Entity Export
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-slate-600">Loading entity counts...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ENTITIES.map(entity => {
                  const count = entityCounts[entity] || 0;
                  return (
                    <div
                      key={entity}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{entity}</p>
                        <p className="text-xs text-slate-600">{count} records</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportEntity(entity)}
                        disabled={count === 0}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}