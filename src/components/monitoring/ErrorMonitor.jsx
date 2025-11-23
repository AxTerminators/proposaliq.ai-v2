import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Error Monitoring & Logging System
 * Captures errors, logs them, and provides insights
 */

class ErrorMonitor {
  constructor() {
    this.errorQueue = [];
    this.user = null;
    this.organization = null;
    this.isInitialized = false;
  }

  initialize(user, organization) {
    this.user = user;
    this.organization = organization;
    this.isInitialized = true;
    this.setupGlobalErrorHandlers();
    this.flushErrorQueue();
  }

  setupGlobalErrorHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        type: 'unhandled_promise_rejection',
        promise: event.promise
      });
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        type: 'global_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Network errors
    window.addEventListener('offline', () => {
      this.captureError(new Error('Network connection lost'), {
        type: 'network_offline'
      });
    });
  }

  async captureError(error, context = {}) {
    const errorData = {
      error_message: error?.message || String(error),
      error_stack: error?.stack,
      error_type: error?.name || 'Error',
      context: JSON.stringify(context),
      user_email: this.user?.email,
      organization_id: this.organization?.id,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent,
      severity: this.calculateSeverity(error, context)
    };

    if (!this.isInitialized) {
      this.errorQueue.push(errorData);
      return;
    }

    try {
      // Log to AuditLog for admin visibility
      await base44.entities.AuditLog.create({
        admin_email: 'system@proposaliq.ai',
        action_type: 'error_occurred',
        target_entity: this.user?.email,
        details: JSON.stringify(errorData),
        success: false
      });

      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('[Error Monitor]', error, context);
      }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
      // Store in localStorage as fallback
      this.storeErrorLocally(errorData);
    }
  }

  calculateSeverity(error, context) {
    const message = error?.message?.toLowerCase() || '';
    const type = context.type || '';

    // Critical - breaks core functionality
    if (message.includes('failed to fetch') || 
        message.includes('network error') ||
        type === 'unhandled_promise_rejection') {
      return 'critical';
    }

    // High - AI errors, data loss potential
    if (message.includes('ai') || 
        message.includes('llm') ||
        message.includes('failed to save') ||
        message.includes('unauthorized')) {
      return 'high';
    }

    // Medium - feature errors, recoverable
    if (message.includes('not found') || 
        message.includes('invalid') ||
        type === 'api_error') {
      return 'medium';
    }

    // Low - UI glitches, non-critical
    return 'low';
  }

  storeErrorLocally(errorData) {
    try {
      const stored = localStorage.getItem('error_logs') || '[]';
      const errors = JSON.parse(stored);
      errors.push(errorData);
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.shift();
      }
      
      localStorage.setItem('error_logs', JSON.stringify(errors));
    } catch (e) {
      console.error('Failed to store error locally:', e);
    }
  }

  async flushErrorQueue() {
    if (this.errorQueue.length === 0) return;

    for (const errorData of this.errorQueue) {
      try {
        await base44.entities.AuditLog.create({
          admin_email: 'system@proposaliq.ai',
          action_type: 'error_occurred',
          target_entity: errorData.user_email,
          details: JSON.stringify(errorData),
          success: false
        });
      } catch (e) {
        console.error('Failed to flush error:', e);
      }
    }

    this.errorQueue = [];
  }

  // Get error statistics
  async getErrorStats(startDate, endDate) {
    try {
      const logs = await base44.entities.AuditLog.filter({
        action_type: 'error_occurred',
        created_date: {
          $gte: startDate,
          $lte: endDate
        }
      });

      const stats = {
        total: logs.length,
        by_severity: {},
        by_type: {},
        by_user: {},
        recent_errors: logs.slice(0, 10)
      };

      logs.forEach(log => {
        try {
          const details = JSON.parse(log.details);
          
          // Count by severity
          const severity = details.severity || 'unknown';
          stats.by_severity[severity] = (stats.by_severity[severity] || 0) + 1;
          
          // Count by type
          const type = details.error_type || 'unknown';
          stats.by_type[type] = (stats.by_type[type] || 0) + 1;
          
          // Count by user
          const user = details.user_email || 'anonymous';
          stats.by_user[user] = (stats.by_user[user] || 0) + 1;
        } catch (e) {
          // Ignore parsing errors
        }
      });

      return stats;
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return null;
    }
  }
}

// Singleton instance
export const errorMonitor = new ErrorMonitor();

// React Hook for easy integration
export function useErrorMonitoring(user, organization) {
  useEffect(() => {
    if (user && organization) {
      errorMonitor.initialize(user, organization);
    }
  }, [user, organization]);

  return errorMonitor;
}

// Helper to wrap async functions with error monitoring
export function withErrorMonitoring(fn, context = {}) {
  return async function (...args) {
    try {
      return await fn(...args);
    } catch (error) {
      errorMonitor.captureError(error, {
        function_name: fn.name,
        ...context
      });
      throw error;
    }
  };
}

export default errorMonitor;