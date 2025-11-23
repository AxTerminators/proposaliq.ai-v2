import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const user = await base44.auth.me();
        
        console.log('[Home] User data:', {
          onboarding_guide_completed: user.onboarding_guide_completed,
          using_sample_data: user.using_sample_data,
          skipped_sample_data: user.skipped_sample_data,
          has_created_real_organization: user.has_created_real_organization,
          sample_data_cleared: user.sample_data_cleared
        });

        // CRITICAL: If onboarding guide is NOT completed, always go there first
        if (user.onboarding_guide_completed !== true) {
          console.log('[Home] Redirecting to OnboardingGuide - guide not completed');
          navigate(createPageUrl("OnboardingGuide"));
          return;
        }

        // If they completed the guide and chose sample data
        if (user.using_sample_data === true) {
          console.log('[Home] Redirecting to Dashboard - using sample data');
          navigate(createPageUrl("Dashboard"));
          return;
        }

        // If they skipped sample data or cleared it, need real organization
        if ((user.skipped_sample_data === true || user.sample_data_cleared === true) && 
            user.has_created_real_organization !== true) {
          console.log('[Home] Redirecting to Onboarding - needs real organization');
          navigate(createPageUrl("Onboarding"));
          return;
        }

        // Check if they have an organization
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );

        if (orgs.length === 0 || !orgs[0].onboarding_completed) {
          console.log('[Home] Redirecting to Onboarding - no complete org');
          navigate(createPageUrl("Onboarding"));
        } else {
          console.log('[Home] Redirecting to Dashboard - all setup complete');
          navigate(createPageUrl("Dashboard"));
        }
      } catch (error) {
        console.error("[Home] Error checking user status:", error);
        navigate(createPageUrl("OnboardingGuide"));
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAndRedirect();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  return null;
}