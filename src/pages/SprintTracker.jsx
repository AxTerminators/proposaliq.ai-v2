import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Clock,
  Zap,
  Shield,
  Smartphone,
  TestTube,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

const SPRINTS_DATA = [
  {
    number: 1,
    name: "Performance Foundation",
    category: "performance",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "React Query Caching Configuration", status: "completed" },
      { item: "Search Debouncing", status: "completed" },
      { item: "Image Optimization", status: "completed" }
    ],
    successCriteria: [
      { metric: "Dashboard loads in <1.5s", achieved: true },
      { metric: "API calls reduced by 50%+", achieved: true },
      { metric: "Lighthouse Performance >85", achieved: true }
    ]
  },
  {
    number: 2,
    name: "Code Splitting & Lazy Loading",
    category: "performance",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Lazy Load Heavy Components", status: "completed" },
      { item: "Route-Based Code Splitting", status: "completed" }
    ],
    successCriteria: [
      { metric: "Initial bundle <500kb", achieved: true },
      { metric: "ProposalBuilder loads on demand", achieved: true }
    ]
  },
  {
    number: 3,
    name: "Mobile Touch Targets - Critical Fixes",
    category: "mobile",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Fix Navigation Touch Targets", status: "completed" },
      { item: "Fix Card and List Touch Targets", status: "completed" },
      { item: "Fix Modal and Form Touch Targets", status: "completed" }
    ],
    successCriteria: [
      { metric: "All touch targets ≥44x44px", achieved: true },
      { metric: "Mobile usability score >90", achieved: true }
    ]
  },
  {
    number: 4,
    name: "Basic Accessibility - WCAG Level A",
    category: "accessibility",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Add Focus Indicators", status: "completed" },
      { item: "Add ARIA Labels", status: "completed" },
      { item: "Modal Focus Management", status: "completed" }
    ],
    successCriteria: [
      { metric: "All pages navigable with keyboard", achieved: true },
      { metric: "All icon buttons have ARIA labels", achieved: true },
      { metric: "axe DevTools 0 critical issues", achieved: true }
    ]
  },
  {
    number: 5,
    name: "Monitoring & Error Tracking",
    category: "infrastructure",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Integrate Sentry Error Monitoring", status: "completed" },
      { item: "Analytics Integration", status: "completed" }
    ],
    successCriteria: [
      { metric: "All errors logged to Sentry", achieved: true },
      { metric: "Analytics tracking 10+ key events", achieved: true }
    ]
  },
  {
    number: 6,
    name: "Entity Consolidation",
    category: "infrastructure",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Create SystemLog Entity", status: "completed" },
      { item: "Extend ProposalResource for AdminData", status: "completed" }
    ],
    successCriteria: [
      { metric: "All ActivityLog data in SystemLog", achieved: true },
      { metric: "All AdminData in ProposalResource", achieved: true }
    ]
  },
  {
    number: 7,
    name: "Mobile Kanban Redesign",
    category: "mobile",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Mobile-First Kanban View", status: "completed" },
      { item: "Table to Card View on Mobile", status: "completed" }
    ],
    successCriteria: [
      { metric: "Kanban usable on iPhone 13", achieved: true },
      { metric: "Touch gestures feel natural", achieved: true }
    ]
  },
  {
    number: 8,
    name: "Form Accessibility & Validation",
    category: "accessibility",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Improve Form Error Handling", status: "completed" },
      { item: "Inline Validation Feedback", status: "completed" }
    ],
    successCriteria: [
      { metric: "Screen readers announce all errors", achieved: true },
      { metric: "Form error rate decreased by 30%", achieved: true }
    ]
  },
  {
    number: 9,
    name: "Performance - Advanced Optimizations",
    category: "performance",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Component Memoization", status: "completed" },
      { item: "List Virtualization", status: "completed" }
    ],
    successCriteria: [
      { metric: "KanbanCard re-renders reduced by 80%", achieved: true },
      { metric: "Smooth scrolling with 100+ items", achieved: true }
    ]
  },
  {
    number: 10,
    name: "Mobile Forms & Modals",
    category: "mobile",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Full-Screen Modals on Mobile", status: "completed" },
      { item: "Optimize ProposalBuilder for Mobile", status: "completed" }
    ],
    successCriteria: [
      { metric: "Modals usable on iPhone SE", achieved: true },
      { metric: "ProposalBuilder works on mobile", achieved: true }
    ]
  },
  {
    number: 11,
    name: "Accessibility - Screen Readers",
    category: "accessibility",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "ARIA Live Regions", status: "completed" },
      { item: "Semantic HTML Audit", status: "completed" }
    ],
    successCriteria: [
      { metric: "NVDA/JAWS navigation works perfectly", achieved: true },
      { metric: "Semantic HTML score >95%", achieved: true }
    ]
  },
  {
    number: 12,
    name: "Security & Infrastructure Audit",
    category: "infrastructure",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "OWASP Security Scan", status: "completed" },
      { item: "API Rate Limiting", status: "completed" },
      { item: "Database Backup Verification", status: "completed" }
    ],
    successCriteria: [
      { metric: "Zero critical security vulnerabilities", achieved: true },
      { metric: "Rate limiting prevents abuse", achieved: true },
      { metric: "Backup restore tested successfully", achieved: true }
    ]
  },
  {
    number: 13,
    name: "Performance Testing & Optimization",
    category: "performance",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Lighthouse Audits", status: "completed" },
      { item: "Load Testing", status: "completed" },
      { item: "Core Web Vitals", status: "completed" }
    ],
    successCriteria: [
      { metric: "Lighthouse Performance >90", achieved: true },
      { metric: "Handles 100 concurrent users", achieved: true },
      { metric: "Core Web Vitals all green", achieved: true }
    ]
  },
  {
    number: 14,
    name: "Mobile Gestures & Polish",
    category: "mobile",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Swipe Gestures", status: "completed" },
      { item: "Mobile-Specific Components", status: "completed" }
    ],
    successCriteria: [
      { metric: "Swipe gestures feel natural", achieved: true },
      { metric: "User testing feedback >4.5/5", achieved: true }
    ]
  },
  {
    number: 15,
    name: "Accessibility - Color & Contrast",
    category: "accessibility",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Contrast Audit", status: "completed" },
      { item: "Color Blindness Testing", status: "completed" }
    ],
    successCriteria: [
      { metric: "All text meets WCAG AA contrast", achieved: true },
      { metric: "Color blindness simulator passes", achieved: true }
    ]
  },
  {
    number: 16,
    name: "QA Testing - Full Regression",
    category: "testing",
    status: "completed",
    completionPercentage: 100,
    deliverables: [
      { item: "Core Functionality Testing", status: "completed" },
      { item: "Browser Compatibility Testing", status: "completed" },
      { item: "Device Testing", status: "completed" }
    ],
    successCriteria: [
      { metric: "Zero critical bugs", achieved: true },
      { metric: "<5 high-priority bugs", achieved: true },
      { metric: "All browsers supported", achieved: true }
    ]
  }
];

const CATEGORY_CONFIG = {
  performance: { color: "bg-blue-600", icon: Zap },
  mobile: { color: "bg-purple-600", icon: Smartphone },
  accessibility: { color: "bg-green-600", icon: Shield },
  infrastructure: { color: "bg-amber-600", icon: BarChart3 },
  testing: { color: "bg-red-600", icon: TestTube }
};

export default function SprintTracker() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredSprints = selectedCategory === "all" 
    ? SPRINTS_DATA 
    : SPRINTS_DATA.filter(s => s.category === selectedCategory);

  const overallStats = {
    total: SPRINTS_DATA.length,
    completed: SPRINTS_DATA.filter(s => s.status === "completed").length,
    avgCompletion: Math.round(SPRINTS_DATA.reduce((sum, s) => sum + s.completionPercentage, 0) / SPRINTS_DATA.length)
  };

  const categoryStats = Object.entries(
    SPRINTS_DATA.reduce((acc, sprint) => {
      if (!acc[sprint.category]) acc[sprint.category] = { total: 0, completed: 0 };
      acc[sprint.category].total++;
      if (sprint.status === "completed") acc[sprint.category].completed++;
      return acc;
    }, {})
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Sprint Tracker</h1>
                <p className="text-slate-600">Sprints 1-16: Foundation & Optimization</p>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="border-2 border-green-500 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle2 className="w-5 h-5" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-4xl font-bold text-slate-900">{overallStats.completed}/{overallStats.total}</div>
                <div className="text-sm text-slate-600 mt-1">Sprints Completed</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <div className="text-4xl font-bold text-green-900">{overallStats.avgCompletion}%</div>
                <div className="text-sm text-green-700 mt-1">Average Completion</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <div className="text-sm text-green-700">All Sprints Complete</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-colors",
                  selectedCategory === "all" 
                    ? "bg-slate-900 text-white" 
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                All Sprints
              </button>
              {categoryStats.map(([category, stats]) => {
                const Icon = CATEGORY_CONFIG[category].icon;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
                      selectedCategory === category 
                        ? `${CATEGORY_CONFIG[category].color} text-white` 
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {category} ({stats.completed}/{stats.total})
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sprint Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSprints.map((sprint) => {
            const Icon = CATEGORY_CONFIG[sprint.category].icon;
            return (
              <Card key={sprint.number}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", CATEGORY_CONFIG[sprint.category].color)}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Sprint {sprint.number}</CardTitle>
                        <p className="text-sm text-slate-600">{sprint.name}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-600 text-white">
                      {sprint.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-slate-600">Completion</span>
                      <span className="font-semibold text-slate-900">{sprint.completionPercentage}%</span>
                    </div>
                    <Progress value={sprint.completionPercentage} className="h-2" />
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">Deliverables</h4>
                    <div className="space-y-1">
                      {sprint.deliverables.map((deliverable, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-slate-700">{deliverable.item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">Success Criteria</h4>
                    <div className="space-y-1">
                      {sprint.successCriteria.map((criteria, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          {criteria.achieved ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          )}
                          <span className="text-slate-700">{criteria.metric}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}