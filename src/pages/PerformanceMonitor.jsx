import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Users,
  Timer,
  BarChart3
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import LoadingState from "@/components/ui/LoadingState";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/components/layout/OrganizationContext";

export default function PerformanceMonitor() {
  const { user } = useOrganization();
  const [selectedPage, setSelectedPage] = useState('Dashboard');
  const [auditResults, setAuditResults] = useState(null);
  const [loadTestResults, setLoadTestResults] = useState(null);

  const pages = ['Dashboard', 'Pipeline', 'ProposalBuilder', 'Resources', 'Calendar'];

  const runAuditMutation = useMutation({
    mutationFn: async (page) => {
      const response = await base44.functions.invoke('performanceAudit', { page });
      return response.data;
    },
    onSuccess: (data) => {
      setAuditResults(data);
    },
  });

  const runLoadTestMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('loadTest', {
        concurrentUsers: 100,
        testDuration: 60
      });
      return response.data;
    },
    onSuccess: (data) => {
      setLoadTestResults(data.report);
    },
  });

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const getCWVBadge = (rating) => {
    if (rating === 'good') return 'bg-green-100 text-green-800';
    if (rating === 'needs-improvement') return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const exportReport = (report, filename) => {
    const reportText = JSON.stringify(report, null, 2);
    const blob = new Blob([reportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8" role="main" aria-labelledby="monitor-title">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 id="monitor-title" className="text-3xl font-bold text-slate-900">Performance Monitor</h1>
                <p className="text-slate-600 mt-1">Lighthouse Audits, Load Testing & Core Web Vitals</p>
              </div>
            </div>
          </div>
        </header>

        {/* Lighthouse Audit Section */}
        <section className="mb-6" aria-labelledby="lighthouse-title">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle id="lighthouse-title" className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Lighthouse Performance Audit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {pages.map(page => (
                    <Button
                      key={page}
                      variant={selectedPage === page ? 'default' : 'outline'}
                      onClick={() => setSelectedPage(page)}
                      className={selectedPage === page ? 'bg-purple-600 hover:bg-purple-700' : ''}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  onClick={() => runAuditMutation.mutate(selectedPage)}
                  disabled={runAuditMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {runAuditMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Running Audit...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 mr-2" />
                      Run Audit for {selectedPage}
                    </>
                  )}
                </Button>

                {auditResults && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{auditResults.page}</h3>
                        <Badge className={cn(
                          'text-lg px-4 py-1',
                          auditResults.grade === 'A' ? 'bg-green-100 text-green-800' :
                          auditResults.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          auditResults.grade === 'C' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        )}>
                          Grade: {auditResults.grade}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => exportReport(auditResults, `lighthouse-${auditResults.page}`)}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>

                    {/* Lighthouse Scores */}
                    <div className="grid md:grid-cols-5 gap-4">
                      {[
                        { label: 'Performance', score: auditResults.metrics.performance, icon: Zap },
                        { label: 'Accessibility', score: auditResults.metrics.accessibility, icon: Users },
                        { label: 'Best Practices', score: auditResults.metrics.bestPractices, icon: CheckCircle2 },
                        { label: 'SEO', score: auditResults.metrics.seo, icon: TrendingUp },
                        { label: 'PWA', score: auditResults.metrics.pwa, icon: Activity }
                      ].map(({ label, score, icon: Icon }) => (
                        <div key={label} className="bg-white border rounded-lg p-4 text-center">
                          <Icon className={cn('w-8 h-8 mx-auto mb-2', getScoreColor(score))} />
                          <div className={cn('text-3xl font-bold mb-1', getScoreColor(score))}>
                            {score}
                          </div>
                          <div className="text-xs text-slate-600">{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Core Web Vitals */}
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Timer className="w-5 h-5 text-blue-600" />
                        Core Web Vitals
                      </h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {Object.entries(auditResults.coreWebVitals).map(([key, data]) => (
                          <div key={key} className="bg-white border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium text-slate-600">
                                {key.toUpperCase()}
                              </div>
                              <Badge className={getCWVBadge(data.rating)}>
                                {data.rating.replace('-', ' ')}
                              </Badge>
                            </div>
                            <div className="text-2xl font-bold text-slate-900 mb-1">
                              {typeof data.value === 'number' ? data.value.toFixed(2) : data.value}
                              {key === 'lcp' || key === 'fcp' ? 's' : key === 'fid' ? 'ms' : ''}
                            </div>
                            <div className="text-xs text-slate-500">
                              Target: {data.target}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Metrics */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 mb-3">Detailed Metrics</h4>
                      <div className="grid md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-slate-600">First Contentful Paint:</span>
                          <span className="font-semibold text-slate-900 ml-2">{auditResults.metrics.fcp}s</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Time to Interactive:</span>
                          <span className="font-semibold text-slate-900 ml-2">{auditResults.metrics.tti}s</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Speed Index:</span>
                          <span className="font-semibold text-slate-900 ml-2">{auditResults.metrics.speedIndex}s</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Total Blocking Time:</span>
                          <span className="font-semibold text-slate-900 ml-2">{auditResults.metrics.totalBlockingTime}ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {auditResults.metrics.notes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">{auditResults.metrics.notes}</p>
                      </div>
                    )}

                    {/* Recommendations */}
                    {auditResults.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          Recommendations
                        </h4>
                        <div className="space-y-2">
                          {auditResults.recommendations.map((rec, idx) => (
                            <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <Badge className="bg-amber-600 text-white mt-0.5">
                                  {rec.priority}
                                </Badge>
                                <div className="flex-1">
                                  <div className="font-medium text-slate-900 text-sm">{rec.issue}</div>
                                  <div className="text-xs text-slate-600 mt-1">{rec.suggestion}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Load Testing Section */}
        <section aria-labelledby="load-test-title">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle id="load-test-title" className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Load Testing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => runLoadTestMutation.mutate()}
                    disabled={runLoadTestMutation.isPending || user?.role !== 'admin'}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {runLoadTestMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Running Load Test...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Run Load Test (100 Users)
                      </>
                    )}
                  </Button>
                  {user?.role !== 'admin' && (
                    <Badge variant="outline" className="text-amber-700">
                      Admin Only
                    </Badge>
                  )}
                </div>

                {loadTestResults && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">Load Test Results</h3>
                        <Badge className={cn(
                          'text-lg px-4 py-1',
                          loadTestResults.grade === 'A' ? 'bg-green-100 text-green-800' :
                          loadTestResults.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                          loadTestResults.grade === 'C' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        )}>
                          Grade: {loadTestResults.grade}
                        </Badge>
                        <Badge className={loadTestResults.status === 'passed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                          {loadTestResults.status === 'passed' ? 'Passed' : 'Needs Improvement'}
                        </Badge>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => exportReport(loadTestResults, 'load-test')}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>

                    {/* Test Configuration */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 mb-3">Test Configuration</h4>
                      <div className="grid md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-slate-600">Concurrent Users:</span>
                          <span className="font-semibold text-slate-900 ml-2">{loadTestResults.testConfig.concurrentUsers}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Duration:</span>
                          <span className="font-semibold text-slate-900 ml-2">{loadTestResults.testConfig.actualDuration}ms</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Total Requests:</span>
                          <span className="font-semibold text-slate-900 ml-2">{loadTestResults.results.totalRequests}</span>
                        </div>
                      </div>
                    </div>

                    {/* Results Summary */}
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="bg-green-50 rounded-lg p-4">
                        <CheckCircle2 className="w-6 h-6 text-green-600 mb-2" />
                        <div className="text-2xl font-bold text-green-700">{loadTestResults.results.successfulRequests}</div>
                        <div className="text-xs text-slate-600">Successful</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <XCircle className="w-6 h-6 text-red-600 mb-2" />
                        <div className="text-2xl font-bold text-red-700">{loadTestResults.results.failedRequests}</div>
                        <div className="text-xs text-slate-600">Failed</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <Activity className="w-6 h-6 text-blue-600 mb-2" />
                        <div className="text-2xl font-bold text-blue-700">{loadTestResults.results.successRate}</div>
                        <div className="text-xs text-slate-600">Success Rate</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
                        <div className="text-2xl font-bold text-purple-700">{loadTestResults.performance.throughput}</div>
                        <div className="text-xs text-slate-600">Throughput</div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Response Time Metrics</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-white border rounded-lg p-4">
                          <div className="text-sm text-slate-600 mb-1">Average</div>
                          <div className="text-2xl font-bold text-slate-900">{loadTestResults.performance.avgResponseTime}ms</div>
                        </div>
                        <div className="bg-white border rounded-lg p-4">
                          <div className="text-sm text-slate-600 mb-1">P95</div>
                          <div className="text-2xl font-bold text-slate-900">{loadTestResults.performance.p95ResponseTime}ms</div>
                        </div>
                        <div className="bg-white border rounded-lg p-4">
                          <div className="text-sm text-slate-600 mb-1">P99</div>
                          <div className="text-2xl font-bold text-slate-900">{loadTestResults.performance.p99ResponseTime}ms</div>
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {loadTestResults.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          Recommendations
                        </h4>
                        <div className="space-y-2">
                          {loadTestResults.recommendations.map((rec, idx) => (
                            <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <Badge className="bg-amber-600 text-white mt-0.5">
                                  {rec.priority}
                                </Badge>
                                <div className="flex-1">
                                  <div className="font-medium text-slate-900 text-sm">{rec.issue}</div>
                                  <div className="text-xs text-slate-600 mt-1">{rec.suggestion}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}