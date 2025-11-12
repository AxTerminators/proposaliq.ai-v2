import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Send,
  Archive,
  Loader2,
  CheckCircle2,
  Package,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Bulk Client Operations
 * Perform operations on multiple clients at once
 */
export default function BulkClientOperations({ 
  selectedClients = [], 
  allClients = [],
  consultingFirm,
  onSelectionChange,
  onComplete 
}) {
  const queryClient = useQueryClient();
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkOperation, setBulkOperation] = useState(null);

  const bulkArchiveMutation = useMutation({
    mutationFn: async (clientIds) => {
      const results = [];
      for (const id of clientIds) {
        const client = allClients.find(c => c.id === id);
        if (client) {
          await base44.entities.Organization.update(id, {
            is_archived: true,
            archived_date: new Date().toISOString()
          });
          results.push({ id, success: true });
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-organizations'] });
      toast.success(`Archived ${selectedClients.length} client workspace(s)`);
      if (onComplete) onComplete();
      setShowBulkDialog(false);
    },
    onError: (error) => {
      toast.error("Bulk archive failed: " + error.message);
    }
  });

  const bulkHealthCheckMutation = useMutation({
    mutationFn: async (clientIds) => {
      const results = [];
      for (const id of clientIds) {
        try {
          const response = await base44.functions.invoke('calculateClientHealth', {
            client_organization_id: id
          });
          results.push({ 
            id, 
            success: response.data.success,
            health_score: response.data.health_score 
          });
        } catch (error) {
          results.push({ id, success: false, error: error.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['client-health-score'] });
      const successCount = results.filter(r => r.success).length;
      toast.success(`Updated health scores for ${successCount} of ${results.length} clients`);
      if (onComplete) onComplete();
      setShowBulkDialog(false);
    },
    onError: (error) => {
      toast.error("Health check failed: " + error.message);
    }
  });

  const handleBulkOperation = (operation) => {
    if (selectedClients.length === 0) {
      toast.error("No clients selected");
      return;
    }

    setBulkOperation(operation);
    setShowBulkDialog(true);
  };

  const executeBulkOperation = () => {
    switch (bulkOperation) {
      case 'archive':
        bulkArchiveMutation.mutate(selectedClients);
        break;
      case 'health_check':
        bulkHealthCheckMutation.mutate(selectedClients);
        break;
      default:
        break;
    }
  };

  const operations = [
    {
      key: 'archive',
      label: 'Archive Selected',
      icon: Archive,
      color: 'from-slate-500 to-slate-700',
      description: 'Archive multiple client workspaces'
    },
    {
      key: 'health_check',
      label: 'Update Health Scores',
      icon: Activity,
      color: 'from-green-500 to-emerald-600',
      description: 'Recalculate health metrics'
    }
  ];

  const selectedCount = selectedClients.length;

  return (
    <>
      <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Bulk Operations
            {selectedCount > 0 && (
              <Badge className="bg-purple-600 text-white ml-2">
                {selectedCount} selected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCount === 0 ? (
            <p className="text-slate-600 text-sm">
              Select clients from the list to perform bulk operations
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {operations.map(op => {
                const Icon = op.icon;
                return (
                  <button
                    key={op.key}
                    onClick={() => handleBulkOperation(op.key)}
                    className="group relative overflow-hidden rounded-xl border-2 border-slate-200 bg-white hover:border-purple-300 hover:shadow-lg transition-all p-4 text-left"
                  >
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity",
                      op.color
                    )} />
                    <Icon className="w-6 h-6 mb-2 text-purple-600" />
                    <p className="font-semibold text-slate-900 text-sm mb-0.5">
                      {op.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {op.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Operation Confirmation Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkOperation === 'archive' && <Archive className="w-5 h-5 text-slate-600" />}
              {bulkOperation === 'health_check' && <Activity className="w-5 h-5 text-green-600" />}
              Confirm Bulk Operation
            </DialogTitle>
            <DialogDescription>
              {bulkOperation === 'archive' && 
                `Archive ${selectedCount} client workspace${selectedCount !== 1 ? 's' : ''}?`
              }
              {bulkOperation === 'health_check' && 
                `Recalculate health scores for ${selectedCount} client${selectedCount !== 1 ? 's' : ''}?`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-slate-700 mb-3">
              This will affect the following clients:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedClients.map(id => {
                const client = allClients.find(c => c.id === id);
                return (
                  <div key={id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span className="truncate">{client?.organization_name || 'Unknown'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={executeBulkOperation}
              disabled={bulkArchiveMutation.isPending || bulkHealthCheckMutation.isPending}
              className={cn(
                bulkOperation === 'archive' 
                  ? "bg-slate-600 hover:bg-slate-700"
                  : "bg-green-600 hover:bg-green-700"
              )}
            >
              {(bulkArchiveMutation.isPending || bulkHealthCheckMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}