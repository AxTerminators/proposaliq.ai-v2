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

export function OrganizationProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    // Force loading to complete after 3 seconds no matter what
    const forceTimeout = setTimeout(() => {
      if (mounted) {
        console.error('[OrganizationContext] Forced timeout - setting isLoading to false');
        setIsLoading(false);
      }
    }, 3000);
    
    const loadData = async () => {
      try {
        console.log('[OrganizationContext] Starting...');
        
        // Load user
        const currentUser = await base44.auth.me();
        if (!mounted) return;
        console.log('[OrganizationContext] User loaded');
        setUser(currentUser);

        // Try to get organization
        try {
          let orgId = currentUser.active_client_id;
          
          if (!orgId && currentUser.client_accesses?.length > 0) {
            orgId = currentUser.client_accesses[0].organization_id;
          }
          
          if (!orgId) {
            const orgs = await base44.entities.Organization.filter(
              { created_by: currentUser.email },
              '-created_date',
              1
            );
            if (orgs.length > 0) {
              orgId = orgs[0].id;
            }
          }

          if (orgId && mounted) {
            const orgs = await base44.entities.Organization.filter({ id: orgId });
            if (orgs.length > 0 && mounted) {
              console.log('[OrganizationContext] Organization loaded');
              setOrganization(orgs[0]);

              // Try to get subscription
              try {
                const subs = await base44.entities.Subscription.filter(
                  { organization_id: orgs[0].id },
                  '-created_date',
                  1
                );
                if (mounted && subs.length > 0) {
                  setSubscription(subs[0]);
                }
              } catch (e) {
                console.warn('[OrganizationContext] Subscription load failed:', e);
              }
            }
          }
        } catch (e) {
          console.error('[OrganizationContext] Organization load failed:', e);
        }
        
        console.log('[OrganizationContext] Complete');
      } catch (err) {
        console.error('[OrganizationContext] Fatal error:', err);
        if (mounted) {
          setError(err);
        }
      } finally {
        if (mounted) {
          clearTimeout(forceTimeout);
          setIsLoading(false);
          console.log('[OrganizationContext] isLoading set to false');
        }
      }
    };

    loadData();
    
    return () => {
      mounted = false;
      clearTimeout(forceTimeout);
    };
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      let orgId = currentUser.active_client_id || currentUser.client_accesses?.[0]?.organization_id;
      
      if (!orgId) {
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          orgId = orgs[0].id;
        }
      }
      
      if (orgId) {
        const orgs = await base44.entities.Organization.filter({ id: orgId });
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
          
          const subs = await base44.entities.Subscription.filter(
            { organization_id: orgs[0].id },
            '-created_date',
            1
          );
          if (subs.length > 0) {
            setSubscription(subs[0]);
          }
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