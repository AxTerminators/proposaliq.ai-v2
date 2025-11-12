import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Building2,
  FolderOpen,
  LayoutGrid,
  Users,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Client Workspace Initializer
 * Checks if client workspace is properly initialized and offers setup
 */
export default function ClientWorkspaceInitializer({ organization, onComplete }) {
  const [setupStatus, setSetupStatus] = useState({
    hasBoard: false,
    hasFolders: false,
    hasRelationship: false,
    checking: true
  });

  useEffect(() => {
    const checkSetup = async () => {
      if (!organization || organization.organization_type !== 'client_organization') {
        setSetupStatus(prev => ({ ...prev, checking: false }));
        return;
      }

      try {
        // Check for master board
        const boards = await base44.entities.KanbanConfig.filter({
          organization_id: organization.id,
          is_master_board: true
        });

        // Check for folders
        const folders = await base44.entities.Folder.filter({
          organization_id: organization.id
        });

        // Check for relationship
        const relationships = await base44.entities.OrganizationRelationship.filter({
          client_organization_id: organization.id
        });

        setSetupStatus({
          hasBoard: boards.length > 0,
          hasFolders: folders.length > 0,
          hasRelationship: relationships.length > 0,
          checking: false
        });
      } catch (error) {
        console.error('[ClientWorkspaceInitializer] Error checking setup:', error);
        setSetupStatus(prev => ({ ...prev, checking: false }));
      }
    };

    checkSetup();
  }, [organization]);

  const initializeWorkspaceMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.parent_organization_id) {
        throw new Error('No parent organization found');
      }

      const response = await base44.functions.invoke('createClientOrganization', {
        consulting_firm_id: organization.parent_organization_id,
        organization_name: organization.organization_name,
        contact_name: organization.contact_name,
        contact_email: organization.contact_email,
        skip_org_creation: true // Organization already exists, just setup
      });

      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: () => {
      toast.success("✅ Workspace initialized successfully!");
      setSetupStatus({
        hasBoard: true,
        hasFolders: true,
        hasRelationship: true,
        checking: false
      });
      if (onComplete) onComplete();
    },
    onError: (error) => {
      toast.error("Failed to initialize: " + error.message);
    }
  });

  if (setupStatus.checking) {
    return (
      <Card className="border-2 border-blue-300 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-blue-900">Checking workspace setup...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isComplete = setupStatus.hasBoard && setupStatus.hasFolders && setupStatus.hasRelationship;
  const completionPercentage = [
    setupStatus.hasBoard,
    setupStatus.hasFolders,
    setupStatus.hasRelationship
  ].filter(Boolean).length * 33.33;

  if (isComplete) {
    return null; // Don't show if everything is set up
  }

  return (
    <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <Sparkles className="w-5 h-5" />
          Workspace Setup Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-700">
          This client workspace needs to be initialized with default configuration.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {setupStatus.hasBoard ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
            )}
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-slate-600" />
              <span className={cn(
                "text-sm",
                setupStatus.hasBoard ? "text-green-700 font-semibold" : "text-slate-600"
              )}>
                Master proposal board
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {setupStatus.hasFolders ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
            )}
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-slate-600" />
              <span className={cn(
                "text-sm",
                setupStatus.hasFolders ? "text-green-700 font-semibold" : "text-slate-600"
              )}>
                Content library folders
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {setupStatus.hasRelationship ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
            )}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              <span className={cn(
                "text-sm",
                setupStatus.hasRelationship ? "text-green-700 font-semibold" : "text-slate-600"
              )}>
                Relationship tracking
              </span>
            </div>
          </div>
        </div>

        <Progress value={completionPercentage} className="h-2" />

        <Button
          onClick={() => initializeWorkspaceMutation.mutate()}
          disabled={initializeWorkspaceMutation.isPending}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {initializeWorkspaceMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Initializing Workspace...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Initialize Workspace Now
              <ArrowRight className="w-4 h-4 ml-auto" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}