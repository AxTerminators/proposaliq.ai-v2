import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const OrganizationContext = createContext(null);

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}

export function OrganizationProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load current user
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Determine organization ID
        let orgId = null;
        if (currentUser.active_client_id) {
          orgId = currentUser.active_client_id;
        } else if (currentUser.client_accesses && currentUser.client_accesses.length > 0) {
          orgId = currentUser.client_accesses[0].organization_id;
        } else {
          const orgs = await base44.entities.Organization.filter(
            { created_by: currentUser.email },
            '-created_date',
            1
          );
          if (orgs.length > 0) {
            orgId = orgs[0].id;
          }
        }

        // Load organization details
        if (orgId) {
          const orgs = await base44.entities.Organization.filter({ id: orgId });
          if (orgs.length > 0) {
            setOrganization(orgs[0]);

            // Load subscription
            try {
              const subs = await base44.entities.Subscription.filter(
                { organization_id: orgs[0].id },
                '-created_date',
                1
              );
              if (subs.length > 0) {
                setSubscription(subs[0]);
              }
            } catch (subError) {
              console.error('Error loading subscription:', subError);
            }
          }
        }
      } catch (err) {
        console.error('Error loading organization context:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
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
      console.error('Error refetching organization context:', err);
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