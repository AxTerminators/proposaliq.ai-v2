import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PlayCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

const SMOKE_TESTS = [
  {
    id: 'auth',
    category: 'Authentication',
    tests: [
      { id: 'login', name: 'User Login', status: 'passed' },
      { id: 'logout', name: 'User Logout', status: 'passed' },
      { id: 'signup', name: 'User Registration', status: 'passed' },
      { id: 'password-reset', name: 'Password Reset Flow', status: 'passed' }
    ]
  },
  {
    id: 'proposals',
    category: 'Proposal Management',
    tests: [
      { id: 'create-proposal', name: 'Create Proposal', status: 'passed' },
      { id: 'edit-proposal', name: 'Edit Proposal Details', status: 'passed' },
      { id: 'delete-proposal', name: 'Delete Proposal', status: 'passed' },
      { id: 'kanban-drag', name: 'Kanban Drag & Drop', status: 'passed' },
      { id: 'proposal-export', name: 'Export Proposal', status: 'failed' }
    ]
  },
  {
    id: 'ai-features',
    category: 'AI Features',
    tests: [
      { id: 'ai-chat', name: 'AI Chat Assistant', status: 'passed' },
      { id: 'ai-content-gen', name: 'AI Content Generation', status: 'passed' },
      { id: 'ai-evaluation', name: 'AI Proposal Evaluation', status: 'passed' }
    ]
  },
  {
    id: 'collaboration',
    category: 'Collaboration',
    tests: [
      { id: 'comments', name: 'Add Comments', status: 'passed' },
      { id: 'mentions', name: 'User Mentions', status: 'passed' },
      { id: 'notifications', name: 'Notification System', status: 'passed' },
      { id: 'file-upload', name: 'File Upload', status: 'failed' }
    ]
  },
  {
    id: 'integrations',
    category: 'Integrations',
    tests: [
      { id: 'calendar-sync', name: 'Calendar Sync', status: 'passed' },
      { id: 'email-notifications', name: 'Email Notifications', status: 'passed' },
      { id: 'export-pdf', name: 'PDF Export', status: 'running' }
    ]
  },
  {
    id: 'performance',
    category: 'Performance',
    tests: [
      { id: 'page-load', name: 'Dashboard Load Time <1.5s', status: 'passed' },
      { id: 'api-response', name: 'API Response Time <200ms', status: 'passed' },
      { id: 'concurrent-users', name: '100+ Concurrent Users', status: 'passed' }
    ]
  }
];

export default function SmokeTestDashboard({ user }) {
  const [runningTests, setRunningTests] = useState(new Set());

  const stats = {
    total: SMOKE_TESTS.reduce((sum, cat) => sum + cat.tests.length, 0),
    passed: SMOKE_TESTS.reduce((sum, cat) => 
      sum + cat.tests.filter(t => t.status === 'passed').length, 0),
    failed: SMOKE_TESTS.reduce((sum, cat) => 
      sum + cat.tests.filter(t => t.status === 'failed').length, 0),
    running: SMOKE_TESTS.reduce((sum, cat) => 
      sum + cat.tests.filter(t => t.status === 'running').length, 0)
  };

  const passRate = Math.round((stats.passed / stats.total) * 100);

  const runAllTests = () => {
    alert('Running all smoke tests... (This would trigger actual test execution in production)');
  };

  const runCategoryTests = (categoryId) => {
    alert(`Running ${categoryId} tests... (This would trigger actual test execution in production)`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Smoke Test Dashboard</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Automated staging environment tests
              </p>
            </div>
            <Button onClick={runAllTests}>
              <PlayCircle className="w-4 h-4 mr-2" />
              Run All Tests
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
              <div className="text-sm text-slate-600 mt-1">Total Tests</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-900">{stats.passed}</div>
              <div className="text-sm text-green-700 mt-1">Passed</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-900">{stats.failed}</div>
              <div className="text-sm text-red-700 mt-1">Failed</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-900">{passRate}%</div>
              <div className="text-sm text-blue-700 mt-1">Pass Rate</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Overall Pass Rate</span>
              <span className="text-sm font-semibold text-slate-900">{passRate}%</span>
            </div>
            <Progress value={passRate} className="h-3" />
          </div>

          <div className="space-y-4">
            {SMOKE_TESTS.map((category) => {
              const categoryPassed = category.tests.filter(t => t.status === 'passed').length;
              const categoryFailed = category.tests.filter(t => t.status === 'failed').length;
              const categoryRunning = category.tests.filter(t => t.status === 'running').length;

              return (
                <Card key={category.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{category.category}</CardTitle>
                        <Badge variant="outline">
                          {categoryPassed}/{category.tests.length}
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => runCategoryTests(category.id)}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Run Tests
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {category.tests.map((test) => (
                        <div
                          key={test.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {test.status === 'passed' && (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            )}
                            {test.status === 'failed' && (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            {test.status === 'running' && (
                              <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
                            )}
                            {test.status === 'pending' && (
                              <Clock className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="text-sm font-medium text-slate-900">
                              {test.name}
                            </span>
                          </div>
                          <Badge
                            className={cn(
                              test.status === 'passed' && 'bg-green-100 text-green-700',
                              test.status === 'failed' && 'bg-red-100 text-red-700',
                              test.status === 'running' && 'bg-blue-100 text-blue-700',
                              test.status === 'pending' && 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {test.status}
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

      {stats.failed > 0 && (
        <Card className="border-2 border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              Critical: {stats.failed} Test{stats.failed !== 1 ? 's' : ''} Failing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-800">
              The following tests must pass before production deployment:
            </p>
            <ul className="mt-3 space-y-1">
              {SMOKE_TESTS.flatMap(cat => 
                cat.tests.filter(t => t.status === 'failed')
                  .map(t => (
                    <li key={t.id} className="text-sm text-red-900 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      {cat.category}: {t.name}
                    </li>
                  ))
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}