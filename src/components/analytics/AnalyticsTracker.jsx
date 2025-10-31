import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Analytics Event Tracker
 * Tracks user behavior and feature usage for product improvement
 */

const ANALYTICS_EVENTS = {
  // Page Views
  PAGE_VIEW: 'page_view',
  
  // Proposal Actions
  PROPOSAL_CREATED: 'proposal_created',
  PROPOSAL_UPDATED: 'proposal_updated',
  PROPOSAL_DELETED: 'proposal_deleted',
  PROPOSAL_EXPORTED: 'proposal_exported',
  
  // AI Features
  AI_SECTION_GENERATED: 'ai_section_generated',
  AI_SECTION_REGENERATED: 'ai_section_regenerated',
  AI_EVALUATION_RUN: 'ai_evaluation_run',
  AI_COLLABORATION_ANALYZED: 'ai_collaboration_analyzed',
  
  // Collaboration
  COMMENT_ADDED: 'comment_added',
  TASK_CREATED: 'task_created',
  FILE_UPLOADED: 'file_uploaded',
  
  // User Actions
  USER_LOGGED_IN: 'user_logged_in',
  FEATURE_CLICKED: 'feature_clicked',
  SEARCH_PERFORMED: 'search_performed',
  
  // Errors
  ERROR_OCCURRED: 'error_occurred',
  AI_ERROR: 'ai_error',
  
  // Performance
  SLOW_OPERATION: 'slow_operation',
  
  // Subscription
  PLAN_UPGRADED: 'plan_upgraded',
  TOKEN_CREDITS_LOW: 'token_credits_low'
};

class AnalyticsService {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.user = null;
    this.organization = null;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  async initialize(user, organization) {
    this.user = user;
    this.organization = organization;
  }

  async trackEvent(eventName, properties = {}) {
    try {
      const eventData = {
        event_name: eventName,
        user_email: this.user?.email,
        organization_id: this.organization?.id,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        properties: JSON.stringify(properties),
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        page_path: window.location.pathname,
        referrer: document.referrer
      };

      // Store analytics event in database
      await base44.entities.ActivityLog.create({
        proposal_id: properties.proposalId || null,
        user_email: this.user?.email,
        user_name: this.user?.full_name,
        action_type: eventName,
        action_description: properties.description || eventName,
        metadata: eventData
      });

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics]', eventName, properties);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  // Specific tracking methods
  trackPageView(pageName, properties = {}) {
    this.trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
      page_name: pageName,
      ...properties
    });
  }

  trackProposalAction(action, proposalId, properties = {}) {
    this.trackEvent(action, {
      proposalId,
      ...properties
    });
  }

  trackAIUsage(feature, proposalId, properties = {}) {
    this.trackEvent(feature, {
      proposalId,
      ai_feature: feature,
      ...properties
    });
  }

  trackError(error, context = {}) {
    this.trackEvent(ANALYTICS_EVENTS.ERROR_OCCURRED, {
      error_message: error.message || String(error),
      error_stack: error.stack,
      error_type: error.name,
      ...context
    });
  }

  trackPerformance(operationName, duration, metadata = {}) {
    const isSlow = duration > 3000; // 3 seconds threshold

    if (isSlow) {
      this.trackEvent(ANALYTICS_EVENTS.SLOW_OPERATION, {
        operation: operationName,
        duration_ms: duration,
        is_slow: true,
        ...metadata
      });
    }
  }

  trackFeatureUsage(featureName, properties = {}) {
    this.trackEvent(ANALYTICS_EVENTS.FEATURE_CLICKED, {
      feature_name: featureName,
      ...properties
    });
  }
}

// Singleton instance
export const analytics = new AnalyticsService();

// React Hook for easy analytics integration
export function useAnalytics(user, organization) {
  useEffect(() => {
    if (user && organization) {
      analytics.initialize(user, organization);
    }
  }, [user, organization]);

  return analytics;
}

// Higher-order component to track page views
export function withPageTracking(Component, pageName) {
  return function TrackedComponent(props) {
    useEffect(() => {
      analytics.trackPageView(pageName);
    }, []);

    return <Component {...props} />;
  };
}

// Performance tracking wrapper
export function withPerformanceTracking(fn, operationName) {
  return async function (...args) {
    const startTime = performance.now();
    
    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      
      analytics.trackPerformance(operationName, duration, {
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      analytics.trackPerformance(operationName, duration, {
        success: false,
        error: error.message
      });
      
      throw error;
    }
  };
}

export { ANALYTICS_EVENTS };
export default analytics;