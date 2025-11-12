import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ImprovedOnboardingFlow from "../components/onboarding/ImprovedOnboardingFlow";
import { Skeleton } from "@/components/ui/skeleton";

export default function Onboarding() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadData();
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <ImprovedOnboardingFlow
      user={user}
      onComplete={(org) => {
        // Reload page to apply new organization context
        window.location.href = '/app/Dashboard';
      }}
    />
  );
}