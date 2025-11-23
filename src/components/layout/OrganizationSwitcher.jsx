import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, Loader2, CheckCircle2, Star, Briefcase, Users2, ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/**
 * Enhanced Organization Switcher for Client-as-Organization Model
 * Supports switching between consulting_firm and multiple client_organization workspaces
 */
export default function OrganizationSwitcher({ user, currentOrganization, onSwitch }) {
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      orgs.push(...ownedOrgs.map(org => ({ 
        ...org, 
        access_type: 'owner',
        access_role: 'organization_owner'
      })));

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
              access_role: access.role,
              is_favorite: access.is_favorite || false,
              organization_type_from_access: access.organization_type
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
      console.log('[OrgSwitcher] Switching to organization:', newOrgId);
      
      // SINGLE SOURCE OF TRUTH: Update active_organization_id
      const recentOrgs = user.recently_accessed_orgs || [];
      const updatedRecent = [newOrgId, ...recentOrgs.filter(id => id !== newOrgId)].slice(0, 5);
      
      await base44.auth.updateMe({ 
        active_organization_id: newOrgId,
        active_client_id: newOrgId, // Keep for backward compatibility during migration
        recently_accessed_orgs: updatedRecent
      });
      
      console.log('[OrgSwitcher] ✅ User updated with new active_organization_id');
      return newOrgId;
    },
    onSuccess: async (newOrgId) => {
      toast.success("Workspace switched successfully!");
      
      if (onSwitch) {
        await onSwitch(newOrgId);
      }
      
      setShowSwitcher(false);
      setIsSwitching(false);
      
      console.log('[OrgSwitcher] Reloading page with new organization...');
      window.location.reload();
    },
    onError: (error) => {
      console.error('[OrgSwitcher] Switch failed:', error);
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

  const toggleFavorite = async (org, e) => {
    e.stopPropagation();
    
    const accessIndex = user.client_accesses?.findIndex(
      acc => acc.organization_id === org.id
    );
    
    if (accessIndex === -1) return;
    
    const updatedAccesses = [...user.client_accesses];
    updatedAccesses[accessIndex] = {
      ...updatedAccesses[accessIndex],
      is_favorite: !updatedAccesses[accessIndex].is_favorite
    };
    
    try {
      await base44.auth.updateMe({ client_accesses: updatedAccesses });
      toast.success(
        updatedAccesses[accessIndex].is_favorite 
          ? "Added to favorites" 
          : "Removed from favorites"
      );
    } catch (error) {
      toast.error("Failed to update favorite");
    }
  };

  // Group organizations by type
  const consultingFirms = accessibleOrgs.filter(org => 
    org.organization_type === 'consulting_firm' || 
    org.organization_type === 'consultancy' ||
    (org.organization_type === 'demo' && org.demo_view_mode === 'consultancy')
  );

  const clientOrganizations = accessibleOrgs.filter(org => 
    org.organization_type === 'client_organization'
  );

  const otherOrgs = accessibleOrgs.filter(org => 
    !consultingFirms.includes(org) && !clientOrganizations.includes(org)
  );

  const favoriteOrgs = accessibleOrgs.filter(org => org.is_favorite);
  const recentOrgIds = user?.recently_accessed_orgs || [];
  const recentOrgs = recentOrgIds
    .map(id => accessibleOrgs.find(org => org.id === id))
    .filter(Boolean);

  // Filter by search
  const filterOrgs = (orgs) => {
    if (!searchQuery) return orgs;
    return orgs.filter(org =>
      org.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.contact_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Don't show switcher if user only has access to one organization
  if (accessibleOrgs.length <= 1) {
    return null;
  }

  const getOrgTypeIcon = (org) => {
    if (org.organization_type === 'consulting_firm' || org.organization_type === 'consultancy') {
      return <Briefcase className="w-5 h-5 text-purple-600" />;
    }
    if (org.organization_type === 'client_organization') {
      return <Users2 className="w-5 h-5 text-blue-600" />;
    }
    return <Building2 className="w-5 h-5 text-slate-600" />;
  };

  const getOrgTypeBadge = (org) => {
    if (org.organization_type === 'consulting_firm') return 'Your Firm';
    if (org.organization_type === 'consultancy') return 'Consultant';
    if (org.organization_type === 'client_organization') return 'Client Workspace';
    if (org.organization_type === 'corporate') return 'Corporate';
    if (org.organization_type === 'demo') return '🎭 Demo';
    return org.organization_type;
  };

  return (
    <>
      {/* Compact Organization Selector Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSwitcher(true)}
        className="h-9 gap-2 border-slate-300 hover:border-blue-400 transition-colors max-w-[200px] min-h-[44px]"
        aria-label={`Switch workspace (current: ${currentOrganization?.organization_name})`}
      >
        {getOrgTypeIcon(currentOrganization)}
        <span className="hidden sm:inline font-medium text-slate-700 truncate flex-1">
          {currentOrganization?.organization_name || "Select Org"}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          {accessibleOrgs.length}
        </Badge>
      </Button>

      {/* Enhanced Organization Switcher Dialog */}
      <Dialog open={showSwitcher} onOpenChange={setShowSwitcher}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Building2 className="w-6 h-6 text-blue-600" />
              Switch Workspace
            </DialogTitle>
            <DialogDescription>
              You have access to {accessibleOrgs.length} workspace{accessibleOrgs.length !== 1 ? 's' : ''}
              {consultingFirms.length > 0 && clientOrganizations.length > 0 && (
                <span> ({consultingFirms.length} firm{consultingFirms.length !== 1 ? 's' : ''}, {clientOrganizations.length} client{clientOrganizations.length !== 1 ? 's' : ''})</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabbed Organization Lists */}
          <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                All ({accessibleOrgs.length})
              </TabsTrigger>
              {favoriteOrgs.length > 0 && (
                <TabsTrigger value="favorites">
                  <Star className="w-3 h-3 mr-1" />
                  Favorites
                </TabsTrigger>
              )}
              {recentOrgs.length > 0 && (
                <TabsTrigger value="recent">
                  Recent
                </TabsTrigger>
              )}
              {consultingFirms.length > 0 && clientOrganizations.length > 0 && (
                <TabsTrigger value="by-type">
                  By Type
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all" className="flex-1 overflow-y-auto space-y-2 mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : filterOrgs(accessibleOrgs).length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  No organizations match your search
                </div>
              ) : (
                filterOrgs(accessibleOrgs).map((org) => (
                  <OrganizationCard
                    key={org.id}
                    org={org}
                    currentOrgId={currentOrganization?.id}
                    isSwitching={isSwitching}
                    onSwitch={handleSwitchOrganization}
                    onToggleFavorite={toggleFavorite}
                    getOrgTypeBadge={getOrgTypeBadge}
                    getOrgTypeIcon={getOrgTypeIcon}
                  />
                ))
              )}
            </TabsContent>

            {favoriteOrgs.length > 0 && (
              <TabsContent value="favorites" className="flex-1 overflow-y-auto space-y-2 mt-4">
                {filterOrgs(favoriteOrgs).map((org) => (
                  <OrganizationCard
                    key={org.id}
                    org={org}
                    currentOrgId={currentOrganization?.id}
                    isSwitching={isSwitching}
                    onSwitch={handleSwitchOrganization}
                    onToggleFavorite={toggleFavorite}
                    getOrgTypeBadge={getOrgTypeBadge}
                    getOrgTypeIcon={getOrgTypeIcon}
                  />
                ))}
              </TabsContent>
            )}

            {recentOrgs.length > 0 && (
              <TabsContent value="recent" className="flex-1 overflow-y-auto space-y-2 mt-4">
                {filterOrgs(recentOrgs).map((org) => (
                  <OrganizationCard
                    key={org.id}
                    org={org}
                    currentOrgId={currentOrganization?.id}
                    isSwitching={isSwitching}
                    onSwitch={handleSwitchOrganization}
                    onToggleFavorite={toggleFavorite}
                    getOrgTypeBadge={getOrgTypeBadge}
                    getOrgTypeIcon={getOrgTypeIcon}
                  />
                ))}
              </TabsContent>
            )}

            {consultingFirms.length > 0 && clientOrganizations.length > 0 && (
              <TabsContent value="by-type" className="flex-1 overflow-y-auto space-y-4 mt-4">
                {/* Consulting Firms Section */}
                {filterOrgs(consultingFirms).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-purple-600" />
                      Your Consulting Firm{consultingFirms.length > 1 ? 's' : ''}
                    </h3>
                    <div className="space-y-2">
                      {filterOrgs(consultingFirms).map((org) => (
                        <OrganizationCard
                          key={org.id}
                          org={org}
                          currentOrgId={currentOrganization?.id}
                          isSwitching={isSwitching}
                          onSwitch={handleSwitchOrganization}
                          onToggleFavorite={toggleFavorite}
                          getOrgTypeBadge={getOrgTypeBadge}
                          getOrgTypeIcon={getOrgTypeIcon}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Client Organizations Section */}
                {filterOrgs(clientOrganizations).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Users2 className="w-4 h-4 text-blue-600" />
                      Client Workspaces ({filterOrgs(clientOrganizations).length})
                    </h3>
                    <div className="space-y-2">
                      {filterOrgs(clientOrganizations).map((org) => (
                        <OrganizationCard
                          key={org.id}
                          org={org}
                          currentOrgId={currentOrganization?.id}
                          isSwitching={isSwitching}
                          onSwitch={handleSwitchOrganization}
                          onToggleFavorite={toggleFavorite}
                          getOrgTypeBadge={getOrgTypeBadge}
                          getOrgTypeIcon={getOrgTypeIcon}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>

          <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
            <p className="text-xs text-slate-500 truncate flex-1">
              Current: <strong className="text-slate-900">{currentOrganization?.organization_name}</strong>
            </p>
            <Button
              variant="ghost"
              onClick={() => setShowSwitcher(false)}
              disabled={isSwitching}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OrganizationCard({ 
  org, 
  currentOrgId, 
  isSwitching, 
  onSwitch, 
  onToggleFavorite, 
  getOrgTypeBadge,
  getOrgTypeIcon 
}) {
  const isCurrentOrg = org.id === currentOrgId;
  const accessTypeLabel = org.access_type === 'owner' 
    ? 'Owner' 
    : org.access_role || 'Team Member';

  return (
    <button
      onClick={() => onSwitch(org.id)}
      disabled={isSwitching || isCurrentOrg}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all group",
        isCurrentOrg
          ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 cursor-default shadow-lg"
          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50 hover:shadow-md cursor-pointer",
        isSwitching && "opacity-50 cursor-wait"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
            org.organization_type === 'client_organization'
              ? "bg-gradient-to-br from-blue-400 to-blue-600"
              : "bg-gradient-to-br from-purple-500 to-indigo-600"
          )}>
            {getOrgTypeIcon(org)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-base truncate flex items-center gap-2">
              {org.organization_name}
              {org.is_favorite && (
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
              )}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
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
              <Badge className={cn(
                "text-xs",
                org.organization_type === 'demo' 
                  ? 'bg-purple-100 text-purple-700'
                  : org.organization_type === 'client_organization'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
              )}>
                {getOrgTypeBadge(org)}
              </Badge>
              {org.parent_organization_id && (
                <Badge variant="outline" className="text-xs">
                  Managed Client
                </Badge>
              )}
            </div>
            {org.contact_email && (
              <p className="text-xs text-slate-500 truncate mt-1">
                {org.contact_email}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {org.access_type === 'team_member' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => onToggleFavorite(org, e)}
              className="opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px]"
              aria-label={org.is_favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={cn(
                "w-4 h-4",
                org.is_favorite && "fill-amber-400 text-amber-400"
              )} />
            </Button>
          )}
          
          {isCurrentOrg ? (
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
          ) : (
            <ArrowRight className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </button>
  );
}