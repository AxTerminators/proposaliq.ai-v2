import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Zap,
  MessageSquare,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function First24HoursMonitor({ user, launchStatus }) {
  // Simulated real-time metrics
  const metrics = {
    errorRate: 0.05, // 0.05%
    avgResponseTime: 165, // ms
    p95ResponseTime: 198, // ms
    totalSignups: 47,
    activeUsers: 234,
    criticalBugs: 0,
    highPriorityBugs: 2,
    feedbackCount: 18,
    proposalsCreated: 89
  };

  const thresholds = {
    errorRate: { target: 0.1, warning: 0.5, critical: 1.0 },
    responseTime: { target: 200, warning: 300, critical: 500 }
  };

  const getStatusColor = (value, thresholds) => {
    if (value <= thresholds.target) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-amber-600';
    return 'text-red-600';
  };

  const getStatusBadge = (value, thresholds) => {
    if (value <= thresholds.target) return { label: 'Excellent', color: 'bg-green-100 text-green-700' };
    if (value <= thresholds.warning) return { label: 'Good', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Critical', color: 'bg-red-100 text-red-700' };
  };

  return (
    <div className="space-y-4">
      {/* Critical Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Critical Metrics - First 24 Hours
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Real-time system health monitoring
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Error Rate */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Error Rate</p>
                    <p className={cn("text-3xl font-bold", getStatusColor(metrics.errorRate, thresholds.errorRate))}>
                      {metrics.errorRate}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Target: &lt;{thresholds.errorRate.target}%</span>
                    <Badge className={getStatusBadge(metrics.errorRate, thresholds.errorRate).color}>
                      {getStatusBadge(metrics.errorRate, thresholds.errorRate).label}
                    </Badge>
                  </div>
                  <Progress 
                    value={(metrics.errorRate / thresholds.errorRate.critical) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">API Response Time (p95)</p>
                    <p className={cn("text-3xl font-bold", getStatusColor(metrics.p95ResponseTime, thresholds.responseTime))}>
                      {metrics.p95ResponseTime}ms
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Target: &lt;{thresholds.responseTime.target}ms</span>
                    <Badge className={getStatusBadge(metrics.p95ResponseTime, thresholds.responseTime).color}>
                      {getStatusBadge(metrics.p95ResponseTime, thresholds.responseTime).label}
                    </Badge>
                  </div>
                  <Progress 
                    value={(metrics.p95ResponseTime / thresholds.responseTime.critical) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Activity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">New Signups</p>
                    <p className="text-3xl font-bold text-slate-900">{metrics.totalSignups}</p>
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +12% from expected
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Active Users</p>
                    <p className="text-3xl font-bold text-slate-900">{metrics.activeUsers}</p>
                    <p className="text-xs text-slate-600 mt-1">Currently online</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Proposals Created</p>
                    <p className="text-3xl font-bold text-slate-900">{metrics.proposalsCreated}</p>
                    <p className="text-xs text-slate-600 mt-1">Core feature usage</p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Bugs & Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Bugs & Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className={metrics.criticalBugs > 0 ? 'border-2 border-red-500 bg-red-50' : 'bg-green-50'}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Critical Bugs</p>
                    <p className={cn("text-4xl font-bold", metrics.criticalBugs > 0 ? 'text-red-900' : 'text-green-900')}>
                      {metrics.criticalBugs}
                    </p>
                  </div>
                  {metrics.criticalBugs === 0 ? (
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">High Priority Bugs</p>
                    <p className="text-4xl font-bold text-slate-900">{metrics.highPriorityBugs}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* User Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            User Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900">Total Feedback Items</p>
                <p className="text-sm text-slate-600">First 24 hours</p>
              </div>
              <div className="text-3xl font-bold text-slate-900">{metrics.feedbackCount}</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">12</div>
                <div className="text-xs text-green-700 mt-1">Positive</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-900">4</div>
                <div className="text-xs text-amber-700 mt-1">Neutral</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-900">2</div>
                <div className="text-xs text-red-700 mt-1">Issues</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      {(metrics.criticalBugs > 0 || metrics.errorRate > thresholds.errorRate.warning) && (
        <Card className="border-2 border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-5 h-5" />
              Immediate Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {metrics.criticalBugs > 0 && (
                <li className="flex items-start gap-2 text-sm text-red-900">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {metrics.criticalBugs} critical bug(s) must be addressed immediately
                </li>
              )}
              {metrics.errorRate > thresholds.errorRate.warning && (
                <li className="flex items-start gap-2 text-sm text-red-900">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Error rate exceeds warning threshold - investigate root cause
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}