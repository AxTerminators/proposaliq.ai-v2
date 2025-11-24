import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

const getCachedOrgId = (userEmail) => {
  try {
    const cached = localStorage.getItem(`org_id_${userEmail}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const setCachedOrgId = (userEmail, orgId) => {
  try {
    localStorage.setItem(`org_id_${userEmail}`, JSON.stringify(orgId));
  } catch {
    // Ignore storage errors
  }
};

// Cache user data in memory to prevent re-fetching
let cachedUser = null;
let cachedOrg = null;

export function OrganizationProvider({ children }) {
  const queryClient = useQueryClient();
  const [orgId, setOrgId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const hasLoadedOnce = useRef(false);

  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      // Use cached user if available to prevent re-fetch
      if (cachedUser && hasLoadedOnce.current) {
        return cachedUser;
      }
      const currentUser = await base44.auth.me();
      cachedUser = currentUser;
      hasLoadedOnce.current = true;
      return currentUser;
    },
    staleTime: Infinity, // Never consider stale
    gcTime: Infinity, // Never garbage collect
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Initialize orgId ONCE when user is loaded
  useEffect(() => {
    if (user?.email && !isInitialized) {
      console.log('[OrgContext] Initializing organization for user:', user.email);
      
      // Priority order (MOST RELIABLE FIRST):
      // 1. User's active_client_id (explicitly set by user)
      // 2. Cached org from localStorage (preserves last choice)
      // 3. First client access (fallback)
      const cachedOrgId = getCachedOrgId(user.email);
      let determinedOrgId = null;

      if (user.active_client_id) {
        determinedOrgId = user.active_client_id;
        console.log('[OrgContext] Using active_client_id:', determinedOrgId);
      } else if (cachedOrgId) {
        determinedOrgId = cachedOrgId;
        console.log('[OrgContext] Using cached org:', determinedOrgId);
      } else if (user.client_accesses?.[0]?.organization_id) {
        determinedOrgId = user.client_accesses[0].organization_id;
        console.log('[OrgContext] Using first client access:', determinedOrgId);
      }

      if (determinedOrgId) {
        setOrgId(determinedOrgId);
        setCachedOrgId(user.email, determinedOrgId);
        setIsInitialized(true);
        console.log('[OrgContext] ✅ Organization initialized:', determinedOrgId);
      }
    }
  }, [user, isInitialized]);

  const { data: organization, isLoading: isLoadingOrg, error: orgError } = useQuery({
    queryKey: ['current-organization', orgId],
    queryFn: async () => {
      if (!user?.email || !orgId) return null;
      
      // Use cached org if available and matches
      if (cachedOrg && cachedOrg.id === orgId && hasLoadedOnce.current) {
        return cachedOrg;
      }
      
      console.log('[OrgContext] Fetching organization:', orgId);
      const orgs = await base44.entities.Organization.filter({ id: orgId });
      
      if (orgs.length > 0) {
        console.log('[OrgContext] ✅ Organization found:', orgs[0].organization_name);
        cachedOrg = orgs[0];
        return orgs[0];
      }
      
      console.warn('[OrgContext] ⚠️ Organization not found with ID:', orgId);
      return null;
    },
    enabled: !!user?.email && !!orgId && isInitialized,
    staleTime: Infinity, // Never consider stale
    gcTime: Infinity, // Never garbage collect
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
    staleTime: Infinity, // Never consider stale
    gcTime: Infinity, // Never garbage collect
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