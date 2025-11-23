import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";

const CHECKLIST_CATEGORIES = [
  {
    id: 'performance',
    name: 'Performance & Optimization',
    items: [
      { id: 'react-query-caching', label: 'React Query caching configured (5min stale, 30min cache)', sprint: 1 },
      { id: 'search-debouncing', label: 'Search inputs debounced (300ms)', sprint: 1 },
      { id: 'image-optimization', label: 'Images optimized (lazy loading, width/height)', sprint: 1 },
      { id: 'code-splitting', label: 'Code splitting implemented (ProposalBuilder, Pipeline)', sprint: 2 },
      { id: 'lazy-loading', label: 'Heavy components lazy loaded (modals, charts, editor)', sprint: 2 },
      { id: 'component-memoization', label: 'KanbanCard and frequently re-rendering components memoized', sprint: 9 },
      { id: 'lighthouse-score', label: 'Lighthouse Performance score >90', sprint: 13 },
      { id: 'core-web-vitals', label: 'Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1', sprint: 13 },
      { id: 'load-testing', label: 'Load testing: 100+ concurrent users', sprint: 13 }
    ]
  },
  {
    id: 'mobile',
    name: 'Mobile Experience',
    items: [
      { id: 'touch-targets', label: 'All touch targets ≥44x44px (navigation, cards, modals)', sprint: 3 },
      { id: 'mobile-kanban', label: 'Mobile-first Kanban redesign with swipe navigation', sprint: 7 },
      { id: 'mobile-tables', label: 'Tables converted to card view on mobile', sprint: 7 },
      { id: 'mobile-modals', label: 'Full-screen modals on mobile devices', sprint: 10 },
      { id: 'mobile-proposal-builder', label: 'ProposalBuilder optimized for mobile', sprint: 10 },
      { id: 'swipe-gestures', label: 'Swipe gestures implemented (cards, navigation)', sprint: 14 }
    ]
  },
  {
    id: 'accessibility',
    name: 'Accessibility (WCAG AA)',
    items: [
      { id: 'focus-indicators', label: 'Visible focus rings on all interactive elements', sprint: 4 },
      { id: 'aria-labels', label: 'ARIA labels on all icon-only buttons', sprint: 4 },
      { id: 'modal-focus', label: 'Modal focus management (trap, auto-focus, return)', sprint: 4 },
      { id: 'form-errors', label: 'Form errors connected with ARIA (aria-invalid, aria-describedby)', sprint: 8 },
      { id: 'required-fields', label: 'Required fields marked visually and with aria-required', sprint: 8 },
      { id: 'aria-live', label: 'ARIA live regions for notifications and errors', sprint: 11 },
      { id: 'semantic-html', label: 'Semantic HTML audit complete (nav, main, button)', sprint: 11 },
      { id: 'contrast-ratio', label: 'All text meets WCAG AA contrast ratio (4.5:1)', sprint: 15 },
      { id: 'color-blindness', label: 'Status indicators work without color (icons, patterns)', sprint: 15 },
      { id: 'screen-reader', label: 'NVDA/JAWS/VoiceOver navigation verified', sprint: 11 }
    ]
  },
  {
    id: 'security',
    name: 'Security & Infrastructure',
    items: [
      { id: 'owasp-scan', label: 'OWASP security scan completed (zero critical vulnerabilities)', sprint: 12 },
      { id: 'security-headers', label: 'Security headers configured', sprint: 12 },
      { id: 'rate-limiting', label: 'API rate limiting implemented (100 req/min per user)', sprint: 12 },
      { id: 'auth-flow-audit', label: 'Authentication flow audited', sprint: 12 },
      { id: 'file-upload-security', label: 'File upload security reviewed', sprint: 12 },
      { id: 'backup-verification', label: 'Database backup and restore tested', sprint: 12 },
      { id: 'disaster-recovery', label: 'Disaster recovery plan documented', sprint: 12 }
    ]
  },
  {
    id: 'monitoring',
    name: 'Monitoring & Analytics',
    items: [
      { id: 'sentry-integration', label: 'Sentry error monitoring with ErrorBoundary', sprint: 5 },
      { id: 'sentry-alerts', label: 'Slack alerts configured for critical errors', sprint: 5 },
      { id: 'analytics-tracking', label: 'Analytics tracking 10+ key events (GA4/Mixpanel)', sprint: 5 },
      { id: 'metrics-dashboard', label: 'Weekly metrics report dashboard', sprint: 5 }
    ]
  },
  {
    id: 'testing',
    name: 'Testing & QA',
    items: [
      { id: 'core-functionality', label: 'Core functionality tested (registration, proposals, Kanban, AI, exports)', sprint: 16 },
      { id: 'browser-compatibility', label: 'Browser compatibility (Chrome, Firefox, Safari, Edge)', sprint: 16 },
      { id: 'device-testing', label: 'Device testing (desktop, tablet, mobile)', sprint: 16 },
      { id: 'critical-bugs', label: 'Zero critical bugs, <5 high-priority bugs', sprint: 16 }
    ]
  },
  {
    id: 'documentation',
    name: 'Documentation',
    items: [
      { id: 'user-guides', label: '6+ comprehensive user guides published', sprint: 17 },
      { id: 'tutorial-videos', label: '3+ tutorial videos recorded', sprint: 17 },
      { id: 'faq-items', label: 'FAQ with 50+ items published', sprint: 17 },
      { id: 'searchable-docs', label: 'Documentation searchable', sprint: 17 }
    ]
  },
  {
    id: 'deployment',
    name: 'Deployment Readiness',
    items: [
      { id: 'staging-deployment', label: 'Staging environment deployed and verified', sprint: 18 },
      { id: 'smoke-tests', label: 'Automated smoke tests passing', sprint: 18 },
      { id: 'rollback-plan', label: 'Rollback plan documented and tested', sprint: 18 },
      { id: 'monitoring-setup', label: 'Production monitoring and alerting configured', sprint: 18 },
      { id: 'on-call-schedule', label: 'On-call schedule assigned', sprint: 18 }
    ]
  }
];

export default function PreLaunchChecklist({ user }) {
  const [expandedCategories, setExpandedCategories] = useState(['performance', 'mobile', 'accessibility']);
  const [checkedItems, setCheckedItems] = useState(new Set());

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleItem = (itemId) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const stats = useMemo(() => {
    const totalItems = CHECKLIST_CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0);
    const completedItems = checkedItems.size;
    const percentage = Math.round((completedItems / totalItems) * 100);

    return { totalItems, completedItems, percentage };
  }, [checkedItems]);

  const exportChecklist = () => {
    const data = CHECKLIST_CATEGORIES.map(category => ({
      category: category.name,
      items: category.items.map(item => ({
        label: item.label,
        sprint: item.sprint,
        completed: checkedItems.has(item.id)
      }))
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pre-launch-checklist-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pre-Launch Checklist</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {stats.completedItems} of {stats.totalItems} items complete
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900">{stats.percentage}%</div>
                <div className="text-xs text-slate-600">Complete</div>
              </div>
              <Button variant="outline" size="sm" onClick={exportChecklist}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <Progress value={stats.percentage} className="mt-4 h-3" />
        </CardHeader>
        <CardContent className="space-y-3">
          {CHECKLIST_CATEGORIES.map((category) => {
            const categoryCompleted = category.items.filter(item => checkedItems.has(item.id)).length;
            const categoryPercentage = Math.round((categoryCompleted / category.items.length) * 100);
            const isExpanded = expandedCategories.includes(category.id);

            return (
              <div key={category.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                    <h3 className="font-semibold text-slate-900">{category.name}</h3>
                    <Badge variant="outline">
                      {categoryCompleted}/{category.items.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <Progress value={categoryPercentage} className="h-2" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 w-12 text-right">
                      {categoryPercentage}%
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 pt-0 space-y-2 bg-slate-50">
                    {category.items.map((item) => {
                      const isChecked = checkedItems.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 bg-white rounded-lg hover:border-blue-300 border border-transparent transition-colors"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleItem(item.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <label
                              onClick={() => toggleItem(item.id)}
                              className={cn(
                                "text-sm cursor-pointer",
                                isChecked ? "text-slate-500 line-through" : "text-slate-900"
                              )}
                            >
                              {item.label}
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Sprint {item.sprint}
                              </Badge>
                            </div>
                          </div>
                          {isChecked && (
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}