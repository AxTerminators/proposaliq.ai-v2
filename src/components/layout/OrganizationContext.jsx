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
    const timeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.error('[OrganizationContext] Loading timeout - forcing completion');
        setIsLoading(false);
        setError(new Error('Loading timeout'));
      }
    }, 10000); // 10 second timeout
    
    const loadData = async () => {
      try {
        console.log('[OrganizationContext] Starting to load...');
        setIsLoading(true);
        setError(null);
        
        // Load current user
        console.log('[OrganizationContext] Loading user...');
        const currentUser = await base44.auth.me();
        if (!mounted) {
          console.log('[OrganizationContext] Component unmounted, aborting');
          return;
        }
        
        console.log('[OrganizationContext] User loaded:', currentUser.email);
        setUser(currentUser);

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

        // Determine organization ID
        let orgId = null;
        if (currentUser.active_client_id) {
          orgId = currentUser.active_client_id;
          console.log('[OrganizationContext] Using active_client_id:', orgId);
        } else if (currentUser.client_accesses && currentUser.client_accesses.length > 0) {
          orgId = currentUser.client_accesses[0].organization_id;
          console.log('[OrganizationContext] Using client_accesses[0]:', orgId);
        } else {
          console.log('[OrganizationContext] Searching for organization by created_by...');
          try {
            const orgs = await base44.entities.Organization.filter(
              { created_by: currentUser.email },
              '-created_date',
              1
            );
            if (!mounted) {
              console.log('[OrganizationContext] Component unmounted, aborting');
              return;
            }
            
            if (orgs.length > 0) {
              orgId = orgs[0].id;
              console.log('[OrganizationContext] Found organization:', orgId);
            } else {
              console.log('[OrganizationContext] No organization found');
            }
          } catch (orgError) {
            console.error('[OrganizationContext] Error loading organizations:', orgError);
            // Continue anyway, user might not have an organization yet
          }
        }

        // Add small delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Load organization details
        if (orgId) {
          try {
            console.log('[OrganizationContext] Loading organization details...');
            const orgs = await base44.entities.Organization.filter({ id: orgId });
            if (!mounted) {
              console.log('[OrganizationContext] Component unmounted, aborting');
              return;
            }
            
            if (orgs.length > 0) {
              console.log('[OrganizationContext] Organization loaded:', orgs[0].organization_name);
              setOrganization(orgs[0]);

              // Add small delay
              await new Promise(resolve => setTimeout(resolve, 500));

              // Load subscription
              try {
                console.log('[OrganizationContext] Loading subscription...');
                const subs = await base44.entities.Subscription.filter(
                  { organization_id: orgs[0].id },
                  '-created_date',
                  1
                );
                if (mounted && subs.length > 0) {
                  console.log('[OrganizationContext] Subscription loaded');
                  setSubscription(subs[0]);
                } else {
                  console.log('[OrganizationContext] No subscription found');
                }
              } catch (subError) {
                console.warn('[OrganizationContext] Error loading subscription:', subError);
                // Not critical, continue
              }
            }
          } catch (orgDetailError) {
            console.error('[OrganizationContext] Error loading organization details:', orgDetailError);
            // Not critical, continue
          }
        }
        
        console.log('[OrganizationContext] Loading complete');
      } catch (err) {
        console.error('[OrganizationContext] Error loading:', err);
        if (mounted) {
          setError(err);
        }
      } finally {
        if (mounted) {
          console.log('[OrganizationContext] Setting isLoading to false');
          setIsLoading(false);
          clearTimeout(timeout);
        }
      }
    };

    loadData();
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  const refetch = async () => {
    console.log('[OrganizationContext] Refetch requested');
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let orgId = currentUser.active_client_id || 
                  (currentUser.client_accesses?.[0]?.organization_id);
      
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
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (orgId) {
        const orgs = await base44.entities.Organization.filter({ id: orgId });
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
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