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

        // Check if user has completed the onboarding guide
        if (!user.onboarding_guide_completed) {
          // Check if they already have an organization (sample or real)
          const orgs = await base44.entities.Organization.filter(
            { created_by: user.email },
            '-created_date',
            1
          );

          if (orgs.length === 0) {
            // No organization exists - generate sample data
            try {
              await base44.functions.invoke('generateSampleData', {});
            } catch (error) {
              console.error("Error generating sample data:", error);
            }
          }

          // Redirect to onboarding guide
          navigate(createPageUrl("OnboardingGuide"));
          return;
        }

        // Check if user has cleared sample data but hasn't created real organization
        if (user.sample_data_cleared && !user.has_created_real_organization) {
          navigate(createPageUrl("Onboarding"));
          return;
        }

        // User has completed onboarding - check if they have an organization
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );

        if (orgs.length === 0 || !orgs[0].onboarding_completed) {
          // No organization or incomplete onboarding
          navigate(createPageUrl("Onboarding"));
        } else {
          // All set - go to dashboard
          navigate(createPageUrl("Dashboard"));
        }
      } catch (error) {
        console.error("Error checking user status:", error);
        // If there's an error, redirect to onboarding to be safe
        navigate(createPageUrl("Onboarding"));
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