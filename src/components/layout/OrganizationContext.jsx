import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const OrganizationContext = createContext({
  user: null,
  organization: null,
  subscription: null,
  isLoading: true,
  error: null,
  refetch: () => {}
});

export function useOrganization() {
  return useContext(OrganizationContext);
}

// REMOVED: localStorage caching - using active_organization_id as single source of truth

export function OrganizationProvider({ children }) {
  const queryClient = useQueryClient();
  const [orgId, setOrgId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      return currentUser;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Initialize orgId ONCE when user is loaded - SINGLE SOURCE OF TRUTH
  useEffect(() => {
    if (user?.email && !isInitialized) {
      console.log('[OrgContext] Initializing organization for user:', user.email);
      
      // SINGLE SOURCE OF TRUTH: Use active_organization_id (with fallback to legacy active_client_id)
      let determinedOrgId = user.active_organization_id || user.active_client_id;

      // Fallback only if no active org set: use first client access
      if (!determinedOrgId && user.client_accesses?.[0]?.organization_id) {
        determinedOrgId = user.client_accesses[0].organization_id;
        console.log('[OrgContext] No active org set, using first client access:', determinedOrgId);
      }

      if (determinedOrgId) {
        setOrgId(determinedOrgId);
        setIsInitialized(true);
        console.log('[OrgContext] ✅ Organization initialized:', determinedOrgId);
      }
    }
  }, [user, isInitialized]);

  const { data: organization, isLoading: isLoadingOrg, error: orgError } = useQuery({
    queryKey: ['current-organization', orgId],
    queryFn: async () => {
      if (!user?.email || !orgId) return null;
      
      console.log('[OrgContext] Fetching organization:', orgId);
      const orgs = await base44.entities.Organization.filter({ id: orgId });
      
      if (orgs.length > 0) {
        console.log('[OrgContext] ✅ Organization found:', orgs[0].organization_name);
        return orgs[0];
      }
      
      console.warn('[OrgContext] ⚠️ Organization not found with ID:', orgId);
      // Don't fallback to created_by - this causes switching issues
      // If the org doesn't exist, keep orgId null and let user manually select
      return null;
    },
    enabled: !!user?.email && !!orgId && isInitialized,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const { data: subscription } = useQuery({
    queryKey: ['current-subscription', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      
      const subs = await base44.entities.Subscription.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );
      
      return subs.length > 0 ? subs[0] : null;
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ['current-user'] });
    await queryClient.invalidateQueries({ queryKey: ['current-organization'] });
    await queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
  };

  const isLoading = isLoadingUser || isLoadingOrg;
  const error = userError || orgError;

  return (
    <OrganizationContext.Provider value={{ 
      user, 
      organization, 
      subscription, 
      isLoading, 
      error, 
      refetch 
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}