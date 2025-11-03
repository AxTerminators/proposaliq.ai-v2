import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const OrganizationContext = createContext(null);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};

async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
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
      return orgs[0];
    }
  }
  
  return null;
}

export const OrganizationProvider = ({ children }) => {
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
        
        const currentUser = await base44.auth.me();
        if (!mounted) return;
        
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (!mounted) return;
        
        if (org) {
          setOrganization(org);
          
          // Load subscription
          const subs = await base44.entities.Subscription.filter(
            { organization_id: org.id },
            '-created_date',
            1
          );
          if (!mounted) return;
          
          if (subs.length > 0) {
            setSubscription(subs[0]);
          }
        }
      } catch (err) {
        console.error("Error loading organization data:", err);
        if (mounted) {
          setError(err.message || "Failed to load organization data");
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

  const value = {
    user,
    organization,
    subscription,
    isLoading,
    error,
    refreshOrganization: async () => {
      if (organization?.id) {
        const orgs = await base44.entities.Organization.filter({ id: organization.id });
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      }
    }
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};