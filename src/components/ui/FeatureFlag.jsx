import React from "react";
import { isFeatureEnabled } from "@/components/utils/featureFlags";

/**
 * FeatureFlag Component
 * Conditionally renders children based on feature flag status
 * 
 * Usage:
 * <FeatureFlag feature="GAMIFICATION">
 *   <GamificationDashboard />
 * </FeatureFlag>
 */
export default function FeatureFlag({ feature, children, fallback = null }) {
  if (!feature) {
    console.warn('[FeatureFlag] No feature name provided');
    return children;
  }

  if (isFeatureEnabled(feature)) {
    return <>{children}</>;
  }

  return fallback;
}

/**
 * Hook to check feature status
 */
export function useFeatureFlag(feature) {
  return isFeatureEnabled(feature);
}

/**
 * Higher-order component to wrap entire pages with feature flags
 */
export function withFeatureFlag(feature, fallbackMessage = 'This feature is currently unavailable.') {
  return (Component) => {
    return function FeatureFlaggedComponent(props) {
      if (isFeatureEnabled(feature)) {
        return <Component {...props} />;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🚧</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Feature Unavailable
            </h2>
            <p className="text-slate-600 mb-6">
              {fallbackMessage}
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      );
    };
  };
}