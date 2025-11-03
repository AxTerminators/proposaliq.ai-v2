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
        console.log('[OrganizationContext] Starting to load...');
        
        // Load current user
        const currentUser = await Promise.race([
          base44.auth.me(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('User load timeout')), 5000)
          )
        ]);
        
        if (!mounted) return;
        console.log('[OrganizationContext] User loaded:', currentUser?.email);
        setUser(currentUser);

        // Determine organization ID
        const orgId = currentUser.active_client_id || 
                      currentUser.client_accesses?.[0]?.organization_id;

        console.log('[OrganizationContext] OrgId:', orgId);

        if (orgId) {
          // Load organization
          const orgs = await Promise.race([
            base44.entities.Organization.filter({ id: orgId }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Org load timeout')), 5000)
            )
          ]);
          
          if (!mounted) return;
          
          if (orgs.length > 0) {
            console.log('[OrganizationContext] Organization loaded:', orgs[0].organization_name);
            setOrganization(orgs[0]);

            // Load subscription (non-blocking)
            try {
              const subs = await Promise.race([
                base44.entities.Subscription.filter({ organization_id: orgs[0].id }, '-created_date', 1),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Subscription load timeout')), 5000)
                )
              ]);
              
              if (mounted && subs.length > 0) {
                console.log('[OrganizationContext] Subscription loaded');
                setSubscription(subs[0]);
              }
            } catch (subError) {
              console.warn('[OrganizationContext] Subscription load failed:', subError);
            }
          }
        } else {
          // Try to find organization by created_by
          console.log('[OrganizationContext] No orgId, searching by created_by...');
          try {
            const orgs = await Promise.race([
              base44.entities.Organization.filter(
                { created_by: currentUser.email },
                '-created_date',
                1
              ),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Org search timeout')), 5000)
              )
            ]);
            
            if (!mounted) return;
            
            if (orgs.length > 0) {
              console.log('[OrganizationContext] Found organization:', orgs[0].organization_name);
              setOrganization(orgs[0]);
            } else {
              console.log('[OrganizationContext] No organization found');
            }
          } catch (orgError) {
            console.error('[OrganizationContext] Organization search failed:', orgError);
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
        }
      }
    };

    // Start loading with a safety timeout
    loadData();
    
    // Safety fallback - force loading to complete after 10 seconds
    const safetyTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.error('[OrganizationContext] Safety timeout triggered - forcing load complete');
        setIsLoading(false);
        setError(new Error('Loading timeout - please refresh'));
      }
    }, 10000);
    
    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
    };
  }, []);

  const refetch = async () => {
    console.log('[OrganizationContext] Refetch requested');
    setIsLoading(true);
    setError(null);
    
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const orgId = currentUser.active_client_id || 
                    currentUser.client_accesses?.[0]?.organization_id;
      
      let loadedOrg = null;
      
      if (orgId) {
        const orgs = await base44.entities.Organization.filter({ id: orgId });
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