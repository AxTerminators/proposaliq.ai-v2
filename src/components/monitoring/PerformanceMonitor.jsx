import { useEffect, useRef } from 'react';
import { trackEvent, AnalyticsEvents } from '../analytics/AnalyticsTracker';

/**
 * SPRINT 5: Performance Monitoring
 * Tracks page load times, component render times, and API performance
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.apiCalls = [];
  }

  // Track component render time
  startComponentRender(componentName) {
    if (!this.metrics[componentName]) {
      this.metrics[componentName] = { renders: 0, totalTime: 0 };
    }
    return performance.now();
  }

  endComponentRender(componentName, startTime) {
    const duration = performance.now() - startTime;
    if (this.metrics[componentName]) {
      this.metrics[componentName].renders++;
      this.metrics[componentName].totalTime += duration;
    }

    // Track slow renders (>100ms)
    if (duration > 100) {
      trackEvent(AnalyticsEvents.FEATURE_USED, {
        feature_name: 'slow_render_detected',
        component: componentName,
        duration_ms: Math.round(duration)
      });
    }
  }

  // Track API call performance
  trackAPICall(endpoint, duration, success, statusCode) {
    const callData = {
      endpoint,
      duration,
      success,
      statusCode,
      timestamp: new Date().toISOString()
    };

    this.apiCalls.push(callData);

    // Keep only last 100 calls
    if (this.apiCalls.length > 100) {
      this.apiCalls.shift();
    }

    // Track slow API calls (>2000ms)
    if (duration > 2000) {
      trackEvent(AnalyticsEvents.API_CALL_COMPLETED, {
        endpoint,
        duration_ms: Math.round(duration),
        success,
        status: 'slow',
        statusCode
      });
    }
  }

  // Get performance summary
  getSummary() {
    const avgAPITime = this.apiCalls.length > 0
      ? this.apiCalls.reduce((sum, call) => sum + call.duration, 0) / this.apiCalls.length
      : 0;

    const slowAPICalls = this.apiCalls.filter(call => call.duration > 2000).length;
    const failedAPICalls = this.apiCalls.filter(call => !call.success).length;

    return {
      components: this.metrics,
      api: {
        totalCalls: this.apiCalls.length,
        avgDuration: Math.round(avgAPITime),
        slowCalls: slowAPICalls,
        failedCalls: failedAPICalls
      }
    };
  }

  // Clear metrics
  clear() {
    this.metrics = {};
    this.apiCalls = [];
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React Hook for component performance tracking
export function usePerformanceTracking(componentName) {
  const renderStartTime = useRef(null);

  useEffect(() => {
    renderStartTime.current = performanceMonitor.startComponentRender(componentName);

    return () => {
      if (renderStartTime.current) {
        performanceMonitor.endComponentRender(componentName, renderStartTime.current);
      }
    };
  });
}

// Hook for tracking API calls in components
export function useAPIPerformanceTracking() {
  return (endpoint, startTime, success, statusCode = 200) => {
    const duration = performance.now() - startTime;
    performanceMonitor.trackAPICall(endpoint, duration, success, statusCode);
  };
}

export default performanceMonitor;