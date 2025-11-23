import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Lock,
  FileWarning,
  Database,
  Activity,
  Eye
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LoadingState from "@/components/ui/LoadingState";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/components/layout/OrganizationContext";

export default function SecurityAudit() {
  const { user } = useOrganization();
  const queryClient = useQueryClient();
  const [auditReport, setAuditReport] = useState(null);

  const runAuditMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('securityAudit', {});
      return response.data;
    },
    onSuccess: (data) => {
      setAuditReport(data.audit);
      queryClient.invalidateQueries({ queryKey: ['security-audit'] });
    },
  });

  const { data: securityHeaders } = useQuery({
    queryKey: ['security-headers'],
    queryFn: async () => {
      const response = await base44.functions.invoke('securityHeaders', {});
      return response.data;
    },
    enabled: user?.role === 'admin',
  });

  const { data: rateLimitStatus } = useQuery({
    queryKey: ['rate-limit-status'],
    queryFn: async () => {
      const response = await base44.functions.invoke('rateLimiter', {});
      return response.data;
    },
    enabled: !!user,
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'review':
        return <Eye className="w-5 h-5 text-blue-600" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pass: 'bg-green-100 text-green-800',
      warning: 'bg-amber-100 text-amber-800',
      fail: 'bg-red-100 text-red-800',
      review: 'bg-blue-100 text-blue-800',
      healthy: 'bg-green-100 text-green-800',
      critical: 'bg-red-100 text-red-800'
    };
    return variants[status] || 'bg-slate-100 text-slate-800';
  };

  const exportAuditReport = () => {
    if (!auditReport) return;
    
    const reportText = JSON.stringify(auditReport, null, 2);
    const blob = new Blob([reportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-audit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (user?.role !== 'admin') {
    return (
      <main className="flex items-center justify-center min-h-screen p-6" role="main">
        <Card className="max-w-md border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <Lock className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600">
              Administrator privileges required to access security audit features.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8" role="main" aria-labelledby="audit-title">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 id="audit-title" className="text-3xl font-bold text-slate-900">Security Audit & Infrastructure</h1>
                <p className="text-slate-600 mt-1">Sprint 12: OWASP Compliance, Rate Limiting & Security Headers</p>
              </div>
            </div>
            <Button
              onClick={() => runAuditMutation.mutate()}
              disabled={runAuditMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {runAuditMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running Audit...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Run Security Audit
                </>
              )}
            </Button>
          </div>
        </header>

        {/* Rate Limiting Status */}
        <section className="mb-6" aria-labelledby="rate-limit-title">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle id="rate-limit-title" className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                API Rate Limiting Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rateLimitStatus?.success ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-slate-600 mb-1">Rate Limit</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {rateLimitStatus.rateLimit.limit}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">requests per minute</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-slate-600 mb-1">Remaining</div>
                    <div className="text-2xl font-bold text-green-700">
                      {rateLimitStatus.rateLimit.remaining}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">requests available</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-slate-600 mb-1">Window</div>
                    <div className="text-2xl font-bold text-purple-700">
                      {rateLimitStatus.rateLimit.window}s
                    </div>
                    <div className="text-xs text-slate-500 mt-1">reset interval</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600">Rate limiting is active and monitoring API usage.</div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Security Headers */}
        <section className="mb-6" aria-labelledby="headers-title">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle id="headers-title" className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                Security Headers Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {securityHeaders?.headers ? (
                <div className="space-y-3">
                  {Object.entries(securityHeaders.headers).map(([header, config]) => (
                    <div key={header} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                              {header}
                            </code>
                            <Badge className={getStatusBadge(config.severity)}>
                              {config.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mt-2">{config.description}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded p-2 mt-2">
                        <code className="text-xs text-slate-700">{config.value}</code>
                      </div>
                    </div>
                  ))}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-blue-900">
                      ℹ️ {securityHeaders.implementation_note}
                    </p>
                  </div>
                </div>
              ) : (
                <LoadingState message="Loading security headers..." />
              )}
            </CardContent>
          </Card>
        </section>

        {/* Audit Report */}
        {auditReport && (
          <section aria-labelledby="report-title">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle id="report-title" className="flex items-center gap-2">
                    <FileWarning className="w-5 h-5 text-orange-600" />
                    Security Audit Report
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusBadge(auditReport.summary.overall_status)}>
                      {auditReport.summary.overall_status.toUpperCase()}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={exportAuditReport}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary */}
                <div className="grid md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {auditReport.summary.total_checks}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">Total Checks</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {auditReport.summary.passed}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">Passed</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-amber-700">
                      {auditReport.summary.warnings}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">Warnings</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-700">
                      {auditReport.summary.failures}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">Failures</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">
                      {auditReport.summary.needs_review}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">Needs Review</div>
                  </div>
                </div>

                {/* Audit Checks by Category */}
                <div className="space-y-4">
                  {['OWASP Top 10', 'Authentication', 'File Security', 'Data Protection', 'Security Monitoring', 'User Management'].map(category => {
                    const categoryChecks = auditReport.checks.filter(c => c.category === category);
                    if (categoryChecks.length === 0) return null;

                    return (
                      <div key={category}>
                        <h3 className="font-semibold text-slate-900 mb-3">{category}</h3>
                        <div className="space-y-2">
                          {categoryChecks.map((check, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg",
                                check.status === 'pass' && 'bg-green-50',
                                check.status === 'warning' && 'bg-amber-50',
                                check.status === 'fail' && 'bg-red-50',
                                check.status === 'review' && 'bg-blue-50'
                              )}
                            >
                              {getStatusIcon(check.status)}
                              <div className="flex-1">
                                <div className="font-medium text-slate-900 text-sm">
                                  {check.check}
                                </div>
                                <div className="text-xs text-slate-600 mt-1">
                                  {check.details}
                                </div>
                              </div>
                              <Badge className={getStatusBadge(check.status)}>
                                {check.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 text-xs text-slate-500">
                  Audit performed by {auditReport.auditor} at {new Date(auditReport.timestamp).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Security Best Practices */}
        {!auditReport && (
          <section aria-labelledby="practices-title">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle id="practices-title" className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-600" />
                  Security Best Practices & Infrastructure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">Implemented Security Features</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-900">API Rate Limiting</div>
                        <div className="text-sm text-slate-600">100 requests per minute per user to prevent abuse</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-900">File Upload Security</div>
                        <div className="text-sm text-slate-600">Validates file types, extensions, and sizes; prevents malware uploads</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-900">Security Audit Logging</div>
                        <div className="text-sm text-slate-600">All security events logged to SystemLog entity</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-900">Authentication System</div>
                        <div className="text-sm text-slate-600">Base44 platform authentication with role-based access control</div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-900">Data Isolation</div>
                        <div className="text-sm text-slate-600">Organization-level data isolation enforced by platform</div>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">📋 Database Backup & Recovery</h3>
                  <p className="text-sm text-blue-800">
                    Database backups are managed by the Base44 platform infrastructure. Point-in-time recovery
                    and automated backups are handled at the platform level, ensuring data durability and 
                    disaster recovery capabilities.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}