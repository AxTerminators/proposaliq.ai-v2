import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

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
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        // Step 1: Load user (fast)
        const currentUser = await base44.auth.me();
        if (!mounted) return;
        
        setUser(currentUser);
        
        // Step 2: Try to get org ID from cache first
        const cachedOrgId = getCachedOrgId(currentUser.email);
        
        let orgId = currentUser.active_client_id || 
                    currentUser.client_accesses?.[0]?.organization_id ||
                    cachedOrgId;

        // Step 3: If we have a cached or direct org ID, load it immediately
        if (orgId && mounted) {
          setIsLoading(false); // Set loading to false immediately
          
          // Load org in background
          base44.entities.Organization.filter({ id: orgId })
            .then(orgs => {
              if (mounted && orgs.length > 0) {
                setOrganization(orgs[0]);
                setCachedOrgId(currentUser.email, orgs[0].id);
                
                // Load subscription in background (non-blocking)
                base44.entities.Subscription.filter(
                  { organization_id: orgs[0].id },
                  '-created_date',
                  1
                ).then(subs => {
                  if (mounted && subs.length > 0) {
                    setSubscription(subs[0]);
                  }
                }).catch(() => {});
              }
            })
            .catch(err => {
              console.error('[OrganizationContext] Error loading org:', err);
            });
        } else {
          // Step 4: No cached ID, need to search (slower path)
          try {
            const orgs = await base44.entities.Organization.filter(
              { created_by: currentUser.email },
              '-created_date',
              1
            );
            
            if (!mounted) return;
            
            if (orgs.length > 0) {
              setOrganization(orgs[0]);
              setCachedOrgId(currentUser.email, orgs[0].id);
            }
          } catch (e) {
            console.error('[OrganizationContext] Error searching for org:', e);
          }
          
          if (mounted) {
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('[OrganizationContext] Error loading user:', err);
        if (mounted) {
          setError(err);
          setIsLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      mounted = false;
    };
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const orgId = currentUser.active_client_id || 
                    currentUser.client_accesses?.[0]?.organization_id ||
                    getCachedOrgId(currentUser.email);
      
      if (orgId) {
        const orgs = await base44.entities.Organization.filter({ id: orgId });
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
          setCachedOrgId(currentUser.email, orgs[0].id);
          
          const subs = await base44.entities.Subscription.filter(
            { organization_id: orgs[0].id },
            '-created_date',
            1
          );
          if (subs.length > 0) {
            setSubscription(subs[0]);
          }
        }
      } else {
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
          setCachedOrgId(currentUser.email, orgs[0].id);
        }
      }
    } catch (err) {
      console.error('[OrganizationContext] Refetch error:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <OrganizationContext.Provider value={{ user, organization, subscription, isLoading, error, refetch }}>
      {children}
    </OrganizationContext.Provider>
  );
}