import React from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Analytics Tracker
 * 
 * Provides hooks and utilities for tracking user interactions,
 * feature usage, and performance metrics within the application.
 */

// Event types for analytics
export const AnalyticsEvents = {
  // AI Workflow Events
  AI_STRATEGY_CONFIGURED: 'ai_strategy_configured',
  AI_CONTENT_GENERATED: 'ai_content_generated',
  AI_CONTENT_REGENERATED: 'ai_content_regenerated',
  AI_CONTENT_EDITED: 'ai_content_edited',
  AI_REFERENCE_ADDED: 'ai_reference_added',
  AI_VALIDATION_PASSED: 'ai_validation_passed',
  AI_VALIDATION_FAILED: 'ai_validation_failed',
  
  // Proposal Events
  PROPOSAL_CREATED: 'proposal_created',
  PROPOSAL_UPDATED: 'proposal_updated',
  PROPOSAL_STATUS_CHANGED: 'proposal_status_changed',
  PROPOSAL_EXPORTED: 'proposal_exported',
  PROPOSAL_SHARED: 'proposal_shared',
  
  // User Interaction Events
  PAGE_VIEWED: 'page_viewed',
  FEATURE_USED: 'feature_used',
  MODAL_OPENED: 'modal_opened',
  BUTTON_CLICKED: 'button_clicked',
  ERROR_OCCURRED: 'error_occurred',
  
  // Performance Events
  API_CALL_COMPLETED: 'api_call_completed',
  LOAD_TIME: 'load_time',
};

// Track analytics event
export async function trackEvent(eventName, properties = {}) {
  try {
    const user = await base44.auth.me().catch(() => null);
    
    const eventData = {
      event_name: eventName,
      timestamp: new Date().toISOString(),
      user_email: user?.email || 'anonymous',
      properties: {
        ...properties,
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        page_title: document.title,
      }
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventName, eventData);
    }

    // Store in localStorage for now (in production, send to analytics service)
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push(eventData);
    
    // Keep only last 100 events
    if (events.length > 100) events.shift();
    localStorage.setItem('analytics_events', JSON.stringify(events));

    // TODO: Send to analytics service (e.g., Google Analytics, Mixpanel)
    // await fetch('/api/analytics', { method: 'POST', body: JSON.stringify(eventData) });

  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

// Hook for tracking page views
export function usePageTracking(pageName) {
  React.useEffect(() => {
    const startTime = Date.now();
    
    trackEvent(AnalyticsEvents.PAGE_VIEWED, {
      page_name: pageName
    });

    return () => {
      const duration = Date.now() - startTime;
      trackEvent(AnalyticsEvents.LOAD_TIME, {
        page_name: pageName,
        duration_ms: duration
      });
    };
  }, [pageName]);
}

// Hook for tracking feature usage
export function useFeatureTracking(featureName) {
  const trackFeature = React.useCallback((action, metadata = {}) => {
    trackEvent(AnalyticsEvents.FEATURE_USED, {
      feature_name: featureName,
      action,
      ...metadata
    });
  }, [featureName]);

  return trackFeature;
}

// Hook for tracking API performance
export function useAPITracking() {
  const trackAPI = React.useCallback((endpoint, duration, success, error = null) => {
    trackEvent(AnalyticsEvents.API_CALL_COMPLETED, {
      endpoint,
      duration_ms: duration,
      success,
      error: error?.message || null
    });
  }, []);

  return trackAPI;
}

// Hook for tracking errors
export function useErrorTracking() {
  const trackError = React.useCallback((error, context = {}) => {
    trackEvent(AnalyticsEvents.ERROR_OCCURRED, {
      error_message: error.message,
      error_stack: error.stack,
      ...context
    });
  }, []);

  return trackError;
}

// Component for tracking clicks
export function ClickTracker({ 
  eventName = AnalyticsEvents.BUTTON_CLICKED,
  properties = {},
  children 
}) {
  const handleClick = (e) => {
    trackEvent(eventName, {
      target_element: e.target.tagName,
      target_text: e.target.textContent?.substring(0, 50),
      ...properties
    });
  };

  return (
    <div onClick={handleClick}>
      {children}
    </div>
  );
}

// Get analytics summary
export function getAnalyticsSummary() {
  try {
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    
    // Group by event type
    const eventCounts = events.reduce((acc, event) => {
      acc[event.event_name] = (acc[event.event_name] || 0) + 1;
      return acc;
    }, {});

    // Calculate average API duration
    const apiEvents = events.filter(e => e.event_name === AnalyticsEvents.API_CALL_COMPLETED);
    const avgAPIDuration = apiEvents.length > 0
      ? apiEvents.reduce((sum, e) => sum + e.properties.duration_ms, 0) / apiEvents.length
      : 0;

    // Calculate average page load time
    const loadEvents = events.filter(e => e.event_name === AnalyticsEvents.LOAD_TIME);
    const avgLoadTime = loadEvents.length > 0
      ? loadEvents.reduce((sum, e) => sum + e.properties.duration_ms, 0) / loadEvents.length
      : 0;

    // Count errors
    const errorCount = events.filter(e => e.event_name === AnalyticsEvents.ERROR_OCCURRED).length;

    return {
      totalEvents: events.length,
      eventCounts,
      avgAPIDuration: Math.round(avgAPIDuration),
      avgLoadTime: Math.round(avgLoadTime),
      errorCount,
      events: events.slice(-20) // Last 20 events
    };
  } catch (error) {
    console.error('[Analytics] Failed to get summary:', error);
    return null;
  }
}

// Clear analytics data
export function clearAnalytics() {
  localStorage.removeItem('analytics_events');
  console.log('[Analytics] Analytics data cleared');
}