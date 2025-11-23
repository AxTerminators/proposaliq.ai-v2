import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Database, 
  Zap, 
  TrendingUp, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { performanceMonitor } from './PerformanceMonitor';
import { errorMonitor } from './ErrorMonitor';
import { getAnalyticsSummary } from '../analytics/AnalyticsTracker';
import { cn } from '@/lib/utils';

/**
 * SPRINT 5: Real-time Health Check Panel
 * Shows system health, performance metrics, and error rates
 */
export default function HealthCheckPanel() {
  const [health, setHealth] = useState({
    status: 'healthy',
    lastCheck: new Date(),
    metrics: {}
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    
    try {
      // Get performance metrics
      const perfSummary = performanceMonitor.getSummary();
      
      // Get analytics summary
      const analyticsSummary = getAnalyticsSummary();
      
      // Get error logs from localStorage
      const errorLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      const recentErrors = errorLogs.filter(e => {
        const errorDate = new Date(e.timestamp);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return errorDate > hourAgo;
      });

      // Determine overall health
      let status = 'healthy';
      if (recentErrors.filter(e => e.severity === 'critical').length > 0) {
        status = 'critical';
      } else if (recentErrors.length > 5) {
        status = 'warning';
      }

      setHealth({
        status,
        lastCheck: new Date(),
        metrics: {
          performance: perfSummary,
          analytics: analyticsSummary,
          errors: {
            total: recentErrors.length,
            critical: recentErrors.filter(e => e.severity === 'critical').length,
            high: recentErrors.filter(e => e.severity === 'high').length
          }
        }
      });
    } catch (error) {
      console.error('Health check failed:', error);
      setHealth(prev => ({ ...prev, status: 'unknown' }));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = () => {
    switch (health.status) {
      case 'healthy':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bg: 'bg-green-50',
          badge: 'bg-green-100 text-green-700'
        };
      case 'warning':
        return {
          icon: AlertCircle,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          badge: 'bg-amber-100 text-amber-700'
        };
      case 'critical':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          badge: 'bg-red-100 text-red-700'
        };
      default:
        return {
          icon: Activity,
          color: 'text-slate-600',
          bg: 'bg-slate-50',
          badge: 'bg-slate-100 text-slate-700'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", statusConfig.bg)}>
              <StatusIcon className={cn("w-5 h-5", statusConfig.color)} />
            </div>
            <div>
              <CardTitle className="text-lg">System Health</CardTitle>
              <Badge className={cn("text-xs mt-1", statusConfig.badge)}>
                {health.status.toUpperCase()}
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkHealth}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* API Performance */}
          {health.metrics.performance?.api && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">API Performance</p>
                  <p className="text-xs text-slate-600">
                    {health.metrics.performance.api.totalCalls} calls
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  {health.metrics.performance.api.avgDuration}ms
                </p>
                <p className="text-xs text-slate-600">avg response</p>
              </div>
            </div>
          )}

          {/* Error Rate */}
          {health.metrics.errors && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Error Rate</p>
                  <p className="text-xs text-slate-600">Last hour</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  {health.metrics.errors.total}
                </p>
                {health.metrics.errors.critical > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {health.metrics.errors.critical} critical
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Analytics */}
          {health.metrics.analytics && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Events Tracked</p>
                  <p className="text-xs text-slate-600">Session activity</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  {health.metrics.analytics.totalEvents}
                </p>
                <p className="text-xs text-slate-600">total events</p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <p className="text-xs text-slate-500 text-center">
              Last checked: {health.lastCheck.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}