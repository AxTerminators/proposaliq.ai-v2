import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingDown, Package, Image, Database, Clock, CheckCircle2, AlertTriangle, Info } from "lucide-react";

const PERFORMANCE_PLAN = [
  {
    id: 1,
    name: "React Query Caching Optimization",
    status: "planned",
    priority: "high",
    impact: "Reduce API calls by 60-70%",
    category: "caching",
    issues: [
      "Proposal lists refetch on every navigation",
      "Organization data fetched multiple times",
      "No stale time configured",
      "Missing cache invalidation strategy"
    ],
    solutions: [
      "Add staleTime: 5 minutes for proposal lists",
      "Add staleTime: 10 minutes for organization data",
      "Add cacheTime: 30 minutes for rarely changing data",
      "Implement optimistic updates for mutations",
      "Add proper invalidation on mutations"
    ],
    files: [
      "pages/Dashboard.js",
      "pages/Pipeline.js",
      "pages/Resources.js",
      "pages/Team.js"
    ]
  },
  {
    id: 2,
    name: "Lazy Load Heavy Components",
    status: "planned",
    priority: "high",
    impact: "Reduce initial bundle size by ~30%",
    category: "code-splitting",
    issues: [
      "ProposalBuilder loaded on every page",
      "Modal components bundled even when not used",
      "Chart libraries loaded upfront",
      "Rich text editor loaded on dashboard"
    ],
    solutions: [
      "React.lazy() for ProposalBuilder",
      "React.lazy() for all modal dialogs",
      "Dynamic import for recharts",
      "Dynamic import for react-quill",
      "Suspense boundaries with fallbacks"
    ],
    targetComponents: [
      "ProposalBuilder",
      "WorkflowConfigEditor",
      "PricingModule",
      "BoardConfigDialog",
      "DynamicModal",
      "AIAssistedWriterPage"
    ]
  },
  {
    id: 3,
    name: "Debounce Search & Filters",
    status: "planned",
    priority: "medium",
    impact: "Reduce unnecessary renders by 80%",
    category: "optimization",
    issues: [
      "GlobalSearch triggers on every keystroke",
      "Table filters cause immediate re-renders",
      "Kanban card search not debounced"
    ],
    solutions: [
      "Add 300ms debounce to search inputs",
      "Add 500ms debounce to filters",
      "Use lodash.debounce consistently",
      "Memoize filter functions"
    ],
    files: [
      "components/proposals/GlobalSearch.js",
      "pages/Pipeline.js",
      "components/proposals/ProposalsTable.js"
    ]
  },
  {
    id: 4,
    name: "Virtualize Long Lists",
    status: "analysis",
    priority: "medium",
    impact: "Improve performance for 100+ items",
    category: "optimization",
    issues: [
      "Proposals table renders all rows",
      "Resource library shows all items",
      "Team member lists not virtualized"
    ],
    solutions: [
      "Implement react-window for tables",
      "Add pagination to resource library",
      "Virtualize dropdown menus with many items"
    ],
    concerns: [
      "⚠️ Requires installing react-window",
      "⚠️ May need UI adjustments",
      "⚠️ Test with keyboard navigation"
    ]
  },
  {
    id: 5,
    name: "Optimize Images",
    status: "planned",
    priority: "low",
    impact: "Reduce page load time by 20-30%",
    category: "assets",
    issues: [
      "Logo loaded as full-size PNG",
      "No lazy loading for images",
      "No width/height attributes"
    ],
    solutions: [
      "Add loading='lazy' to all images",
      "Add explicit width/height",
      "Use WebP format where possible",
      "Implement image optimization function"
    ],
    files: [
      "Layout.js",
      "pages/LandingPage.js"
    ]
  },
  {
    id: 6,
    name: "Memoization Strategy",
    status: "planned",
    priority: "medium",
    impact: "Reduce re-renders by 40%",
    category: "optimization",
    issues: [
      "KanbanCard re-renders on every parent update",
      "Navigation items recalculated constantly",
      "Filter functions recreated on every render"
    ],
    solutions: [
      "React.memo() for KanbanCard",
      "useMemo() for expensive calculations",
      "useCallback() for event handlers",
      "Memoize navigation items"
    ],
    files: [
      "components/proposals/KanbanCard.js",
      "components/layout/useNavigationItems.js",
      "components/proposals/ProposalsKanban.js"
    ]
  },
  {
    id: 7,
    name: "Reduce Bundle Size",
    status: "analysis",
    priority: "low",
    impact: "Target: <500kb main bundle",
    category: "bundle",
    largeLibraries: [
      "react-quill: ~150kb",
      "recharts: ~120kb",
      "@dnd-kit: ~80kb",
      "lucide-react: icons not tree-shaken properly"
    ],
    solutions: [
      "Lazy load react-quill",
      "Lazy load recharts",
      "Code split by route",
      "Ensure tree-shaking works"
    ]
  }
];

export default function Phase6Performance() {
  const plannedCount = PERFORMANCE_PLAN.filter(p => p.status === "planned").length;
  const analysisCount = PERFORMANCE_PLAN.filter(p => p.status === "analysis").length;
  const highPriorityCount = PERFORMANCE_PLAN.filter(p => p.priority === "high").length;

  const categoryGroups = PERFORMANCE_PLAN.reduce((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const getCategoryIcon = (category) => {
    switch(category) {
      case "caching": return Database;
      case "code-splitting": return Package;
      case "optimization": return Zap;
      case "assets": return Image;
      case "bundle": return TrendingDown;
      default: return Clock;
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case "caching": return "text-blue-600";
      case "code-splitting": return "text-purple-600";
      case "optimization": return "text-green-600";
      case "assets": return "text-orange-600";
      case "bundle": return "text-red-600";
      default: return "text-slate-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Phase 6: Performance Optimization</h1>
              <p className="text-slate-600">Lazy loading, caching, and code splitting</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Ready to Implement</p>
                  <p className="text-2xl font-bold text-slate-900">{plannedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">High Priority</p>
                  <p className="text-2xl font-bold text-slate-900">{highPriorityCount}</p>
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
                  <p className="text-sm text-slate-600">Under Analysis</p>
                  <p className="text-2xl font-bold text-slate-900">{analysisCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Goals */}
        <Card className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-yellow-900 mb-3">🎯 Performance Goals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-yellow-800 mb-1">Initial Load Time:</p>
                <p className="text-xs text-yellow-700">Current: ~2-3s → Target: &lt;1.5s</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-yellow-800 mb-1">Bundle Size:</p>
                <p className="text-xs text-yellow-700">Current: ~800kb → Target: &lt;500kb</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-yellow-800 mb-1">API Calls:</p>
                <p className="text-xs text-yellow-700">Reduce by 60-70% with caching</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-yellow-800 mb-1">Re-renders:</p>
                <p className="text-xs text-yellow-700">Reduce unnecessary renders by 50%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optimization Categories */}
        <div className="space-y-6">
          {Object.entries(categoryGroups).map(([category, items]) => {
            const Icon = getCategoryIcon(category);
            const colorClass = getCategoryColor(category);
            
            return (
              <Card key={category} className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 capitalize">
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    {category === "code-splitting" ? "Code Splitting" : category}
                    <Badge variant="secondary">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="p-4 bg-slate-50 rounded-lg border">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900">{item.name}</h4>
                              <Badge className={
                                item.status === "planned" ? "bg-green-600 text-white" :
                                item.status === "analysis" ? "bg-blue-600 text-white" :
                                "bg-slate-400 text-white"
                              }>
                                {item.status.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className={
                                item.priority === "high" ? "border-red-500 text-red-700" :
                                item.priority === "medium" ? "border-orange-500 text-orange-700" :
                                "border-slate-400 text-slate-600"
                              }>
                                {item.priority?.toUpperCase() || "MEDIUM"}
                              </Badge>
                            </div>
                            {item.impact && (
                              <p className="text-sm text-green-700 font-medium">
                                📊 {item.impact}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Issues */}
                        {item.issues && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Issues:</p>
                            <ul className="space-y-1">
                              {item.issues.map((issue, idx) => (
                                <li key={idx} className="text-xs text-red-600 flex items-start gap-2">
                                  <span className="text-red-500">•</span>
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Solutions */}
                        {item.solutions && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Solutions:</p>
                            <ul className="space-y-1">
                              {item.solutions.map((solution, idx) => (
                                <li key={idx} className="text-xs text-green-600 flex items-start gap-2">
                                  <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                  {solution}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Target Components */}
                        {item.targetComponents && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Target Components:</p>
                            <div className="flex flex-wrap gap-2">
                              {item.targetComponents.map((comp) => (
                                <Badge key={comp} variant="outline" className="text-xs">
                                  {comp}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Large Libraries */}
                        {item.largeLibraries && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Large Libraries:</p>
                            <ul className="space-y-1">
                              {item.largeLibraries.map((lib, idx) => (
                                <li key={idx} className="text-xs text-slate-600 font-mono">
                                  {lib}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Files */}
                        {item.files && (
                          <div>
                            <p className="text-xs font-semibold text-slate-700 mb-2">Files to Update:</p>
                            <div className="flex flex-wrap gap-2">
                              {item.files.map((file) => (
                                <Badge key={file} className="bg-blue-100 text-blue-700 text-xs font-mono">
                                  {file}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Concerns */}
                        {item.concerns && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                            <p className="text-xs font-semibold text-amber-800 mb-1">Concerns:</p>
                            <ul className="space-y-1">
                              {item.concerns.map((concern, idx) => (
                                <li key={idx} className="text-xs text-amber-700">
                                  {concern}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Implementation Order */}
        <Card className="mt-8 bg-blue-50 border-2 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">📋 Recommended Implementation Order</h3>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <Badge className="bg-blue-600 text-white">1</Badge>
                <div>
                  <p className="font-semibold text-blue-900">React Query Caching</p>
                  <p className="text-sm text-blue-700">Biggest immediate impact, low risk</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Badge className="bg-blue-600 text-white">2</Badge>
                <div>
                  <p className="font-semibold text-blue-900">Debounce Search & Filters</p>
                  <p className="text-sm text-blue-700">Quick wins, improves UX significantly</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Badge className="bg-blue-600 text-white">3</Badge>
                <div>
                  <p className="font-semibold text-blue-900">Lazy Load Heavy Components</p>
                  <p className="text-sm text-blue-700">Reduces initial bundle, requires testing</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Badge className="bg-blue-600 text-white">4</Badge>
                <div>
                  <p className="font-semibold text-blue-900">Memoization Strategy</p>
                  <p className="text-sm text-blue-700">Reduces re-renders, needs careful implementation</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Badge className="bg-blue-600 text-white">5</Badge>
                <div>
                  <p className="font-semibold text-blue-900">Optimize Images</p>
                  <p className="text-sm text-blue-700">Easy wins for page load time</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Badge className="bg-blue-600 text-white">6</Badge>
                <div>
                  <p className="font-semibold text-blue-900">Virtualize Lists (if needed)</p>
                  <p className="text-sm text-blue-700">Only if users have 100+ items regularly</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}