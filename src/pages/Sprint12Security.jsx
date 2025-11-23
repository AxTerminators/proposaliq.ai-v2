import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Shield, Lock, FileWarning, Activity, Database } from "lucide-react";

export default function Sprint12Security() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8" role="main" aria-labelledby="sprint-title">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 id="sprint-title" className="text-3xl font-bold text-slate-900">Sprint 12: Security & Infrastructure Audit</h1>
              <p className="text-slate-600 mt-1">OWASP Compliance, Rate Limiting & Security Implementation</p>
            </div>
          </div>
          <Badge className="bg-green-600 text-white">✅ Completed</Badge>
        </header>

        <div className="grid gap-6 mb-8">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                OWASP Security Implementation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Security Audit Function</h3>
                    <ul className="text-sm text-slate-600 mt-1 space-y-1 list-disc list-inside">
                      <li>Comprehensive OWASP Top 10 checks implemented</li>
                      <li>Authentication flow validation</li>
                      <li>File upload security review</li>
                      <li>Sensitive data exposure checks</li>
                      <li>Security event logging and monitoring</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Security Headers Configuration</h3>
                    <ul className="text-sm text-slate-600 mt-1 space-y-1 list-disc list-inside">
                      <li>Content-Security-Policy for XSS prevention</li>
                      <li>X-Frame-Options to prevent clickjacking</li>
                      <li>Strict-Transport-Security for HTTPS enforcement</li>
                      <li>X-Content-Type-Options for MIME sniffing protection</li>
                      <li>Referrer-Policy and Permissions-Policy configured</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">File Upload Security</h3>
                    <ul className="text-sm text-slate-600 mt-1 space-y-1 list-disc list-inside">
                      <li>File type validation (MIME type checking)</li>
                      <li>File size limits (50MB maximum)</li>
                      <li>Dangerous extension blocking (.exe, .bat, etc.)</li>
                      <li>Path traversal prevention</li>
                      <li>Security event logging for all uploads</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                API Rate Limiting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Rate Limiter Implementation</h3>
                    <ul className="text-sm text-slate-600 mt-1 space-y-1 list-disc list-inside">
                      <li>100 requests per minute per user limit</li>
                      <li>In-memory rate limiting with automatic cleanup</li>
                      <li>HTTP 429 responses when limit exceeded</li>
                      <li>Rate limit headers (X-RateLimit-*) included</li>
                      <li>Per-user tracking and enforcement</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Abuse Prevention</h3>
                    <ul className="text-sm text-slate-600 mt-1 space-y-1 list-disc list-inside">
                      <li>Prevents API flooding and DoS attacks</li>
                      <li>Automatic window reset (60 seconds)</li>
                      <li>Clear error messages with retry timing</li>
                      <li>Real-time rate limit status monitoring</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                Infrastructure & Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Database Backup Strategy</h3>
                    <ul className="text-sm text-slate-600 mt-1 space-y-1 list-disc list-inside">
                      <li>Platform-managed automated backups</li>
                      <li>Point-in-time recovery capabilities</li>
                      <li>Data durability and disaster recovery</li>
                      <li>Infrastructure-level backup verification</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Security Monitoring</h3>
                    <ul className="text-sm text-slate-600 mt-1 space-y-1 list-disc list-inside">
                      <li>SystemLog entity for all security events</li>
                      <li>Audit trail for admin actions</li>
                      <li>Failed authentication tracking</li>
                      <li>Suspicious activity logging</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                Security Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Admin Security Portal</h3>
                    <ul className="text-sm text-slate-600 mt-1 space-y-1 list-disc list-inside">
                      <li>Real-time security audit reports</li>
                      <li>OWASP Top 10 compliance dashboard</li>
                      <li>Rate limiting status monitoring</li>
                      <li>Security headers configuration viewer</li>
                      <li>Exportable audit reports (JSON format)</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-900">
                    📍 <strong>Access:</strong> Navigate to Settings → Security Audit to run comprehensive security checks
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6" aria-labelledby="success-title">
          <h2 id="success-title" className="text-xl font-bold text-green-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6" />
            Success Criteria Met
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Zero Critical Vulnerabilities</h3>
              <p className="text-sm text-slate-600">OWASP Top 10 checks passing, security hardening implemented</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Rate Limiting Active</h3>
              <p className="text-sm text-slate-600">100 req/min limit prevents API abuse and DoS attacks</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Backup Verified</h3>
              <p className="text-sm text-slate-600">Platform-managed backups with point-in-time recovery</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">Security Documented</h3>
              <p className="text-sm text-slate-600">Comprehensive audit reports and security policies</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}