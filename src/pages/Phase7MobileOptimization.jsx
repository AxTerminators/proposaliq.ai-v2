import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, AlertTriangle, CheckCircle2, Info, Maximize2 } from "lucide-react";

const MOBILE_AUDIT = [
  {
    id: 1,
    area: "Navigation & Header",
    priority: "high",
    status: "needs_work",
    issues: [
      "Hamburger menu button is 40x40px (needs 44x44px)",
      "Organization switcher dropdown too small for touch",
      "Search button in header is 40x40px",
      "Notification bell is small"
    ],
    solutions: [
      "Increase all header buttons to min 44x44px",
      "Add more padding around touch targets",
      "Make organization switcher full-width on mobile"
    ],
    files: ["Layout.js", "components/layout/OrganizationSwitcher.js"]
  },
  {
    id: 2,
    area: "Kanban Board",
    priority: "critical",
    status: "needs_work",
    issues: [
      "Columns don't scroll horizontally well on mobile",
      "Card drag handles too small for touch",
      "Column headers cramped",
      "Cards stack awkwardly in narrow columns"
    ],
    solutions: [
      "Implement single-column mobile view (stacked)",
      "Add swipe gestures for column navigation",
      "Larger tap targets for card actions",
      "Bottom sheet for card details instead of modal"
    ],
    files: [
      "components/proposals/ProposalsKanban.js",
      "components/proposals/KanbanColumn.js",
      "components/proposals/KanbanCard.js"
    ]
  },
  {
    id: 3,
    area: "Tables",
    priority: "high",
    status: "needs_work",
    issues: [
      "Tables overflow on mobile",
      "Too many columns visible",
      "Row actions hard to tap",
      "No responsive card view"
    ],
    solutions: [
      "Switch to card view on mobile",
      "Hide non-essential columns",
      "Larger action buttons",
      "Swipe-to-reveal actions"
    ],
    files: [
      "components/proposals/ProposalsTable.js",
      "pages/Team.js",
      "pages/Resources.js"
    ]
  },
  {
    id: 4,
    area: "Forms & Modals",
    priority: "high",
    status: "needs_work",
    issues: [
      "Modals too wide on mobile",
      "Form inputs too close together",
      "Submit buttons sometimes below fold",
      "Dropdown menus overflow screen"
    ],
    solutions: [
      "Full-screen modals on mobile",
      "Increase spacing between form fields",
      "Sticky footer for action buttons",
      "Better dropdown positioning"
    ],
    files: [
      "components/proposals/modals/*.js",
      "components/ui/dialog.js",
      "components/ui/select.js"
    ]
  },
  {
    id: 5,
    area: "Bottom Navigation",
    priority: "medium",
    status: "implemented",
    issues: [],
    solutions: [
      "✅ Already has MobileNavigation component",
      "✅ Touch targets are adequate",
      "✅ Icons with labels"
    ],
    files: ["components/mobile/MobileNavigation.js"]
  },
  {
    id: 6,
    area: "Cards & Lists",
    priority: "medium",
    status: "needs_work",
    issues: [
      "Dashboard cards too cramped",
      "List items lack adequate spacing",
      "Icons/avatars too small",
      "Action buttons clustered"
    ],
    solutions: [
      "Increase card padding on mobile",
      "Min 48px height for list items",
      "Larger avatars and icons",
      "Spread out action buttons"
    ],
    files: [
      "pages/Dashboard.js",
      "components/proposals/ProposalsList.js",
      "components/dashboard/*.js"
    ]
  },
  {
    id: 7,
    area: "Text & Typography",
    priority: "low",
    status: "mostly_good",
    issues: [
      "Some labels use 11px font (too small)",
      "Dense text blocks hard to read"
    ],
    solutions: [
      "Minimum 12px font size",
      "Increase line height on mobile",
      "Better text contrast"
    ],
    files: ["globals.css"]
  },
  {
    id: 8,
    area: "Gestures & Interactions",
    priority: "high",
    status: "missing",
    issues: [
      "No swipe gestures for navigation",
      "No pull-to-refresh",
      "No long-press context menus",
      "Drag-and-drop not touch-optimized"
    ],
    solutions: [
      "Add swipe-back gesture",
      "Implement pull-to-refresh on lists",
      "Add long-press menus for quick actions",
      "Improve @dnd-kit touch behavior"
    ],
    files: [
      "components/mobile/MobileNavigation.js",
      "components/proposals/ProposalsKanban.js"
    ]
  },
  {
    id: 9,
    area: "ProposalBuilder",
    priority: "critical",
    status: "needs_work",
    issues: [
      "Phase navigation cramped",
      "Sidebar doesn't collapse on mobile",
      "Content area too narrow",
      "Bottom action bar missing"
    ],
    solutions: [
      "Collapsible phase sidebar",
      "Full-width content on mobile",
      "Sticky bottom action bar",
      "Simplified phase indicators"
    ],
    files: [
      "pages/ProposalBuilder.js",
      "components/builder/*.js"
    ]
  },
  {
    id: 10,
    area: "Touch Target Violations",
    priority: "critical",
    status: "needs_audit",
    violations: [
      "Icon-only buttons in sidebars: 32x32px → need 44x44px",
      "Close buttons in modals: 28x28px → need 44x44px",
      "Table row action icons: 24x24px → need larger tap area",
      "Kanban card mini-buttons: 32x32px → need 44x44px",
      "Notification items: 36px height → need 48px",
      "Filter chips: 28px height → need 40px minimum"
    ],
    solution: "Systematic audit and fix of all touch targets < 44x44px"
  }
];

const IMPLEMENTATION_CHECKLIST = [
  {
    phase: "Quick Wins",
    items: [
      "Increase all touch targets to minimum 44x44px",
      "Add mobile-specific padding classes",
      "Fix modal widths for mobile",
      "Increase spacing in forms"
    ]
  },
  {
    phase: "Navigation",
    items: [
      "Optimize header for mobile",
      "Fix organization switcher",
      "Add swipe gestures",
      "Test bottom navigation"
    ]
  },
  {
    phase: "Major Components",
    items: [
      "Refactor Kanban for mobile (single column)",
      "Convert tables to card view on mobile",
      "Optimize ProposalBuilder layout",
      "Full-screen modals on mobile"
    ]
  },
  {
    phase: "Polish",
    items: [
      "Add pull-to-refresh",
      "Implement long-press menus",
      "Better loading states",
      "Test on real devices"
    ]
  }
];

const TOUCH_TARGET_SPECS = {
  minimum: "44x44px",
  recommended: "48x48px",
  spacing: "8px between targets",
  exceptions: "Dense lists can use 40px with extra spacing"
};

export default function Phase7MobileOptimization() {
  const criticalCount = MOBILE_AUDIT.filter(a => a.priority === "critical").length;
  const highCount = MOBILE_AUDIT.filter(a => a.priority === "high").length;
  const needsWorkCount = MOBILE_AUDIT.filter(a => a.status === "needs_work" || a.status === "needs_audit").length;
  const totalIssues = MOBILE_AUDIT.reduce((sum, item) => sum + (item.issues?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Phase 7: Mobile Optimization</h1>
              <p className="text-slate-600">Touch-friendly redesign and mobile UX audit</p>
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
                  <p className="text-sm text-slate-600">Critical Issues</p>
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
                  <p className="text-sm text-slate-600">Areas Needing Work</p>
                  <p className="text-2xl font-bold text-slate-900">{needsWorkCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Maximize2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Issues</p>
                  <p className="text-2xl font-bold text-slate-900">{totalIssues}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Touch Target Specs */}
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-purple-900 mb-3">📏 Touch Target Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-purple-800 mb-1">Minimum Size:</p>
                <p className="text-2xl font-bold text-purple-900">{TOUCH_TARGET_SPECS.minimum}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-800 mb-1">Recommended Size:</p>
                <p className="text-2xl font-bold text-purple-900">{TOUCH_TARGET_SPECS.recommended}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-800 mb-1">Minimum Spacing:</p>
                <p className="text-sm text-purple-700">{TOUCH_TARGET_SPECS.spacing}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-purple-800 mb-1">Exceptions:</p>
                <p className="text-sm text-purple-700">{TOUCH_TARGET_SPECS.exceptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Results */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Mobile UX Audit Results</h2>
          {MOBILE_AUDIT.map((item) => (
            <Card key={item.id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      {item.area}
                      <Badge className={
                        item.priority === "critical" ? "bg-red-600 text-white" :
                        item.priority === "high" ? "bg-orange-600 text-white" :
                        item.priority === "medium" ? "bg-blue-600 text-white" :
                        "bg-slate-400 text-white"
                      }>
                        {item.priority?.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={
                        item.status === "needs_work" || item.status === "needs_audit" || item.status === "missing"
                          ? "border-red-500 text-red-700"
                          : item.status === "implemented"
                            ? "border-green-500 text-green-700"
                            : "border-blue-500 text-blue-700"
                      }>
                        {item.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Issues */}
                {item.issues && item.issues.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Issues Found:</h4>
                    <ul className="space-y-1">
                      {item.issues.map((issue, idx) => (
                        <li key={idx} className="text-sm text-red-600 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Violations */}
                {item.violations && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Touch Target Violations:</h4>
                    <ul className="space-y-1">
                      {item.violations.map((violation, idx) => (
                        <li key={idx} className="text-sm text-red-600 font-mono">
                          • {violation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Solutions */}
                {item.solutions && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Recommended Solutions:</h4>
                    <ul className="space-y-1">
                      {item.solutions.map((solution, idx) => (
                        <li key={idx} className="text-sm text-green-600 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Files */}
                {item.files && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Files to Update:</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.files.map((file) => (
                        <Badge key={file} className="bg-blue-100 text-blue-700 text-xs font-mono">
                          {file}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {item.solution && (
                  <div className="mt-4 p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                    <p className="text-sm font-semibold text-green-900">{item.solution}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Implementation Checklist */}
        <Card className="bg-blue-50 border-2 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">📋 Implementation Checklist</h3>
            <div className="space-y-4">
              {IMPLEMENTATION_CHECKLIST.map((phase, idx) => (
                <div key={idx}>
                  <h4 className="font-semibold text-blue-800 mb-2">
                    {idx + 1}. {phase.phase}
                  </h4>
                  <ul className="space-y-1 ml-4">
                    {phase.items.map((item, i) => (
                      <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                        <span className="text-blue-500">□</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}