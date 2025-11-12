import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Organization Switcher Component
 * Allows users with access to multiple organizations to switch between them
 */
export default function OrganizationSwitcher({ user, currentOrganization, onSwitch }) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Fetch all organizations user has access to
  const { data: accessibleOrgs = [], isLoading } = useQuery({
    queryKey: ['accessible-organizations', user?.email],
    queryFn: async () => {
      if (!user) return [];

      const orgs = [];

      // 1. Get organizations user created (they own)
      const ownedOrgs = await base44.entities.Organization.filter(
        { created_by: user.email },
        'organization_name'
      );
      orgs.push(...ownedOrgs.map(org => ({ ...org, access_type: 'owner' })));

      // 2. Get organizations from client_accesses (invited to as team member)
      if (user.client_accesses && user.client_accesses.length > 0) {
        for (const access of user.client_accesses) {
          const orgResults = await base44.entities.Organization.filter(
            { id: access.organization_id }
          );
          
          if (orgResults.length > 0 && !orgs.some(o => o.id === orgResults[0].id)) {
            orgs.push({
              ...orgResults[0],
              access_type: 'team_member',
              access_role: access.role
            });
          }
        }
      }

      // Remove duplicates by id
      const uniqueOrgs = orgs.filter((org, index, self) =>
        index === self.findIndex((o) => o.id === org.id)
      );

      return uniqueOrgs;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const switchOrganizationMutation = useMutation({
    mutationFn: async (newOrgId) => {
      // Update user's active_client_id
      await base44.auth.updateMe({ active_client_id: newOrgId });
      return newOrgId;
    },
    onSuccess: async (newOrgId) => {
      toast.success("Organization switched successfully!");
      
      // Call parent callback to trigger context refresh
      if (onSwitch) {
        await onSwitch(newOrgId);
      }
      
      setShowSwitcher(false);
      setIsSwitching(false);
      
      // Force page reload to ensure all data is fresh
      window.location.reload();
    },
    onError: (error) => {
      toast.error("Failed to switch organization: " + error.message);
      setIsSwitching(false);
    }
  });

  const handleSwitchOrganization = async (newOrgId) => {
    if (newOrgId === currentOrganization?.id) {
      setShowSwitcher(false);
      return;
    }

    setIsSwitching(true);
    await switchOrganizationMutation.mutateAsync(newOrgId);
  };

  // Don't show switcher if user only has access to one organization
  if (accessibleOrgs.length <= 1) {
    return null;
  }

  return (
    <>
      {/* Compact Organization Selector Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSwitcher(true)}
        className="h-9 gap-2 border-slate-300 hover:border-blue-400 transition-colors"
      >
        <Building2 className="w-4 h-4 text-slate-600" />
        <span className="hidden sm:inline font-medium text-slate-700 max-w-[120px] truncate">
          {currentOrganization?.organization_name || "Select Org"}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
        <Badge variant="secondary" className="text-xs">
          {accessibleOrgs.length}
        </Badge>
      </Button>

      {/* Organization Switcher Dialog */}
      <Dialog open={showSwitcher} onOpenChange={setShowSwitcher}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Switch Organization
            </DialogTitle>
            <DialogDescription>
              You have access to {accessibleOrgs.length} organization{accessibleOrgs.length !== 1 ? 's' : ''}. 
              Select the one you want to work with.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              accessibleOrgs.map((org) => {
                const isCurrentOrg = org.id === currentOrganization?.id;
                const accessTypeLabel = org.access_type === 'owner' 
                  ? 'Owner' 
                  : org.access_role || 'Team Member';

                return (
                  <button
                    key={org.id}
                    onClick={() => handleSwitchOrganization(org.id)}
                    disabled={isSwitching || isCurrentOrg}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border-2 transition-all",
                      isCurrentOrg
                        ? "border-blue-500 bg-blue-50 cursor-default"
                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50 cursor-pointer",
                      isSwitching && "opacity-50 cursor-wait"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 text-lg truncate">
                              {org.organization_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "text-xs",
                                  org.access_type === 'owner' 
                                    ? "bg-green-100 text-green-700" 
                                    : "bg-blue-100 text-blue-700"
                                )}
                              >
                                {accessTypeLabel}
                              </Badge>
                              {org.organization_type && (
                                <Badge className={cn(
                                  "text-xs",
                                  org.organization_type === 'demo' 
                                    ? 'bg-purple-100 text-purple-700'
                                    : org.organization_type === 'consultancy' 
                                      ? 'bg-purple-100 text-purple-700' 
                                      : 'bg-blue-100 text-blue-700'
                                )}>
                                  {org.organization_type === 'demo' 
                                    ? '🎭 Demo' 
                                    : org.organization_type === 'consultancy' 
                                      ? 'Consultant' 
                                      : 'Corporate'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {org.contact_email && (
                          <p className="text-sm text-slate-600 truncate ml-13">
                            {org.contact_email}
                          </p>
                        )}
                      </div>

                      {isCurrentOrg && (
                        <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 ml-3" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-xs text-slate-500">
              Current: <strong>{currentOrganization?.organization_name}</strong>
            </p>
            <Button
              variant="ghost"
              onClick={() => setShowSwitcher(false)}
              disabled={isSwitching}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}