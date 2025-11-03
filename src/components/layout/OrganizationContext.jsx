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

// Longer delay helper for rate limiting
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    // Wait 2 seconds before first API call
    await delay(2000);
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
    // Wait 2 seconds before next API call
    await delay(2000);
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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🔄 Loading user data...');
        const currentUser = await base44.auth.me();
        if (!mounted) return;
        
        console.log('✅ User loaded:', currentUser.email);
        setUser(currentUser);
        
        // Wait 3 seconds before loading organization
        console.log('⏳ Waiting 3s before loading organization...');
        await delay(3000);
        
        console.log('🔄 Loading organization...');
        const org = await getUserActiveOrganization(currentUser);
        if (!mounted) return;
        
        if (org) {
          console.log('✅ Organization loaded:', org.organization_name);
          setOrganization(org);
          
          // Wait 3 seconds before loading subscription
          console.log('⏳ Waiting 3s before loading subscription...');
          await delay(3000);
          
          console.log('🔄 Loading subscription...');
          const subs = await base44.entities.Subscription.filter(
            { organization_id: org.id },
            '-created_date',
            1
          );
          if (!mounted) return;
          
          if (subs.length > 0) {
            console.log('✅ Subscription loaded');
            setSubscription(subs[0]);
          }
        }
        
        console.log('✅ All data loaded successfully');
      } catch (err) {
        console.error("❌ Error loading organization data:", err);
        if (mounted) {
          const isRateLimit = err.message?.toLowerCase().includes('rate limit');
          
          if (isRateLimit && retryCount < 3) {
            // Much longer exponential backoff
            const waitTime = Math.min(5000 * Math.pow(2, retryCount), 30000);
            console.log(`⏳ Rate limit hit, retrying in ${waitTime/1000}s (attempt ${retryCount + 1}/3)`);
            
            setTimeout(() => {
              if (mounted) {
                setRetryCount(prev => prev + 1);
              }
            }, waitTime);
          } else {
            setError(err.message || "Failed to load organization data");
          }
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
  }, [retryCount]);

  const value = {
    user,
    organization,
    subscription,
    isLoading,
    error,
    refreshOrganization: async () => {
      if (organization?.id) {
        await delay(3000);
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