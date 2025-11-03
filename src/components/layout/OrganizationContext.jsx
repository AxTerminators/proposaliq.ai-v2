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
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load user first (required for everything else)
        const currentUser = await base44.auth.me();
        if (!mounted) return;
        
        setUser(currentUser);

        // Determine organization ID from user data
        const orgId = currentUser.active_client_id || 
                      currentUser.client_accesses?.[0]?.organization_id ||
                      null;

        // Load organization and subscription in parallel
        const promises = [];
        
        if (orgId) {
          // Load organization
          promises.push(
            base44.entities.Organization.filter({ id: orgId }, '-created_date', 1)
              .then(orgs => orgs.length > 0 ? orgs[0] : null)
              .catch(err => {
                console.error('[OrganizationContext] Error loading organization:', err);
                return null;
              })
          );
        } else {
          // Try to find organization by created_by
          promises.push(
            base44.entities.Organization.filter(
              { created_by: currentUser.email },
              '-created_date',
              1
            )
            .then(orgs => orgs.length > 0 ? orgs[0] : null)
            .catch(err => {
              console.error('[OrganizationContext] Error loading organization:', err);
              return null;
            })
          );
        }

        // Wait for organization to load
        const [loadedOrg] = await Promise.all(promises);
        
        if (!mounted) return;
        setOrganization(loadedOrg);

        // Load subscription only if we have an organization
        if (loadedOrg) {
          try {
            const subs = await base44.entities.Subscription.filter(
              { organization_id: loadedOrg.id },
              '-created_date',
              1
            );
            if (mounted && subs.length > 0) {
              setSubscription(subs[0]);
            }
          } catch (subError) {
            console.error('[OrganizationContext] Error loading subscription:', subError);
          }
        }
      } catch (err) {
        console.error('[OrganizationContext] Error loading:', err);
        if (mounted) {
          setError(err);
        }
      } finally {
        if (mounted) {
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
    setError(null);
    
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const orgId = currentUser.active_client_id || 
                    currentUser.client_accesses?.[0]?.organization_id;
      
      let loadedOrg = null;
      
      if (orgId) {
        const orgs = await base44.entities.Organization.filter({ id: orgId }, '-created_date', 1);
        loadedOrg = orgs.length > 0 ? orgs[0] : null;
      } else {
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        loadedOrg = orgs.length > 0 ? orgs[0] : null;
      }
      
      setOrganization(loadedOrg);
      
      if (loadedOrg) {
        const subs = await base44.entities.Subscription.filter(
          { organization_id: loadedOrg.id },
          '-created_date',
          1
        );
        if (subs.length > 0) {
          setSubscription(subs[0]);
        }
      }
    } catch (err) {
      console.error('[OrganizationContext] Error refetching:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    organization,
    subscription,
    isLoading,
    error,
    refetch
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}