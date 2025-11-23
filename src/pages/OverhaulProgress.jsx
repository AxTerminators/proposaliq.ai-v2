import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PHASES = [
  {
    phase: 0,
    name: "Preparation & Backup",
    status: "in_progress", // in_progress | completed | pending
    tasks: [
      { name: "Create backup utilities", completed: true },
      { name: "Export all entity data", completed: false },
      { name: "Document current system state", completed: false },
      { name: "Create rollback procedures", completed: false }
    ],
    risk: "low",
    estimatedDays: "3-5 days"
  },
  {
    phase: 1,
    name: "Safe Deletions",
    status: "pending",
    tasks: [
      { name: "Delete legacy pages (5 pages)", completed: false },
      { name: "Delete testing pages (6 pages)", completed: false },
      { name: "Remove migration functions (8 functions)", completed: false },
      { name: "Consolidate roadmap pages (4→1)", completed: false },
      { name: "Update navigation", completed: false }
    ],
    risk: "low",
    estimatedDays: "3-4 days"
  },
  {
    phase: 2,
    name: "Critical Bug Fixes",
    status: "pending",
    tasks: [
      { name: "Fix organization switching (single source of truth)", completed: false },
      { name: "Consolidate RAG ingestion", completed: false },
      { name: "Simplify navigation visibility logic", completed: false },
      { name: "Test org switching thoroughly", completed: false }
    ],
    risk: "high",
    estimatedDays: "5-7 days"
  },
  {
    phase: 3,
    name: "Component Consolidation",
    status: "pending",
    tasks: [
      { name: "Merge proposal views (3→1)", completed: false },
      { name: "Consolidate export dialogs (3→1)", completed: false },
      { name: "Simplify pricing components", completed: false },
      { name: "Consolidate modal builders", completed: false }
    ],
    risk: "medium",
    estimatedDays: "5-6 days"
  },
  {
    phase: 4,
    name: "Feature Deprecation",
    status: "pending",
    tasks: [
      { name: "Add feature flags to Subscription", completed: false },
      { name: "Wrap non-essential features", completed: false },
      { name: "Create FeatureLockedCard component", completed: false },
      { name: "Update documentation", completed: false }
    ],
    risk: "low",
    estimatedDays: "3-4 days"
  },
  {
    phase: 5,
    name: "Entity Consolidation",
    status: "pending",
    tasks: [
      { name: "Merge resource entities", completed: false },
      { name: "Simplify pricing entities (JSON storage)", completed: false },
      { name: "Merge activity entities", completed: false },
      { name: "Delete unused entities (15+)", completed: false }
    ],
    risk: "critical",
    estimatedDays: "10-12 days"
  },
  {
    phase: 6,
    name: "Performance Optimization",
    status: "pending",
    tasks: [
      { name: "Implement lazy loading", completed: false },
      { name: "Add query optimization (React Query)", completed: false },
      { name: "Image optimization", completed: false },
      { name: "Code splitting", completed: false },
      { name: "Debounce search inputs", completed: false }
    ],
    risk: "low",
    estimatedDays: "5-6 days"
  },
  {
    phase: 7,
    name: "Mobile Optimization",
    status: "pending",
    tasks: [
      { name: "Redesign priority pages for mobile", completed: false },
      { name: "Touch optimization (44px targets)", completed: false },
      { name: "Responsive forms", completed: false },
      { name: "Fix mobile navigation", completed: false }
    ],
    risk: "medium",
    estimatedDays: "5-7 days"
  },
  {
    phase: 8,
    name: "Accessibility & Polish",
    status: "pending",
    tasks: [
      { name: "Accessibility audit (WCAG AA)", completed: false },
      { name: "Error handling components", completed: false },
      { name: "Loading states", completed: false },
      { name: "Empty states", completed: false },
      { name: "Keyboard shortcuts", completed: false }
    ],
    risk: "low",
    estimatedDays: "4-5 days"
  },
  {
    phase: 9,
    name: "Documentation & Cleanup",
    status: "pending",
    tasks: [
      { name: "Create external knowledge base", completed: false },
      { name: "Add in-app contextual help", completed: false },
      { name: "Final code review", completed: false },
      { name: "Regression testing", completed: false }
    ],
    risk: "low",
    estimatedDays: "5-6 days"
  },
  {
    phase: 10,
    name: "Launch Prep",
    status: "pending",
    tasks: [
      { name: "Setup error monitoring", completed: false },
      { name: "Setup analytics", completed: false },
      { name: "Final validation checklist", completed: false },
      { name: "Deploy to production", completed: false }
    ],
    risk: "medium",
    estimatedDays: "3-4 days"
  }
];

export default function OverhaulProgress() {
  const completedPhases = PHASES.filter(p => p.status === "completed").length;
  const inProgressPhases = PHASES.filter(p => p.status === "in_progress").length;
  const totalTasks = PHASES.reduce((sum, p) => sum + p.tasks.length, 0);
  const completedTasks = PHASES.reduce((sum, p) => sum + p.tasks.filter(t => t.completed).length, 0);

  const getRiskColor = (risk) => {
    switch (risk) {
      case "low": return "bg-green-100 text-green-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "high": return "bg-orange-100 text-orange-700";
      case "critical": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">GovHQ.ai Overhaul Progress</h1>
          <p className="text-slate-600">Complete system cleanup, consolidation, and optimization</p>
        </div>

        {/* Overall Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Phases Complete</p>
              <p className="text-3xl font-bold text-slate-900">{completedPhases}/{PHASES.length}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">{inProgressPhases}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Tasks Complete</p>
              <p className="text-3xl font-bold text-green-600">{completedTasks}/{totalTasks}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <p className="text-sm text-slate-600 mb-1">Overall Progress</p>
              <p className="text-3xl font-bold text-purple-600">
                {Math.round((completedTasks / totalTasks) * 100)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Phases */}
        <div className="space-y-4">
          {PHASES.map((phase) => {
            const completedTaskCount = phase.tasks.filter(t => t.completed).length;
            const progress = (completedTaskCount / phase.tasks.length) * 100;

            return (
              <Card
                key={phase.phase}
                className={cn(
                  "border-2 transition-all",
                  phase.status === "completed" && "border-green-300 bg-green-50",
                  phase.status === "in_progress" && "border-blue-300 bg-blue-50",
                  phase.status === "pending" && "border-slate-200"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {phase.status === "completed" && (
                        <CheckCircle2 className="w-6 h-6 text-green-600 mt-1" />
                      )}
                      {phase.status === "in_progress" && (
                        <Clock className="w-6 h-6 text-blue-600 mt-1 animate-pulse" />
                      )}
                      {phase.status === "pending" && (
                        <Circle className="w-6 h-6 text-slate-400 mt-1" />
                      )}
                      <div>
                        <CardTitle className="text-xl">
                          Phase {phase.phase}: {phase.name}
                        </CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          {completedTaskCount}/{phase.tasks.length} tasks • {phase.estimatedDays}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getRiskColor(phase.risk)}>
                        {phase.risk} risk
                      </Badge>
                      {phase.status === "completed" && (
                        <Badge className="bg-green-100 text-green-700">Complete</Badge>
                      )}
                      {phase.status === "in_progress" && (
                        <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        phase.status === "completed" && "bg-green-600",
                        phase.status === "in_progress" && "bg-blue-600",
                        phase.status === "pending" && "bg-slate-400"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2">
                    {phase.tasks.map((task, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                        <span className={cn(
                          task.completed ? "text-slate-600 line-through" : "text-slate-900"
                        )}>
                          {task.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Success Metrics */}
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-purple-900">Success Metrics (Target)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-purple-900 mb-2">Code Health</p>
                <ul className="space-y-1 text-purple-800">
                  <li>• Pages: 60 → 30-35</li>
                  <li>• Functions: 40 → 20-25</li>
                  <li>• Lines: -30-40%</li>
                  <li>• Entities: -10-15</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-purple-900 mb-2">Performance</p>
                <ul className="space-y-1 text-purple-800">
                  <li>• Page Load: &lt;3s (target &lt;2s)</li>
                  <li>• TTI: &lt;5s (target &lt;3s)</li>
                  <li>• Lighthouse: &gt;85 (target &gt;90)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-purple-900 mb-2">User Experience</p>
                <ul className="space-y-1 text-purple-800">
                  <li>• Mobile: 100% touch-friendly</li>
                  <li>• Error Rate: &lt;1%</li>
                  <li>• WCAG AA compliant</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}