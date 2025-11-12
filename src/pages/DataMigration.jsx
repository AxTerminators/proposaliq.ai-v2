import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Users,
  FileText,
  Building2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = user.active_client_id;
  if (!orgId && user.client_accesses?.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  }
  if (!orgId) {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) orgId = orgs[0].id;
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) return orgs[0];
  }
  return null;
}

/**
 * Data Migration Tool
 * Migrate legacy Client entities to new client_organization model
 */
export default function DataMigration() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [consultingFirm, setConsultingFirm] = useState(null);
  const [selectedClients, setSelectedClients] = useState([]);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationResults, setMigrationResults] = useState([]);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setConsultingFirm(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  // Fetch legacy clients that haven't been migrated
  const { data: legacyClients = [], isLoading } = useQuery({
    queryKey: ['legacy-clients', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.Client.filter({
        organization_id: consultingFirm.id
      }, '-created_date');
    },
    enabled: !!consultingFirm?.id,
  });

  // Check which clients have already been migrated
  const { data: existingClientOrgs = [] } = useQuery({
    queryKey: ['existing-client-orgs', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.Organization.filter({
        organization_type: 'client_organization',
        parent_organization_id: consultingFirm.id
      });
    },
    enabled: !!consultingFirm?.id,
  });

  const migrateClientsMutation = useMutation({
    mutationFn: async (clientIds) => {
      const results = [];
      
      for (const clientId of clientIds) {
        try {
          const response = await base44.functions.invoke('migrateClientToOrganization', {
            client_id: clientId,
            consulting_firm_id: consultingFirm.id,
            dry_run: false
          });

          if (response.data.success) {
            results.push({
              client_id: clientId,
              success: true,
              organization_id: response.data.client_organization_id,
              migrated_proposals: response.data.migrated_proposals
            });
          } else {
            results.push({
              client_id: clientId,
              success: false,
              error: response.data.error
            });
          }
        } catch (error) {
          results.push({
            client_id: clientId,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setMigrationResults(results);
      setIsMigrating(false);
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      queryClient.invalidateQueries({ queryKey: ['legacy-clients'] });
      queryClient.invalidateQueries({ queryKey: ['existing-client-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['client-organizations'] });

      toast.success(`✅ Migrated ${successCount} of ${totalCount} clients successfully!`);
    },
    onError: (error) => {
      setIsMigrating(false);
      toast.error("Migration failed: " + error.message);
    }
  });

  const handleStartMigration = () => {
    if (selectedClients.length === 0) {
      toast.error("Select at least one client to migrate");
      return;
    }

    setShowMigrationDialog(true);
  };

  const confirmMigration = () => {
    setShowMigrationDialog(false);
    setIsMigrating(true);
    migrateClientsMutation.mutate(selectedClients);
  };

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAll = () => {
    setSelectedClients(legacyClients.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedClients([]);
  };

  if (!consultingFirm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Database className="w-8 h-8 text-purple-600" />
            Legacy Client Migration
          </h1>
          <p className="text-slate-600">
            Convert legacy Client entities to isolated client_organization workspaces
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={selectAll}
            disabled={legacyClients.length === 0}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            onClick={deselectAll}
            disabled={selectedClients.length === 0}
          >
            Deselect All
          </Button>
          <Button
            onClick={handleStartMigration}
            disabled={selectedClients.length === 0 || isMigrating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isMigrating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Migrate Selected ({selectedClients.length})
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Migration Progress */}
      {isMigrating && (
        <Card className="border-2 border-purple-300 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
              <div>
                <p className="font-semibold text-purple-900">Migration in Progress</p>
                <p className="text-sm text-purple-700">
                  Migrating {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''}...
                </p>
              </div>
            </div>
            <Progress value={50} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Migration Results */}
      {migrationResults.length > 0 && !isMigrating && (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle2 className="w-5 h-5" />
              Migration Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {migrationResults.map((result, idx) => {
                const client = legacyClients.find(c => c.id === result.client_id);
                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-3 rounded-lg border",
                      result.success
                        ? "bg-white border-green-200"
                        : "bg-red-50 border-red-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium text-slate-900">
                          {client?.client_name || 'Unknown Client'}
                        </span>
                      </div>
                      {result.success && (
                        <Badge className="bg-green-100 text-green-700">
                          {result.migrated_proposals} proposals migrated
                        </Badge>
                      )}
                    </div>
                    {!result.success && result.error && (
                      <p className="text-sm text-red-700 mt-1 ml-6">
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy Clients List */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : legacyClients.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Legacy Clients Found
            </h3>
            <p className="text-slate-600">
              All clients have been migrated to the new organization model, or you're already using the new system.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {legacyClients.map((client) => {
            const isSelected = selectedClients.includes(client.id);
            const alreadyMigrated = existingClientOrgs.some(org =>
              org.contact_email === client.contact_email
            );

            return (
              <Card
                key={client.id}
                className={cn(
                  "border-2 cursor-pointer transition-all",
                  isSelected
                    ? "border-purple-500 bg-purple-50 shadow-lg"
                    : "border-slate-200 hover:border-purple-300",
                  alreadyMigrated && "opacity-50"
                )}
                onClick={() => !alreadyMigrated && toggleClientSelection(client.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleClientSelection(client.id)}
                      disabled={alreadyMigrated}
                      className="mt-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {client.client_name}
                      </p>
                      <p className="text-sm text-slate-600 truncate">
                        {client.contact_email}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className="text-xs bg-blue-100 text-blue-700">
                          Legacy Client
                        </Badge>
                        {alreadyMigrated && (
                          <Badge className="text-xs bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Migrated
                          </Badge>
                        )}
                      </div>
                      {client.total_proposals_shared > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                          {client.total_proposals_shared} shared proposal{client.total_proposals_shared !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Migration Confirmation Dialog */}
      <Dialog open={showMigrationDialog} onOpenChange={setShowMigrationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <RefreshCw className="w-6 h-6 text-purple-600" />
              Confirm Migration
            </DialogTitle>
            <DialogDescription>
              You're about to migrate {selectedClients.length} legacy client{selectedClients.length !== 1 ? 's' : ''} to the new organization model
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-semibold mb-2">
                ✨ What will happen:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>• Create new client_organization for each client</li>
                <li>• Copy all shared proposals to client workspace</li>
                <li>• Migrate proposal sections and content</li>
                <li>• Set up default board and folder structure</li>
                <li>• Create relationship tracking records</li>
                <li>• Grant you access as organization owner</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900 font-semibold mb-2">
                ⚠️ Important Notes:
              </p>
              <ul className="text-sm text-amber-800 space-y-1 ml-4">
                <li>• Legacy Client records will NOT be deleted (backup)</li>
                <li>• You can re-run migration if needed</li>
                <li>• This operation may take a few minutes</li>
                <li>• Review results after completion</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">
                Clients to migrate:
              </p>
              {selectedClients.map(clientId => {
                const client = legacyClients.find(c => c.id === clientId);
                return (
                  <div key={clientId} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>{client?.client_name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMigrationDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmMigration}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Migration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}