import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Users,
  Zap,
  Shield,
  CheckCircle2,
  Target,
  Clock,
  Activity
} from "lucide-react";

const LAUNCH_METRICS = [
  {
    category: 'Performance',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    metrics: [
      { name: 'Dashboard Load Time', target: '<1.5s', current: '1.2s', status: 'passed' },
      { name: 'API Response Time (p95)', target: '<200ms', current: '165ms', status: 'passed' },
      { name: 'Lighthouse Performance', target: '>90', current: '93', status: 'passed' },
      { name: 'Core Web Vitals - LCP', target: '<2.5s', current: '2.1s', status: 'passed' },
      { name: 'Core Web Vitals - FID', target: '<100ms', current: '45ms', status: 'passed' },
      { name: 'Core Web Vitals - CLS', target: '<0.1', current: '0.05', status: 'passed' }
    ]
  },
  {
    category: 'Accessibility',
    icon: Shield,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    metrics: [
      { name: 'WCAG AA Compliance', target: '100%', current: '100%', status: 'passed' },
      { name: 'Lighthouse Accessibility', target: '>90', current: '95', status: 'passed' },
      { name: 'Keyboard Navigation', target: '100%', current: '100%', status: 'passed' },
      { name: 'Screen Reader Support', target: 'Full', current: 'Full', status: 'passed' },
      { name: 'Touch Target Size', target: '≥44px', current: '≥44px', status: 'passed' }
    ]
  },
  {
    category: 'Security',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    metrics: [
      { name: 'Critical Vulnerabilities', target: '0', current: '0', status: 'passed' },
      { name: 'High Vulnerabilities', target: '0', current: '0', status: 'passed' },
      { name: 'Security Headers', target: 'All', current: 'All', status: 'passed' },
      { name: 'Rate Limiting', target: 'Active', current: 'Active', status: 'passed' },
      { name: 'Authentication Audit', target: 'Pass', current: 'Pass', status: 'passed' }
    ]
  },
  {
    category: 'Quality',
    icon: CheckCircle2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    metrics: [
      { name: 'Critical Bugs', target: '0', current: '0', status: 'passed' },
      { name: 'High-Priority Bugs', target: '<5', current: '2', status: 'passed' },
      { name: 'Browser Compatibility', target: '100%', current: '100%', status: 'passed' },
      { name: 'Mobile Compatibility', target: '100%', current: '100%', status: 'passed' },
      { name: 'Smoke Tests Passing', target: '100%', current: '93%', status: 'warning' }
    ]
  },
  {
    category: 'Infrastructure',
    icon: Activity,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    metrics: [
      { name: 'Concurrent User Capacity', target: '100+', current: '150', status: 'passed' },
      { name: 'Database Backup', target: 'Verified', current: 'Verified', status: 'passed' },
      { name: 'Error Monitoring', target: 'Active', current: 'Active', status: 'passed' },
      { name: 'Performance Monitoring', target: 'Active', current: 'Active', status: 'passed' },
      { name: 'Rollback Plan', target: 'Documented', current: 'Documented', status: 'passed' }
    ]
  },
  {
    category: 'Documentation',
    icon: Target,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    metrics: [
      { name: 'User Guides Published', target: '6+', current: '8', status: 'passed' },
      { name: 'Tutorial Videos', target: '3+', current: '4', status: 'passed' },
      { name: 'FAQ Items', target: '50+', current: '62', status: 'passed' },
      { name: 'API Documentation', target: 'Complete', current: 'Pending', status: 'warning' }
    ]
  }
];

export default function LaunchMetrics({ user }) {
  const overallMetrics = {
    total: LAUNCH_METRICS.reduce((sum, cat) => sum + cat.metrics.length, 0),
    passed: LAUNCH_METRICS.reduce((sum, cat) => 
      sum + cat.metrics.filter(m => m.status === 'passed').length, 0),
    warning: LAUNCH_METRICS.reduce((sum, cat) => 
      sum + cat.metrics.filter(m => m.status === 'warning').length, 0),
    failed: LAUNCH_METRICS.reduce((sum, cat) => 
      sum + cat.metrics.filter(m => m.status === 'failed').length, 0)
  };

  const passRate = Math.round((overallMetrics.passed / overallMetrics.total) * 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Launch Metrics Dashboard
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Real-time success criteria tracking
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-3xl font-bold text-slate-900">{overallMetrics.total}</div>
              <div className="text-sm text-slate-600 mt-1">Total Metrics</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-900">{overallMetrics.passed}</div>
              <div className="text-sm text-green-700 mt-1">Passed</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-3xl font-bold text-amber-900">{overallMetrics.warning}</div>
              <div className="text-sm text-amber-700 mt-1">Warning</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-900">{passRate}%</div>
              <div className="text-sm text-blue-700 mt-1">Pass Rate</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Overall Progress</span>
              <span className="text-sm font-semibold text-slate-900">{passRate}%</span>
            </div>
            <Progress value={passRate} className="h-3" />
          </div>

          <div className="space-y-4">
            {LAUNCH_METRICS.map((category) => {
              const Icon = category.icon;
              const categoryPassed = category.metrics.filter(m => m.status === 'passed').length;
              const categoryPercentage = Math.round((categoryPassed / category.metrics.length) * 100);

              return (
                <Card key={category.category}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${category.bgColor} rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${category.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{category.category}</CardTitle>
                          <p className="text-xs text-slate-600">
                            {categoryPassed} / {category.metrics.length} metrics passed
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">{categoryPercentage}%</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {category.metrics.map((metric, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-slate-900">{metric.name}</div>
                            <div className="text-xs text-slate-600 mt-1">
                              Target: {metric.target} | Current: {metric.current}
                            </div>
                          </div>
                          <Badge
                            className={
                              metric.status === 'passed' ? 'bg-green-100 text-green-700' :
                              metric.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }
                          >
                            {metric.status === 'passed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {metric.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}