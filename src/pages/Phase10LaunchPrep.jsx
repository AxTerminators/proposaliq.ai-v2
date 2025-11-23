import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, AlertTriangle, CheckCircle2, Info, Shield, Activity, Eye, Database } from "lucide-react";

const LAUNCH_PREP_AUDIT = [
  {
    id: 1,
    area: "Error Monitoring & Logging",
    priority: "critical",
    status: "partial",
    issues: [
      "ErrorMonitor component exists but not fully integrated",
      "No centralized error tracking service (Sentry, LogRocket)",
      "Backend function errors not consistently logged",
      "No error alerting system",
      "User actions not tracked for debugging"
    ],
    solutions: [
      "Integrate Sentry or similar service",
      "Wrap app in global ErrorBoundary",
      "Add error logging to all backend functions",
      "Set up Slack/email alerts for critical errors",
      "Add breadcrumb tracking for user sessions"
    ],
    existing: [
      "✅ ErrorBoundary component exists",
      "✅ ErrorMonitor component exists"
    ],
    deliverables: [
      "Sentry/LogRocket integration",
      "Error dashboard",
      "Alert configuration",
      "Error response playbook"
    ]
  },
  {
    id: 2,
    area: "Analytics & Tracking",
    priority: "high",
    status: "missing",
    issues: [
      "No user behavior tracking",
      "No feature usage analytics",
      "Can't measure user engagement",
      "No conversion tracking",
      "No A/B testing capability"
    ],
    solutions: [
      "Integrate Google Analytics 4 or Mixpanel",
      "Track key user actions (proposal creation, exports, etc)",
      "Set up conversion funnels",
      "Add custom events for features",
      "Dashboard for product metrics"
    ],
    existing: [
      "✅ AnalyticsTracker component exists (unused)"
    ],
    deliverables: [
      "Analytics integration",
      "Event tracking plan",
      "Analytics dashboard",
      "Weekly metrics reports"
    ]
  },
  {
    id: 3,
    area: "Performance Testing",
    priority: "high",
    status: "needs_work",
    issues: [
      "No load testing performed",
      "Lighthouse scores not measured",
      "Database query performance unknown",
      "Large file upload limits untested",
      "Concurrent user limits unknown"
    ],
    solutions: [
      "Run Lighthouse audits on all pages",
      "Load test with 100+ concurrent users",
      "Profile database queries",
      "Test file uploads up to 50MB",
      "Measure Core Web Vitals"
    ],
    deliverables: [
      "Performance report",
      "Lighthouse scores (target: 90+)",
      "Load test results",
      "Performance baselines"
    ]
  },
  {
    id: 4,
    area: "Security Audit",
    priority: "critical",
    status: "needs_work",
    issues: [
      "No security penetration testing",
      "OWASP Top 10 not verified",
      "API rate limiting not configured",
      "File upload security not hardened",
      "XSS/CSRF protection not audited"
    ],
    solutions: [
      "Run OWASP ZAP security scan",
      "Implement rate limiting on APIs",
      "Add file type validation and scanning",
      "Review authentication flow",
      "Add security headers",
      "Audit sensitive data handling"
    ],
    deliverables: [
      "Security audit report",
      "Vulnerability fixes",
      "Security policy document",
      "Incident response plan"
    ]
  },
  {
    id: 5,
    area: "Database & Backup",
    priority: "critical",
    status: "unknown",
    issues: [
      "Backup frequency unknown",
      "Restore procedures untested",
      "No disaster recovery plan",
      "Database migration strategy unclear",
      "Data retention policy undefined"
    ],
    solutions: [
      "Configure automated daily backups",
      "Test restore procedure",
      "Document disaster recovery plan",
      "Set up point-in-time recovery",
      "Define data retention policy"
    ],
    deliverables: [
      "Backup configuration",
      "Tested restore procedure",
      "DR plan document",
      "Data retention policy"
    ]
  },
  {
    id: 6,
    area: "Final QA Testing",
    priority: "critical",
    status: "needs_execution",
    testAreas: [
      "User registration & onboarding flow",
      "Organization creation & switching",
      "Proposal creation (all types)",
      "Kanban board operations",
      "File uploads (all types)",
      "AI features (chat, generation, RAG)",
      "Export functionality",
      "Team collaboration features",
      "Client portal access",
      "Mobile experience",
      "Browser compatibility (Chrome, Firefox, Safari, Edge)",
      "Permission & role enforcement"
    ],
    deliverables: [
      "QA test plan",
      "Test case execution results",
      "Bug tracking and resolution",
      "User acceptance testing"
    ]
  },
  {
    id: 7,
    area: "Browser & Device Testing",
    priority: "high",
    status: "needs_execution",
    browsers: [
      "Chrome (latest 2 versions)",
      "Firefox (latest 2 versions)",
      "Safari (latest 2 versions)",
      "Edge (latest 2 versions)"
    ],
    devices: [
      "Desktop (1920x1080, 1366x768)",
      "Tablet (iPad, Android tablet)",
      "Mobile (iPhone, Android phone)"
    ],
    deliverables: [
      "Compatibility matrix",
      "Browser-specific issues list",
      "Mobile testing results"
    ]
  },
  {
    id: 8,
    area: "Deployment & Infrastructure",
    priority: "critical",
    status: "needs_validation",
    checks: [
      "Production environment configured",
      "Environment variables set",
      "CDN configured for assets",
      "SSL certificates valid",
      "DNS configured",
      "Scaling policies defined",
      "Health check endpoints working"
    ],
    deliverables: [
      "Deployment checklist",
      "Infrastructure diagram",
      "Rollback procedure",
      "Post-deploy validation script"
    ]
  },
  {
    id: 9,
    area: "Documentation & Training",
    priority: "high",
    status: "in_progress",
    items: [
      "User documentation complete (Phase 9)",
      "Admin training materials",
      "Support team knowledge base",
      "Video tutorials recorded",
      "FAQ section populated",
      "Release notes prepared"
    ],
    deliverables: [
      "Complete documentation site",
      "Training videos",
      "Support team training sessions",
      "Launch announcement content"
    ]
  },
  {
    id: 10,
    area: "Post-Launch Monitoring",
    priority: "critical",
    status: "needs_setup",
    metrics: [
      "Server uptime (target: 99.9%)",
      "Response time (target: <200ms p95)",
      "Error rate (target: <0.1%)",
      "Active users (daily, weekly, monthly)",
      "Feature adoption rates",
      "Support ticket volume",
      "User satisfaction (NPS score)"
    ],
    deliverables: [
      "Monitoring dashboard",
      "Alert configuration",
      "On-call schedule",
      "Incident response plan"
    ]
  }
];

const LAUNCH_CHECKLIST = [
  {
    category: "Pre-Launch (1 week before)",
    items: [
      "□ All Phase 1-9 items completed",
      "□ Security audit passed",
      "□ Performance testing completed",
      "□ Load testing completed",
      "□ Browser compatibility verified",
      "□ Backup & restore tested",
      "□ Documentation published",
      "□ Support team trained",
      "□ Monitoring configured",
      "□ Error tracking active",
      "□ Analytics integrated"
    ]
  },
  {
    category: "Launch Day",
    items: [
      "□ Final production deploy",
      "□ DNS cutover",
      "□ SSL certificate verified",
      "□ Smoke tests passed",
      "□ Monitoring dashboard active",
      "□ On-call team ready",
      "□ Support channels open",
      "□ Launch announcement sent",
      "□ Social media posts scheduled"
    ]
  },
  {
    category: "Post-Launch (First 24 hours)",
    items: [
      "□ Monitor error rates",
      "□ Monitor response times",
      "□ Monitor user signups",
      "□ Monitor feature usage",
      "□ Respond to support tickets",
      "□ Address critical bugs",
      "□ Collect user feedback"
    ]
  },
  {
    category: "First Week",
    items: [
      "□ Daily metrics review",
      "□ User feedback analysis",
      "□ Bug triage and fixes",
      "□ Performance optimization",
      "□ Documentation updates",
      "□ Weekly stakeholder report"
    ]
  }
];

const SUCCESS_CRITERIA = {
  technical: [
    "99.9% uptime",
    "< 200ms average response time",
    "< 0.1% error rate",
    "Lighthouse score > 90",
    "Zero critical security issues"
  ],
  business: [
    "100+ active organizations",
    "500+ proposals created",
    "80% feature adoption",
    "NPS score > 50",
    "< 5% churn rate"
  ],
  support: [
    "< 24hr support response time",
    "< 5% unresolved tickets",
    "Self-service documentation covers 80% of issues"
  ]
};

const ROLLBACK_PLAN = [
  {
    trigger: "Critical error rate > 1%",
    action: "Immediate rollback to previous version"
  },
  {
    trigger: "Response time > 5 seconds",
    action: "Investigate, consider rollback if no quick fix"
  },
  {
    trigger: "Security vulnerability discovered",
    action: "Patch immediately or rollback if patch unavailable"
  },
  {
    trigger: "Data loss reported",
    action: "Immediate rollback, restore from backup"
  }
];

export default function Phase10LaunchPrep() {
  const criticalCount = LAUNCH_PREP_AUDIT.filter(a => a.priority === "critical").length;
  const highCount = LAUNCH_PREP_AUDIT.filter(a => a.priority === "high").length;
  const needsWorkCount = LAUNCH_PREP_AUDIT.filter(a => 
    a.status === "needs_work" || 
    a.status === "missing" || 
    a.status === "needs_execution" ||
    a.status === "needs_validation" ||
    a.status === "needs_setup"
  ).length;
  const totalChecklist = LAUNCH_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Phase 10: Launch Preparation</h1>
              <p className="text-slate-600">Monitoring, security, testing, and final validation</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Critical Items</p>
                  <p className="text-2xl font-bold text-slate-900">{criticalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">High Priority</p>
                  <p className="text-2xl font-bold text-slate-900">{highCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Info className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Needs Work</p>
                  <p className="text-2xl font-bold text-slate-900">{needsWorkCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Checklist Items</p>
                  <p className="text-2xl font-bold text-slate-900">{totalChecklist}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Launch Readiness Audit */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Launch Readiness Audit</h2>
          {LAUNCH_PREP_AUDIT.map((item) => (
            <Card key={item.id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      {item.area}
                      <Badge className={
                        item.priority === "critical" ? "bg-red-600 text-white" :
                        item.priority === "high" ? "bg-orange-600 text-white" :
                        "bg-blue-600 text-white"
                      }>
                        {item.priority?.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={
                        item.status === "missing" || item.status === "needs_work" || 
                        item.status === "needs_execution" || item.status === "needs_validation" ||
                        item.status === "needs_setup" || item.status === "unknown"
                          ? "border-red-500 text-red-700"
                          : item.status === "partial" || item.status === "in_progress"
                            ? "border-blue-500 text-blue-700"
                            : "border-green-500 text-green-700"
                      }>
                        {item.status?.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Issues */}
                {item.issues && item.issues.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Issues / Gaps:
                    </h4>
                    <ul className="space-y-1">
                      {item.issues.map((issue, idx) => (
                        <li key={idx} className="text-sm text-red-600 ml-6">
                          • {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Solutions */}
                {item.solutions && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Required Actions:
                    </h4>
                    <ul className="space-y-1">
                      {item.solutions.map((solution, idx) => (
                        <li key={idx} className="text-sm text-green-600 ml-6">
                          • {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Test Areas */}
                {item.testAreas && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Test Coverage Required:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {item.testAreas.map((area, idx) => (
                        <div key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-slate-400">□</span>
                          {area}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Browsers/Devices */}
                {item.browsers && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Browser Testing:</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.browsers.map((browser, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {browser}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {item.devices && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Device Testing:</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.devices.map((device, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {device}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checks */}
                {item.checks && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Infrastructure Checks:</h4>
                    <ul className="space-y-1">
                      {item.checks.map((check, idx) => (
                        <li key={idx} className="text-sm text-slate-600 ml-6">
                          □ {check}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Items */}
                {item.items && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Requirements:</h4>
                    <ul className="space-y-1">
                      {item.items.map((itm, idx) => (
                        <li key={idx} className="text-sm text-slate-600 ml-6">
                          • {itm}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Metrics */}
                {item.metrics && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Metrics to Monitor:</h4>
                    <ul className="space-y-1">
                      {item.metrics.map((metric, idx) => (
                        <li key={idx} className="text-sm text-blue-600 ml-6">
                          📊 {metric}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Existing */}
                {item.existing && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      Already Available:
                    </h4>
                    <ul className="space-y-1">
                      {item.existing.map((existing, idx) => (
                        <li key={idx} className="text-sm text-blue-600 ml-6">
                          {existing}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Deliverables */}
                {item.deliverables && (
                  <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-900 mb-2">Deliverables:</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.deliverables.map((deliverable, idx) => (
                        <Badge key={idx} className="bg-green-600 text-white text-xs">
                          {deliverable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Launch Checklist */}
        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-orange-900 mb-4">🚀 Launch Checklist</h3>
            <div className="space-y-6">
              {LAUNCH_CHECKLIST.map((category, idx) => (
                <div key={idx}>
                  <h4 className="font-semibold text-orange-800 mb-3">{category.category}</h4>
                  <div className="space-y-2">
                    {category.items.map((item, i) => (
                      <div key={i} className="text-sm text-orange-700">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Success Criteria */}
        <Card className="mb-6 bg-blue-50 border-2 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">🎯 Success Criteria</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-blue-800 mb-3">Technical</h4>
                <ul className="space-y-2">
                  {SUCCESS_CRITERIA.technical.map((item, idx) => (
                    <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-3">Business</h4>
                <ul className="space-y-2">
                  {SUCCESS_CRITERIA.business.map((item, idx) => (
                    <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-3">Support</h4>
                <ul className="space-y-2">
                  {SUCCESS_CRITERIA.support.map((item, idx) => (
                    <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rollback Plan */}
        <Card className="bg-red-50 border-2 border-red-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-red-900 mb-4">⚠️ Rollback Plan</h3>
            <div className="space-y-3">
              {ROLLBACK_PLAN.map((plan, idx) => (
                <div key={idx} className="bg-white rounded-lg border-2 border-red-200 p-4">
                  <p className="text-sm font-semibold text-red-800 mb-1">
                    Trigger: {plan.trigger}
                  </p>
                  <p className="text-sm text-red-700">
                    Action: {plan.action}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}