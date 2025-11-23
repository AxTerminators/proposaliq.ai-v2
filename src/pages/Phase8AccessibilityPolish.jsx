import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2, Info, Keyboard, Eye, MousePointer } from "lucide-react";

const ACCESSIBILITY_AUDIT = [
  {
    id: 1,
    area: "Keyboard Navigation",
    priority: "critical",
    status: "needs_work",
    wcagLevel: "A",
    issues: [
      "No visible focus indicators on many interactive elements",
      "Tab order not logical in modals and forms",
      "Kanban cards not keyboard accessible",
      "Dropdown menus don't respond to arrow keys",
      "No keyboard shortcuts documented",
      "Focus lost when opening/closing modals"
    ],
    solutions: [
      "Add focus:ring-2 focus:ring-blue-500 to all interactive elements",
      "Implement logical tab order with tabIndex",
      "Add keyboard handlers for Kanban (Enter to open, Arrow keys to navigate)",
      "Add aria-keyshortcuts for common actions",
      "Trap focus in modals, restore on close",
      "Add keyboard shortcut guide (? key)"
    ],
    testingSteps: [
      "Navigate entire app with Tab key only",
      "Test all forms with keyboard",
      "Verify modal focus trapping",
      "Test dropdown navigation with arrows"
    ]
  },
  {
    id: 2,
    area: "Screen Reader Support",
    priority: "critical",
    status: "needs_work",
    wcagLevel: "A",
    issues: [
      "Missing ARIA labels on icon-only buttons",
      "No ARIA live regions for dynamic content",
      "Status changes not announced",
      "Modal dialogs lack aria-labelledby",
      "Form errors not associated with inputs",
      "Loading states not announced"
    ],
    solutions: [
      "Add aria-label to all icon-only buttons",
      "Add aria-live='polite' for notifications",
      "Add aria-live='assertive' for errors",
      "Add proper modal ARIA attributes",
      "Connect errors to inputs with aria-describedby",
      "Add aria-busy during loading"
    ],
    testingSteps: [
      "Test with NVDA/JAWS on Windows",
      "Test with VoiceOver on Mac/iOS",
      "Verify all interactive elements are announced",
      "Test form validation announcements"
    ]
  },
  {
    id: 3,
    area: "Color & Contrast",
    priority: "high",
    status: "needs_audit",
    wcagLevel: "AA",
    issues: [
      "Some text colors may not meet 4.5:1 contrast ratio",
      "Placeholder text too light (text-slate-400)",
      "Disabled button states unclear",
      "Color-only status indicators (need icons too)",
      "Link colors not distinct enough"
    ],
    solutions: [
      "Audit all text colors for WCAG AA compliance (4.5:1)",
      "Darken placeholder text to text-slate-600",
      "Add strikethrough or opacity to disabled states",
      "Add icons to status badges (not just color)",
      "Use underline for links, not just color"
    ],
    testingSteps: [
      "Use WebAIM Contrast Checker on all text",
      "Test with color blindness simulator",
      "Verify status indicators without color"
    ]
  },
  {
    id: 4,
    area: "Form Validation & Errors",
    priority: "high",
    status: "needs_work",
    wcagLevel: "A",
    issues: [
      "Error messages not descriptive enough",
      "No inline validation feedback",
      "Success states not clearly communicated",
      "Required fields not marked",
      "Error summary missing at top of forms"
    ],
    solutions: [
      "Add specific error messages (not just 'Invalid')",
      "Show inline validation as user types",
      "Add success checkmarks and messages",
      "Mark required fields with asterisk and aria-required",
      "Add error summary with links to fields"
    ],
    files: [
      "components/ui/input.js",
      "components/ui/textarea.js",
      "components/proposals/modals/*.js"
    ]
  },
  {
    id: 5,
    area: "Loading & Empty States",
    priority: "medium",
    status: "partial",
    wcagLevel: "AA",
    issues: [
      "Some pages show blank screen while loading",
      "Loading spinners lack labels",
      "Empty states could be more helpful",
      "No skeleton loaders for content"
    ],
    solutions: [
      "Add skeleton loaders for all data-heavy pages",
      "Add aria-label='Loading...' to spinners",
      "Improve empty state messaging with actions",
      "Add progress indicators for long operations"
    ],
    existing: [
      "✅ LoadingState component exists",
      "✅ Some skeleton loaders implemented"
    ]
  },
  {
    id: 6,
    area: "Error Handling",
    priority: "high",
    status: "needs_work",
    wcagLevel: "A",
    issues: [
      "Generic error messages ('Something went wrong')",
      "No error recovery suggestions",
      "Errors not logged for debugging",
      "No user-friendly error pages",
      "Network errors not handled gracefully"
    ],
    solutions: [
      "Create specific error messages per error type",
      "Add 'Try again' and 'Contact support' actions",
      "Integrate ErrorMonitor component",
      "Create custom error pages (404, 500, network)",
      "Add retry logic for failed requests"
    ],
    files: [
      "components/ui/ErrorBoundary.js",
      "components/ui/ErrorAlert.js",
      "components/monitoring/ErrorMonitor.js"
    ]
  },
  {
    id: 7,
    area: "Semantic HTML",
    priority: "medium",
    status: "mostly_good",
    wcagLevel: "A",
    issues: [
      "Some divs should be buttons",
      "Missing landmark regions (nav, main, aside)",
      "Heading hierarchy not consistent",
      "Lists not using proper ul/li elements"
    ],
    solutions: [
      "Replace clickable divs with buttons",
      "Add role='navigation' to nav areas",
      "Ensure main content in <main> tag",
      "Review heading order (h1 → h2 → h3)",
      "Use semantic list elements"
    ],
    existing: [
      "✅ Layout already uses proper structure",
      "✅ Most interactive elements are buttons"
    ]
  },
  {
    id: 8,
    area: "Focus Management",
    priority: "high",
    status: "needs_work",
    wcagLevel: "AA",
    issues: [
      "Focus not moved to modals when opened",
      "Focus not returned after modal closes",
      "Skip to main content link missing",
      "Focus visible on hover, not on keyboard focus"
    ],
    solutions: [
      "Auto-focus modal close button or first input",
      "Store and restore focus after modal",
      "Add skip link at page top",
      "Separate hover and focus styles"
    ]
  },
  {
    id: 9,
    area: "Images & Media",
    priority: "medium",
    status: "needs_audit",
    wcagLevel: "A",
    issues: [
      "Some images may lack alt text",
      "Decorative images not marked as such",
      "Icons used without text alternatives"
    ],
    solutions: [
      "Audit all images for alt text",
      "Add alt='' for decorative images",
      "Add sr-only text for icon-only elements",
      "Ensure logo has descriptive alt"
    ]
  },
  {
    id: 10,
    area: "Mobile Accessibility",
    priority: "medium",
    status: "addressed_in_phase7",
    wcagLevel: "AA",
    issues: [],
    solutions: [
      "✅ Touch targets addressed in Phase 7",
      "✅ Mobile navigation implemented",
      "Still need: orientation support, zoom allowance"
    ]
  }
];

const WCAG_COMPLIANCE = {
  levelA: {
    name: "Level A (Minimum)",
    required: true,
    items: [
      "Keyboard accessible",
      "Text alternatives for non-text content",
      "Time-based media alternatives",
      "Adaptable content",
      "Distinguishable content",
      "Navigable",
      "Input assistance"
    ]
  },
  levelAA: {
    name: "Level AA (Target)",
    required: true,
    items: [
      "Contrast ratio 4.5:1 for text",
      "Resize text up to 200%",
      "Images of text avoided",
      "Multiple navigation mechanisms",
      "Headings and labels descriptive",
      "Focus visible",
      "Error identification and suggestions"
    ]
  },
  levelAAA: {
    name: "Level AAA (Enhancement)",
    required: false,
    items: [
      "Contrast ratio 7:1 for text",
      "No time limits",
      "No interruptions",
      "Re-authentication preserves data"
    ]
  }
};

const IMPLEMENTATION_PHASES = [
  {
    phase: "Phase 1: Critical Fixes (1 week)",
    items: [
      "Add focus indicators to all interactive elements",
      "Add ARIA labels to icon-only buttons",
      "Fix keyboard navigation in modals",
      "Add error announcements for screen readers",
      "Implement focus trapping in dialogs"
    ]
  },
  {
    phase: "Phase 2: Forms & Validation (1 week)",
    items: [
      "Improve form error messages",
      "Add inline validation feedback",
      "Mark required fields properly",
      "Connect errors to inputs with ARIA",
      "Add form error summaries"
    ]
  },
  {
    phase: "Phase 3: Color & Contrast (3 days)",
    items: [
      "Audit all text colors with contrast checker",
      "Fix low-contrast text",
      "Add icons to color-coded elements",
      "Update link and button styles"
    ]
  },
  {
    phase: "Phase 4: Polish & Testing (1 week)",
    items: [
      "Add keyboard shortcut guide",
      "Improve loading states",
      "Better empty states",
      "Test with screen readers",
      "Test with keyboard only",
      "Test with color blindness simulator"
    ]
  }
];

const TESTING_TOOLS = [
  {
    name: "axe DevTools",
    purpose: "Automated accessibility testing",
    url: "https://www.deque.com/axe/devtools/"
  },
  {
    name: "WAVE",
    purpose: "Visual accessibility evaluation",
    url: "https://wave.webaim.org/"
  },
  {
    name: "WebAIM Contrast Checker",
    purpose: "Check color contrast ratios",
    url: "https://webaim.org/resources/contrastchecker/"
  },
  {
    name: "NVDA",
    purpose: "Screen reader testing (Windows)",
    url: "https://www.nvaccess.org/"
  },
  {
    name: "VoiceOver",
    purpose: "Screen reader testing (Mac/iOS)",
    url: "Built into macOS and iOS"
  }
];

export default function Phase8AccessibilityPolish() {
  const criticalCount = ACCESSIBILITY_AUDIT.filter(a => a.priority === "critical").length;
  const highCount = ACCESSIBILITY_AUDIT.filter(a => a.priority === "high").length;
  const needsWorkCount = ACCESSIBILITY_AUDIT.filter(a => a.status === "needs_work" || a.status === "needs_audit").length;
  const levelAIssues = ACCESSIBILITY_AUDIT.filter(a => a.wcagLevel === "A").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-teal-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Phase 8: Accessibility & Polish</h1>
              <p className="text-slate-600">WCAG compliance, keyboard navigation, and error handling</p>
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
                  <Keyboard className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">WCAG Level A Issues</p>
                  <p className="text-2xl font-bold text-slate-900">{levelAIssues}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* WCAG Compliance Overview */}
        <Card className="mb-6 bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-green-900 mb-4">♿ WCAG 2.1 Compliance Levels</h3>
            <div className="space-y-4">
              {Object.entries(WCAG_COMPLIANCE).map(([level, data]) => (
                <div key={level}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-green-800">{data.name}</h4>
                    {data.required && (
                      <Badge className="bg-green-600 text-white">Required</Badge>
                    )}
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                    {data.items.map((item, idx) => (
                      <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audit Results */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Accessibility Audit Results</h2>
          {ACCESSIBILITY_AUDIT.map((item) => (
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
                      {item.wcagLevel && (
                        <Badge variant="outline" className="border-purple-500 text-purple-700">
                          WCAG {item.wcagLevel}
                        </Badge>
                      )}
                      <Badge variant="outline" className={
                        item.status === "needs_work" || item.status === "needs_audit"
                          ? "border-red-500 text-red-700"
                          : item.status === "partial" || item.status === "mostly_good"
                            ? "border-blue-500 text-blue-700"
                            : "border-green-500 text-green-700"
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
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      Issues Found:
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
                {item.solutions && item.solutions.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Recommended Solutions:
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

                {/* Existing Good Practices */}
                {item.existing && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      Already Implemented:
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

                {/* Testing Steps */}
                {item.testingSteps && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-600" />
                      Testing Steps:
                    </h4>
                    <ol className="space-y-1">
                      {item.testingSteps.map((step, idx) => (
                        <li key={idx} className="text-sm text-slate-600 ml-6">
                          {idx + 1}. {step}
                        </li>
                      ))}
                    </ol>
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
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Implementation Phases */}
        <Card className="mb-6 bg-blue-50 border-2 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">📋 Implementation Roadmap</h3>
            <div className="space-y-4">
              {IMPLEMENTATION_PHASES.map((phase, idx) => (
                <div key={idx}>
                  <h4 className="font-semibold text-blue-800 mb-2">{phase.phase}</h4>
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

        {/* Testing Tools */}
        <Card className="bg-purple-50 border-2 border-purple-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-purple-900 mb-4">🛠️ Recommended Testing Tools</h3>
            <div className="space-y-3">
              {TESTING_TOOLS.map((tool, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-700 font-bold">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-purple-900">{tool.name}</p>
                    <p className="text-sm text-purple-700">{tool.purpose}</p>
                    {tool.url && (
                      <p className="text-xs text-purple-600 font-mono mt-1">{tool.url}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}