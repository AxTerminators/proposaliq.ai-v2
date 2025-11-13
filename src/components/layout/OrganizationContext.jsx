import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

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

// Helper to get cached org ID from localStorage
const getCachedOrgId = (userEmail) => {
  try {
    const cached = localStorage.getItem(`org_id_${userEmail}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

// Helper to cache org ID in localStorage
const setCachedOrgId = (userEmail, orgId) => {
  try {
    localStorage.setItem(`org_id_${userEmail}`, JSON.stringify(orgId));
  } catch {
    // Ignore storage errors
  }
};

export function OrganizationProvider({ children }) {
  const [orgId, setOrgId] = useState(null);

  // PERFORMANCE FIX: Use React Query for user data with better caching
  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      
      // Determine org ID after fetching user
      const cachedOrgId = getCachedOrgId(currentUser.email);
      const determinedOrgId = currentUser.active_client_id || 
                             currentUser.client_accesses?.[0]?.organization_id ||
                             cachedOrgId;
      
      setOrgId(determinedOrgId);
      
      return currentUser;
    },
    staleTime: 5 * 60 * 1000, // Cache user for 5 minutes
    retry: 1,
  });

  // PERFORMANCE FIX: Use React Query for organization data
  const { data: organization, isLoading: isLoadingOrg, error: orgError } = useQuery({
    queryKey: ['current-organization', orgId, user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      // If we have an org ID, fetch it directly
      if (orgId) {
        const orgs = await base44.entities.Organization.filter({ id: orgId });
        if (orgs.length > 0) {
          setCachedOrgId(user.email, orgs[0].id);
          return orgs[0];
        }
      }
      
      // Fallback: search by creator
      const orgs = await base44.entities.Organization.filter(
        { created_by: user.email },
        '-created_date',
        1
      );
      
      if (orgs.length > 0) {
        setCachedOrgId(user.email, orgs[0].id);
        setOrgId(orgs[0].id);
        return orgs[0];
      }
      
      return null;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // Cache organization for 5 minutes
    retry: 1,
  });

  // PERFORMANCE FIX: Use React Query for subscription data
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
    staleTime: 10 * 60 * 1000, // Cache subscription for 10 minutes (changes less frequently)
    retry: 1,
  });

  const refetch = async () => {
    // Force refetch user, which will cascade to org and subscription
    window.location.reload();
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