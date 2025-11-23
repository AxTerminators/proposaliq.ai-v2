import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Zap, 
  Smartphone, 
  Shield, 
  BookOpen, 
  Rocket,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Target,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const IMPLEMENTATION_PHASES = [
  {
    id: 1,
    name: "Sprint 1: Performance Foundation",
    duration: "1 week",
    priority: "critical",
    status: "ready",
    dependencies: [],
    team: ["Lead Developer", "QA Engineer"],
    deliverables: [
      {
        task: "React Query Caching Configuration",
        description: "Add staleTime and cacheTime to all data queries",
        files: [
          "pages/Dashboard.js",
          "pages/Pipeline.js", 
          "pages/Resources.js",
          "pages/Team.js",
          "pages/Calendar.js",
          "pages/ProposalBuilder.js"
        ],
        effort: "8 hours",
        impact: "60-70% reduction in API calls",
        implementation: [
          "Add staleTime: 5 * 60 * 1000 (5 minutes) to proposal/organization queries",
          "Add cacheTime: 30 * 60 * 1000 (30 minutes) for static data",
          "Implement optimistic updates for mutations",
          "Add proper cache invalidation on mutations"
        ],
        testing: [
          "Verify data freshness on navigation",
          "Test cache invalidation on updates",
          "Monitor API call reduction in DevTools"
        ]
      },
      {
        task: "Search Debouncing",
        description: "Add 300ms debounce to all search inputs",
        files: [
          "components/proposals/GlobalSearch.js",
          "pages/Pipeline.js",
          "components/proposals/ProposalsTable.js",
          "pages/Resources.js"
        ],
        effort: "4 hours",
        impact: "80% reduction in unnecessary renders",
        implementation: [
          "Import lodash.debounce",
          "Wrap search handlers with debounce(fn, 300)",
          "Add filter debounce with debounce(fn, 500)",
          "Memoize filter functions with useMemo"
        ]
      },
      {
        task: "Image Optimization",
        description: "Optimize logo and add lazy loading to all images",
        files: ["Layout.js", "pages/LandingPage.js"],
        effort: "2 hours",
        impact: "20-30% faster page load",
        implementation: [
          "Add loading='lazy' to all <img> tags",
          "Add explicit width/height attributes",
          "Optimize logo image file"
        ]
      }
    ],
    successCriteria: [
      "Dashboard loads in <1.5s",
      "API calls reduced by 50%+",
      "Search inputs feel responsive",
      "Lighthouse Performance score >85"
    ]
  },
  {
    id: 2,
    name: "Sprint 2: Code Splitting & Lazy Loading",
    duration: "1 week",
    priority: "critical",
    status: "blocked",
    dependencies: ["Sprint 1"],
    team: ["Lead Developer"],
    deliverables: [
      {
        task: "Lazy Load Heavy Components",
        description: "Implement React.lazy for large components",
        files: [
          "pages/ProposalBuilder.js",
          "pages/Pipeline.js",
          "components/proposals/WorkflowConfigEditor.js",
          "components/pricing/PricingModule.js"
        ],
        effort: "12 hours",
        impact: "30% reduction in initial bundle size",
        implementation: [
          "const ProposalBuilder = React.lazy(() => import('./pages/ProposalBuilder'))",
          "Wrap lazy components in <Suspense fallback={<LoadingState />}>",
          "Lazy load all modal dialogs",
          "Dynamic import for recharts in Analytics",
          "Dynamic import for react-quill in content editor"
        ]
      },
      {
        task: "Route-Based Code Splitting",
        description: "Split code by routes automatically",
        files: ["App.js routing configuration"],
        effort: "4 hours",
        impact: "Smaller initial bundle per route"
      }
    ],
    successCriteria: [
      "Initial bundle <500kb",
      "ProposalBuilder loads on demand",
      "No white screen during lazy load"
    ]
  },
  {
    id: 3,
    name: "Sprint 3: Mobile Touch Targets - Critical Fixes",
    duration: "1 week",
    priority: "critical",
    status: "blocked",
    dependencies: ["Sprint 1"],
    team: ["Frontend Developer", "UX Designer"],
    deliverables: [
      {
        task: "Fix Navigation Touch Targets",
        description: "Increase all header and navigation buttons to 44x44px",
        files: [
          "Layout.js",
          "components/mobile/MobileNavigation.js",
          "components/layout/OrganizationSwitcher.js"
        ],
        effort: "6 hours",
        impact: "50% improvement in mobile usability",
        implementation: [
          "Update hamburger menu: className='min-h-[44px] min-w-[44px]'",
          "Update search button: size='icon' className='h-11 w-11'",
          "Update notification bell: h-11 w-11",
          "Update all sidebar icon buttons: h-11 w-11 or larger",
          "Add padding around touch targets: gap-2 minimum"
        ]
      },
      {
        task: "Fix Card and List Touch Targets",
        description: "Ensure all interactive elements meet 44x44px minimum",
        files: [
          "components/proposals/KanbanCard.js",
          "components/proposals/ProposalsList.js",
          "components/dashboard/*.js"
        ],
        effort: "8 hours",
        implementation: [
          "Action buttons: min-h-[44px] min-w-[44px]",
          "List items: min-h-[48px]",
          "Card action icons: h-10 w-10 minimum",
          "Increase spacing between buttons: gap-2 or gap-3"
        ]
      },
      {
        task: "Fix Modal and Form Touch Targets",
        description: "Optimize modals and forms for touch",
        files: [
          "components/ui/dialog.js",
          "components/proposals/modals/*.js"
        ],
        effort: "6 hours",
        implementation: [
          "Close buttons: h-11 w-11",
          "Form inputs: h-11 minimum",
          "Submit buttons: h-12 on mobile",
          "Increase form field spacing: space-y-4 on mobile"
        ]
      }
    ],
    successCriteria: [
      "All touch targets ≥44x44px",
      "No accidental taps on mobile testing",
      "Mobile usability score >90"
    ]
  },
  {
    id: 4,
    name: "Sprint 4: Basic Accessibility - WCAG Level A",
    duration: "1 week",
    priority: "critical",
    status: "blocked",
    dependencies: ["Sprint 3"],
    team: ["Frontend Developer", "Accessibility Specialist"],
    deliverables: [
      {
        task: "Add Focus Indicators",
        description: "Add visible focus rings to all interactive elements",
        files: ["globals.css", "All component files with buttons"],
        effort: "6 hours",
        impact: "WCAG Level A compliance",
        implementation: [
          "Add global CSS: *:focus-visible { @apply ring-2 ring-blue-500 ring-offset-2 }",
          "Test tab navigation through all pages",
          "Ensure focus order is logical"
        ]
      },
      {
        task: "Add ARIA Labels",
        description: "Add aria-label to all icon-only buttons",
        files: [
          "Layout.js",
          "components/proposals/KanbanCard.js",
          "components/collaboration/NotificationCenter.js",
          "All components with icon buttons"
        ],
        effort: "8 hours",
        implementation: [
          "Logout button: aria-label='Logout'",
          "Menu button: aria-label='Open menu'",
          "Notification bell: aria-label='Notifications'",
          "Search button: aria-label='Search'",
          "All icon buttons need descriptive labels"
        ]
      },
      {
        task: "Modal Focus Management",
        description: "Implement focus trapping in all modals",
        files: ["components/ui/dialog.js"],
        effort: "4 hours",
        implementation: [
          "Auto-focus first input or close button on open",
          "Trap tab focus within modal",
          "Return focus to trigger element on close",
          "Add aria-labelledby and aria-describedby"
        ]
      }
    ],
    successCriteria: [
      "All pages navigable with keyboard only",
      "All icon buttons have ARIA labels",
      "Modal focus properly managed",
      "axe DevTools shows 0 critical issues"
    ]
  },
  {
    id: 5,
    name: "Sprint 5: Monitoring & Error Tracking",
    duration: "3 days",
    priority: "critical",
    status: "blocked",
    dependencies: ["Sprint 1"],
    team: ["Backend Developer", "DevOps"],
    deliverables: [
      {
        task: "Integrate Sentry Error Monitoring",
        description: "Set up Sentry for error tracking",
        files: ["App.js", "All backend functions"],
        effort: "6 hours",
        impact: "Catch 100% of production errors",
        implementation: [
          "Install Sentry SDK",
          "Configure Sentry in App.js with ErrorBoundary",
          "Add Sentry.captureException() to all function try/catch blocks",
          "Set up Slack alerts for critical errors",
          "Configure breadcrumb tracking"
        ]
      },
      {
        task: "Analytics Integration",
        description: "Add Google Analytics 4 or Mixpanel",
        files: ["App.js", "Key user action handlers"],
        effort: "4 hours",
        implementation: [
          "Install GA4 or Mixpanel SDK",
          "Track: proposal_created, proposal_exported, user_signup",
          "Track: page_views, feature_usage",
          "Create analytics dashboard for product team"
        ]
      }
    ],
    successCriteria: [
      "All errors logged to Sentry",
      "Alerts configured for critical errors",
      "Analytics tracking 10+ key events",
      "Weekly metrics report available"
    ]
  },
  {
    id: 6,
    name: "Sprint 6: Entity Consolidation",
    duration: "1 week",
    priority: "high",
    status: "blocked",
    dependencies: ["Sprint 5"],
    team: ["Backend Developer", "Data Architect"],
    deliverables: [
      {
        task: "Create SystemLog Entity",
        description: "Merge ActivityLog and AuditLog into SystemLog",
        files: ["entities/SystemLog.json", "Migration script"],
        effort: "4 hours",
        implementation: [
          "SystemLog already exists (verify schema completeness)",
          "Create migration: copy ActivityLog → SystemLog (log_type='activity')",
          "Create migration: copy AuditLog → SystemLog (log_type='audit')",
          "Update all references to use SystemLog",
          "Deprecate old entities (keep for 30 days)"
        ]
      },
      {
        task: "Extend ProposalResource for AdminData",
        description: "Migrate AdminData types to ProposalResource",
        files: ["entities/ProposalResource.json", "Migration script"],
        effort: "6 hours",
        implementation: [
          "Verify ProposalResource already has admin types in resource_type enum",
          "Create migration script to copy AdminData records",
          "Set organization_id to null for system-wide resources",
          "Update Content Library to show both types",
          "Deprecate AdminData entity"
        ]
      }
    ],
    successCriteria: [
      "All ActivityLog data in SystemLog",
      "All AdminData in ProposalResource",
      "No broken references",
      "Data validated in production"
    ]
  },
  {
    id: 7,
    name: "Sprint 7: Mobile Kanban Redesign",
    duration: "1 week",
    priority: "high",
    status: "blocked",
    dependencies: ["Sprint 3"],
    team: ["Frontend Developer", "UX Designer"],
    deliverables: [
      {
        task: "Mobile-First Kanban View",
        description: "Redesign Kanban for mobile with single-column stacking",
        files: [
          "components/proposals/ProposalsKanban.js",
          "components/proposals/KanbanColumn.js",
          "components/proposals/KanbanCard.js"
        ],
        effort: "16 hours",
        implementation: [
          "Detect mobile: const isMobile = window.innerWidth < 768",
          "Mobile: render columns as vertically stacked accordion",
          "Add swipe left/right to navigate between columns",
          "Bottom sheet for card details instead of modal",
          "Larger drag handles for touch",
          "Collapsible column headers to save space"
        ]
      },
      {
        task: "Table to Card View on Mobile",
        description: "Convert tables to card view on small screens",
        files: [
          "components/proposals/ProposalsTable.js",
          "pages/Team.js",
          "pages/Resources.js"
        ],
        effort: "12 hours",
        implementation: [
          "Add responsive breakpoint: hidden md:table-cell",
          "Create mobile card view component",
          "Swipe-to-reveal actions on cards",
          "Show only essential columns on mobile"
        ]
      }
    ],
    successCriteria: [
      "Kanban usable on iPhone 13",
      "Tables readable on mobile",
      "Touch gestures feel natural",
      "Mobile user testing passes"
    ]
  },
  {
    id: 8,
    name: "Sprint 8: Form Accessibility & Validation",
    duration: "1 week",
    priority: "high",
    status: "blocked",
    dependencies: ["Sprint 4"],
    team: ["Frontend Developer"],
    deliverables: [
      {
        task: "Improve Form Error Handling",
        description: "Connect errors to inputs with ARIA",
        files: [
          "components/ui/input.js",
          "components/ui/textarea.js",
          "components/proposals/modals/*.js"
        ],
        effort: "10 hours",
        implementation: [
          "Add id to each input field",
          "Add <span id='input-error' className='text-red-600 text-sm'>{error}</span>",
          "Add aria-describedby='input-error' to input",
          "Add aria-invalid='true' when error exists",
          "Mark required fields: aria-required='true' and visual asterisk",
          "Add error summary at top of form with links"
        ]
      },
      {
        task: "Inline Validation Feedback",
        description: "Real-time validation as user types",
        files: ["All form components"],
        effort: "8 hours",
        implementation: [
          "Use react-hook-form for validation",
          "Add onBlur validation",
          "Show success checkmarks for valid fields",
          "Debounce validation to avoid flickering"
        ]
      }
    ],
    successCriteria: [
      "Screen readers announce all errors",
      "Required fields clearly marked",
      "Validation feels responsive",
      "Form error rate decreases by 30%"
    ]
  },
  {
    id: 9,
    name: "Sprint 9: Performance - Advanced Optimizations",
    duration: "1 week",
    priority: "high",
    status: "blocked",
    dependencies: ["Sprint 2"],
    team: ["Senior Frontend Developer"],
    deliverables: [
      {
        task: "Component Memoization",
        description: "Add React.memo to frequently re-rendering components",
        files: [
          "components/proposals/KanbanCard.js",
          "components/proposals/KanbanColumn.js",
          "components/dashboard/QuickActionsPanel.js"
        ],
        effort: "8 hours",
        implementation: [
          "export default React.memo(KanbanCard)",
          "Add custom comparison function for complex props",
          "useMemo for expensive calculations",
          "useCallback for event handlers passed as props"
        ]
      },
      {
        task: "List Virtualization",
        description: "Add react-window for long lists (if 100+ items common)",
        files: [
          "components/proposals/ProposalsTable.js",
          "pages/Resources.js"
        ],
        effort: "12 hours",
        impact: "Handle 1000+ items smoothly",
        implementation: [
          "Evaluate: do users regularly have 100+ proposals?",
          "If yes: implement FixedSizeList from react-window",
          "If no: defer this optimization"
        ],
        note: "⚠️ Only implement if needed - adds complexity"
      }
    ],
    successCriteria: [
      "KanbanCard re-renders reduced by 80%",
      "Smooth scrolling with 100+ items",
      "React DevTools shows fewer renders"
    ]
  },
  {
    id: 10,
    name: "Sprint 10: Mobile Forms & Modals",
    duration: "1 week",
    priority: "high",
    status: "blocked",
    dependencies: ["Sprint 7"],
    team: ["Frontend Developer", "UX Designer"],
    deliverables: [
      {
        task: "Full-Screen Modals on Mobile",
        description: "Make modals full-screen on mobile devices",
        files: ["components/ui/dialog.js"],
        effort: "6 hours",
        implementation: [
          "Detect mobile screen size",
          "className='md:max-w-2xl max-w-full md:rounded-lg rounded-none min-h-screen md:min-h-0'",
          "Sticky header and footer on mobile",
          "Scroll content area only"
        ]
      },
      {
        task: "Optimize ProposalBuilder for Mobile",
        description: "Collapsible sidebar, full-width content",
        files: ["pages/ProposalBuilder.js"],
        effort: "10 hours",
        implementation: [
          "Collapsible phase navigation sidebar on mobile",
          "Bottom tab bar for phase switching on mobile",
          "Full-width content area on mobile",
          "Sticky action bar at bottom"
        ]
      }
    ],
    successCriteria: [
      "Modals usable on iPhone SE",
      "ProposalBuilder works on mobile",
      "No horizontal scroll on mobile"
    ]
  },
  {
    id: 11,
    name: "Sprint 11: Accessibility - Screen Readers",
    duration: "1 week",
    priority: "high",
    status: "blocked",
    dependencies: ["Sprint 8"],
    team: ["Frontend Developer", "Accessibility Specialist"],
    deliverables: [
      {
        task: "ARIA Live Regions",
        description: "Add announcements for dynamic content",
        files: [
          "components/collaboration/NotificationCenter.js",
          "pages/Pipeline.js",
          "components/ui/toast.js"
        ],
        effort: "6 hours",
        implementation: [
          "Add <div aria-live='polite' className='sr-only'> for notifications",
          "Add aria-live='assertive' for errors and alerts",
          "Add aria-busy='true' during loading",
          "Announce status changes to screen readers"
        ]
      },
      {
        task: "Semantic HTML Audit",
        description: "Replace divs with proper semantic elements",
        files: ["All pages and components"],
        effort: "8 hours",
        implementation: [
          "Replace clickable divs with <button>",
          "Add <nav role='navigation'> to navigation areas",
          "Ensure <main> wraps page content",
          "Fix heading hierarchy (h1 → h2 → h3)"
        ]
      }
    ],
    successCriteria: [
      "NVDA/JAWS navigation works perfectly",
      "VoiceOver announces all interactions",
      "Semantic HTML score >95%"
    ]
  },
  {
    id: 12,
    name: "Sprint 12: Security & Infrastructure Audit",
    duration: "1 week",
    priority: "critical",
    status: "blocked",
    dependencies: ["Sprint 5"],
    team: ["Backend Developer", "Security Engineer", "DevOps"],
    deliverables: [
      {
        task: "OWASP Security Scan",
        description: "Run security audit and fix vulnerabilities",
        effort: "12 hours",
        implementation: [
          "Run OWASP ZAP against staging environment",
          "Fix identified vulnerabilities",
          "Add security headers (CSP, X-Frame-Options, etc.)",
          "Audit authentication flow",
          "Review file upload security"
        ]
      },
      {
        task: "API Rate Limiting",
        description: "Implement rate limiting on backend functions",
        files: ["All backend functions"],
        effort: "6 hours",
        implementation: [
          "Add rate limiting middleware",
          "Configure: 100 requests per minute per user",
          "Return 429 with Retry-After header",
          "Whitelist internal service calls"
        ]
      },
      {
        task: "Database Backup Verification",
        description: "Test backup and restore procedures",
        effort: "4 hours",
        implementation: [
          "Verify automated daily backups configured",
          "Test restore procedure on staging",
          "Document disaster recovery plan",
          "Set up point-in-time recovery"
        ]
      }
    ],
    successCriteria: [
      "Zero critical security vulnerabilities",
      "Rate limiting prevents abuse",
      "Backup restore tested successfully",
      "Security policy documented"
    ]
  },
  {
    id: 13,
    name: "Sprint 13: Performance Testing & Optimization",
    duration: "1 week",
    priority: "high",
    status: "blocked",
    dependencies: ["Sprint 9"],
    team: ["QA Engineer", "Performance Engineer"],
    deliverables: [
      {
        task: "Lighthouse Audits",
        description: "Run Lighthouse on all major pages and optimize",
        effort: "12 hours",
        implementation: [
          "Audit: Dashboard, Pipeline, ProposalBuilder, Resources, Calendar",
          "Target: Performance >90, Accessibility >90, Best Practices >90",
          "Fix identified issues",
          "Document baseline scores"
        ]
      },
      {
        task: "Load Testing",
        description: "Test with 100+ concurrent users",
        effort: "8 hours",
        implementation: [
          "Use JMeter or k6 for load testing",
          "Simulate 100 concurrent users creating proposals",
          "Measure response times under load",
          "Identify bottlenecks"
        ]
      },
      {
        task: "Core Web Vitals",
        description: "Measure and optimize LCP, FID, CLS",
        effort: "6 hours",
        implementation: [
          "Measure current Core Web Vitals",
          "Target: LCP <2.5s, FID <100ms, CLS <0.1",
          "Optimize largest contentful paint",
          "Prevent layout shifts"
        ]
      }
    ],
    successCriteria: [
      "Lighthouse Performance >90",
      "Handles 100 concurrent users",
      "Core Web Vitals all green",
      "Performance report documented"
    ]
  },
  {
    id: 14,
    name: "Sprint 14: Mobile Gestures & Polish",
    duration: "1 week",
    priority: "medium",
    status: "blocked",
    dependencies: ["Sprint 10"],
    team: ["Frontend Developer"],
    deliverables: [
      {
        task: "Swipe Gestures",
        description: "Add swipe navigation and interactions",
        files: [
          "components/mobile/MobileNavigation.js",
          "components/proposals/KanbanCard.js",
          "components/proposals/ProposalsList.js"
        ],
        effort: "10 hours",
        implementation: [
          "Add swipe-to-go-back gesture",
          "Swipe left/right on cards for actions",
          "Pull-to-refresh on lists",
          "Use touch event handlers or react-swipeable"
        ]
      },
      {
        task: "Mobile-Specific Components",
        description: "Create mobile-optimized versions of complex components",
        files: [
          "components/mobile/MobileProposalBuilder.js",
          "components/mobile/MobileKanbanView.js"
        ],
        effort: "12 hours"
      }
    ],
    successCriteria: [
      "Swipe gestures feel natural",
      "Mobile experience rivals native apps",
      "User testing feedback >4.5/5"
    ]
  },
  {
    id: 15,
    name: "Sprint 15: Accessibility - Color & Contrast",
    duration: "3 days",
    priority: "medium",
    status: "blocked",
    dependencies: ["Sprint 11"],
    team: ["Frontend Developer", "Designer"],
    deliverables: [
      {
        task: "Contrast Audit",
        description: "Audit all text colors for WCAG AA compliance",
        effort: "8 hours",
        implementation: [
          "Use WebAIM Contrast Checker on all text/background combinations",
          "Minimum: 4.5:1 for normal text, 3:1 for large text",
          "Fix: text-slate-400 → text-slate-600 for placeholders",
          "Add icons to status badges (not just color)",
          "Underline links for visibility"
        ]
      },
      {
        task: "Color Blindness Testing",
        description: "Test with color blindness simulator",
        effort: "4 hours",
        implementation: [
          "Test with Chromatic Vision Simulator",
          "Verify status indicators work without color",
          "Add patterns or icons where needed"
        ]
      }
    ],
    successCriteria: [
      "All text meets WCAG AA contrast",
      "Status visible without color",
      "Color blindness simulator passes"
    ]
  },
  {
    id: 16,
    name: "Sprint 16: QA Testing - Full Regression",
    duration: "2 weeks",
    priority: "critical",
    status: "blocked",
    dependencies: ["Sprint 13"],
    team: ["QA Lead", "QA Engineers (2)"],
    deliverables: [
      {
        task: "Core Functionality Testing",
        description: "End-to-end testing of all critical flows",
        effort: "40 hours",
        testCases: [
          "User registration & onboarding",
          "Organization creation & switching",
          "Proposal creation (all types)",
          "Kanban drag & drop",
          "File uploads (all types)",
          "AI features (chat, generation, RAG)",
          "Export functionality",
          "Team collaboration",
          "Client portal access",
          "Permission enforcement"
        ]
      },
      {
        task: "Browser Compatibility Testing",
        description: "Test on all major browsers",
        effort: "16 hours",
        browsers: [
          "Chrome (latest 2 versions)",
          "Firefox (latest 2 versions)",
          "Safari (latest 2 versions)",
          "Edge (latest 2 versions)"
        ]
      },
      {
        task: "Device Testing",
        description: "Test on physical devices",
        effort: "16 hours",
        devices: [
          "Desktop: 1920x1080, 1366x768",
          "Tablet: iPad, Android tablet",
          "Mobile: iPhone 13, Samsung Galaxy S21"
        ]
      }
    ],
    successCriteria: [
      "Zero critical bugs",
      "<5 high-priority bugs",
      "All browsers supported",
      "Mobile experience validated"
    ]
  },
  {
    id: 17,
    name: "Sprint 17: Documentation - User Guides",
    duration: "2 weeks",
    priority: "medium",
    status: "blocked",
    dependencies: ["Sprint 16"],
    team: ["Technical Writer", "Product Manager"],
    deliverables: [
      {
        task: "Core User Guides",
        description: "Write essential how-to guides",
        effort: "40 hours",
        guides: [
          "Getting Started Guide",
          "Creating Your First Proposal",
          "Using the Kanban Board",
          "Team Collaboration Features",
          "AI Writing Assistant Guide",
          "Export & Reporting Guide"
        ]
      },
      {
        task: "Tutorial Videos",
        description: "Record screen capture tutorials",
        effort: "20 hours",
        videos: [
          "Platform Overview (5 min)",
          "Proposal Creation Walkthrough (8 min)",
          "Kanban Workflow Tutorial (10 min)"
        ]
      },
      {
        task: "FAQ Section",
        description: "Build searchable FAQ database",
        effort: "12 hours",
        topics: [
          "Common errors and solutions",
          "Browser compatibility",
          "File upload limits",
          "Permission issues"
        ]
      }
    ],
    successCriteria: [
      "6+ comprehensive user guides published",
      "3+ tutorial videos recorded",
      "FAQ covers 50+ common questions",
      "Documentation searchable"
    ]
  },
  {
    id: 18,
    name: "Sprint 18: Final QA & Launch Prep",
    duration: "1 week",
    priority: "critical",
    status: "blocked",
    dependencies: ["Sprint 16"],
    team: ["All Developers", "Product Manager", "QA Lead"],
    deliverables: [
      {
        task: "Pre-Launch Checklist Execution",
        effort: "Full team effort",
        checklist: [
          "□ All Sprints 1-17 completed",
          "□ Security audit passed",
          "□ Performance testing completed",
          "□ Browser compatibility verified",
          "□ Backup & restore tested",
          "□ Documentation published",
          "□ Monitoring configured",
          "□ Error tracking active",
          "□ Analytics integrated",
          "□ Mobile testing passed",
          "□ Accessibility audit passed"
        ]
      },
      {
        task: "Staging Deployment & Smoke Tests",
        effort: "8 hours",
        implementation: [
          "Deploy to staging environment",
          "Run automated smoke tests",
          "Manual smoke test of critical paths",
          "Load test staging environment"
        ]
      },
      {
        task: "Production Deployment Plan",
        effort: "4 hours",
        implementation: [
          "Document deployment procedure",
          "Define rollback triggers and procedure",
          "Set up monitoring dashboard",
          "Configure alerting (Slack, email)",
          "Assign on-call schedule"
        ]
      }
    ],
    successCriteria: [
      "All checklist items complete",
      "Smoke tests pass",
      "Rollback plan documented",
      "Team ready for launch"
    ]
  },
  {
    id: 19,
    name: "Sprint 19: Documentation - Advanced Content",
    duration: "2 weeks",
    priority: "low",
    status: "blocked",
    dependencies: ["Sprint 17"],
    team: ["Technical Writer", "Developer Advocate"],
    deliverables: [
      {
        task: "API Documentation",
        description: "Document REST API for integrations",
        effort: "30 hours",
        content: [
          "OpenAPI/Swagger specification",
          "Authentication & authorization guide",
          "Entity schemas reference",
          "Webhook configurations",
          "Code examples (JavaScript, Python)",
          "Postman collection"
        ]
      },
      {
        task: "Developer Guide",
        description: "Internal developer documentation",
        effort: "20 hours",
        content: [
          "Architecture overview",
          "Component library reference",
          "State management patterns",
          "Testing strategies",
          "Contributing guide"
        ]
      }
    ],
    successCriteria: [
      "API fully documented",
      "Developer onboarding time <1 day",
      "External developers can integrate"
    ]
  },
  {
    id: 20,
    name: "Post-Launch: Monitoring & Iteration",
    duration: "Ongoing",
    priority: "critical",
    status: "blocked",
    dependencies: ["Sprint 18"],
    team: ["All Teams"],
    activities: [
      {
        phase: "First 24 Hours",
        tasks: [
          "Monitor error rates (target: <0.1%)",
          "Monitor response times (target: <200ms p95)",
          "Monitor user signups and activity",
          "Respond to critical bugs immediately",
          "Collect initial user feedback"
        ]
      },
      {
        phase: "First Week",
        tasks: [
          "Daily metrics review",
          "User feedback analysis",
          "Bug triage and hot fixes",
          "Performance optimization based on real data",
          "Documentation updates based on support tickets"
        ]
      },
      {
        phase: "First Month",
        tasks: [
          "Measure against success criteria",
          "Analyze feature adoption rates",
          "Review NPS scores",
          "Plan next iteration based on data",
          "Celebrate wins with the team! 🎉"
        ]
      }
    ]
  }
];

const SPRINT_SUMMARY = {
  totalSprints: 20,
  totalDuration: "18 weeks (4.5 months)",
  criticalPath: [1, 2, 3, 4, 5, 12, 16, 18],
  parallelizable: [
    { sprints: [6, 7], note: "Entity work can run parallel with mobile redesign" },
    { sprints: [8, 9], note: "Form accessibility can run with performance" },
    { sprints: [11, 15], note: "Different accessibility areas" },
    { sprints: [17, 19], note: "Different documentation types" }
  ]
};

const RISK_FACTORS = [
  {
    risk: "Performance optimizations break existing functionality",
    mitigation: "Comprehensive testing after each sprint",
    severity: "high"
  },
  {
    risk: "Entity migrations cause data loss",
    mitigation: "Full backup before migration, test on staging first",
    severity: "critical"
  },
  {
    risk: "Mobile redesign delays timeline",
    mitigation: "Start with critical components first, iterate",
    severity: "medium"
  },
  {
    risk: "Accessibility work uncovers deeper issues",
    mitigation: "Budget extra time for Phase 4 rework",
    severity: "medium"
  },
  {
    risk: "Documentation takes longer than expected",
    mitigation: "Start with highest-value content, iterate",
    severity: "low"
  }
];

export default function ImplementationRoadmap() {
  const [expandedSprint, setExpandedSprint] = useState(null);

  const completedCount = IMPLEMENTATION_PHASES.filter(p => p.status === "done").length;
  const readyCount = IMPLEMENTATION_PHASES.filter(p => p.status === "ready").length;
  const blockedCount = IMPLEMENTATION_PHASES.filter(p => p.status === "blocked").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Implementation Roadmap</h1>
              <p className="text-slate-600">Detailed execution plan for Phases 5-10</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Total Sprints</p>
                    <p className="text-2xl font-bold text-slate-900">{SPRINT_SUMMARY.totalSprints}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Timeline</p>
                    <p className="text-xl font-bold text-slate-900">18 weeks</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Ready to Start</p>
                    <p className="text-2xl font-bold text-slate-900">{readyCount}</p>
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
                    <p className="text-sm text-slate-600">Critical Path</p>
                    <p className="text-2xl font-bold text-slate-900">{SPRINT_SUMMARY.criticalPath.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Overview */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-indigo-900">Timeline Overview</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-semibold text-indigo-800 mb-1">Duration:</p>
                  <p className="text-lg text-indigo-700">{SPRINT_SUMMARY.totalDuration}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-800 mb-1">Critical Sprints:</p>
                  <p className="text-sm text-indigo-700">
                    {SPRINT_SUMMARY.criticalPath.join(', ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-800 mb-1">Parallelizable:</p>
                  <p className="text-sm text-indigo-700">
                    Sprints can overlap to reduce timeline
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sprints */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Implementation Sprints</h2>
          
          {IMPLEMENTATION_PHASES.map((sprint) => {
            const isExpanded = expandedSprint === sprint.id;
            const Icon = sprint.status === "done" ? CheckCircle2 :
                        sprint.status === "ready" ? Circle :
                        Clock;
            const statusColor = sprint.status === "done" ? "text-green-600" :
                              sprint.status === "ready" ? "text-blue-600" :
                              "text-slate-400";
            const statusBg = sprint.status === "done" ? "bg-green-50 border-green-200" :
                            sprint.status === "ready" ? "bg-blue-50 border-blue-200" :
                            "bg-slate-50 border-slate-200";

            return (
              <Card key={sprint.id} className={cn("border-2 transition-all", statusBg)}>
                <CardHeader>
                  <button
                    onClick={() => setExpandedSprint(isExpanded ? null : sprint.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className={cn("w-6 h-6 mt-1", statusColor)} />
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 mb-2">
                            {sprint.name}
                            <Badge className={
                              sprint.priority === "critical" ? "bg-red-600 text-white" :
                              sprint.priority === "high" ? "bg-orange-600 text-white" :
                              "bg-blue-600 text-white"
                            }>
                              {sprint.priority?.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {sprint.duration}
                            </Badge>
                            {sprint.status === "blocked" && (
                              <Badge variant="outline" className="border-slate-400 text-slate-700">
                                Blocked by: Sprint {sprint.dependencies.join(', ')}
                              </Badge>
                            )}
                          </CardTitle>
                          {sprint.team && (
                            <p className="text-sm text-slate-600">
                              Team: {sprint.team.join(', ')}
                            </p>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-6">
                    {/* Deliverables */}
                    {sprint.deliverables && sprint.deliverables.map((deliverable, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-lg border-2">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 mb-1">{deliverable.task}</h4>
                            <p className="text-sm text-slate-600 mb-2">{deliverable.description}</p>
                            
                            {deliverable.effort && deliverable.impact && (
                              <div className="flex gap-3 mb-3">
                                <Badge variant="outline" className="text-xs">
                                  ⏱️ {deliverable.effort}
                                </Badge>
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  📊 {deliverable.impact}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Implementation Steps */}
                        {deliverable.implementation && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Implementation:</p>
                            <ul className="space-y-1">
                              {deliverable.implementation.map((step, i) => (
                                <li key={i} className="text-xs text-slate-600 ml-4 flex items-start gap-2">
                                  <span className="text-blue-500">→</span>
                                  <span className="flex-1">{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Testing */}
                        {deliverable.testing && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Testing:</p>
                            <ul className="space-y-1">
                              {deliverable.testing.map((test, i) => (
                                <li key={i} className="text-xs text-green-600 ml-4 flex items-start gap-2">
                                  <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                  {test}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Files */}
                        {deliverable.files && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Files to Update:</p>
                            <div className="flex flex-wrap gap-2">
                              {deliverable.files.map((file, i) => (
                                <Badge key={i} variant="outline" className="text-xs font-mono">
                                  {file}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Test Cases */}
                        {deliverable.testCases && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Test Cases:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {deliverable.testCases.map((testCase, i) => (
                                <div key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                  <span className="text-slate-400">□</span>
                                  {testCase}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Browsers/Devices */}
                        {deliverable.browsers && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Browser Testing:</p>
                            <div className="flex flex-wrap gap-2">
                              {deliverable.browsers.map((browser, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{browser}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {deliverable.devices && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Device Testing:</p>
                            <div className="flex flex-wrap gap-2">
                              {deliverable.devices.map((device, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{device}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Guides/Videos/Content */}
                        {deliverable.guides && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Guides to Write:</p>
                            <ul className="space-y-1">
                              {deliverable.guides.map((guide, i) => (
                                <li key={i} className="text-xs text-slate-600 ml-4">• {guide}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {deliverable.videos && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Videos to Record:</p>
                            <ul className="space-y-1">
                              {deliverable.videos.map((video, i) => (
                                <li key={i} className="text-xs text-slate-600 ml-4">• {video}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {deliverable.content && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Content Deliverables:</p>
                            <ul className="space-y-1">
                              {deliverable.content.map((item, i) => (
                                <li key={i} className="text-xs text-slate-600 ml-4">• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {deliverable.checklist && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Checklist:</p>
                            <div className="space-y-1">
                              {deliverable.checklist.map((item, i) => (
                                <div key={i} className="text-xs text-slate-600 ml-4">{item}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {deliverable.note && (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                            {deliverable.note}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Activities (for post-launch) */}
                    {sprint.activities && sprint.activities.map((activity, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-lg border-2">
                        <h4 className="font-bold text-slate-900 mb-3">{activity.phase}</h4>
                        <ul className="space-y-2">
                          {activity.tasks.map((task, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    {/* Success Criteria */}
                    {sprint.successCriteria && (
                      <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                        <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Success Criteria
                        </h4>
                        <ul className="space-y-2">
                          {sprint.successCriteria.map((criteria, i) => (
                            <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              {criteria}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Parallelization Opportunities */}
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Optimization: Parallel Execution
            </h3>
            <p className="text-sm text-blue-800 mb-4">
              These sprints can run in parallel to compress the timeline from 18 weeks to ~12 weeks:
            </p>
            <div className="space-y-3">
              {SPRINT_SUMMARY.parallelizable.map((parallel, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-blue-200">
                  <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">
                      Sprints {parallel.sprints.join(' & ')} can run simultaneously
                    </p>
                    <p className="text-sm text-blue-700">{parallel.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">
                💡 Optimized Timeline: ~12 weeks with parallel execution + dedicated resources
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Risk Management */}
        <Card className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Risk Management
            </h3>
            <div className="space-y-3">
              {RISK_FACTORS.map((risk, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg border-2 border-red-200">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-red-900 flex-1">{risk.risk}</p>
                    <Badge className={
                      risk.severity === "critical" ? "bg-red-600 text-white" :
                      risk.severity === "high" ? "bg-orange-600 text-white" :
                      "bg-yellow-600 text-white"
                    }>
                      {risk.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-green-700">
                    <strong>Mitigation:</strong> {risk.mitigation}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Guide */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Quick Start: Week 1 Action Items
            </h3>
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                <p className="font-semibold text-green-900 mb-2">🎯 Immediate Actions (Start Tomorrow)</p>
                <ol className="space-y-2 ml-4">
                  <li className="text-sm text-green-700">
                    <strong>Day 1-2:</strong> Add React Query caching to Dashboard, Pipeline, ProposalBuilder
                  </li>
                  <li className="text-sm text-green-700">
                    <strong>Day 3:</strong> Debounce search in GlobalSearch and Pipeline
                  </li>
                  <li className="text-sm text-green-700">
                    <strong>Day 4:</strong> Optimize images (logo, lazy loading)
                  </li>
                  <li className="text-sm text-green-700">
                    <strong>Day 5:</strong> Test and validate Sprint 1 deliverables
                  </li>
                </ol>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                <p className="font-semibold text-green-900 mb-2">📋 Required Setup</p>
                <ul className="space-y-1 ml-4">
                  <li className="text-sm text-green-700">□ Create feature branch: <code className="bg-green-100 px-1">feature/sprint-1-performance</code></li>
                  <li className="text-sm text-green-700">□ Set up staging environment for testing</li>
                  <li className="text-sm text-green-700">□ Install monitoring tools (prepare for Sprint 5)</li>
                  <li className="text-sm text-green-700">□ Schedule team kickoff meeting</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-indigo-900 mb-4">🚀 Ready to Begin?</h3>
            <p className="text-sm text-indigo-800 mb-4">
              This roadmap provides a clear path from current state to production-ready platform.
              Each sprint is designed to be completed in 1 week with clear deliverables and success criteria.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
                <p className="font-semibold text-indigo-900 mb-2">Week 1-3</p>
                <p className="text-sm text-indigo-700">Performance foundation + monitoring</p>
              </div>
              <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
                <p className="font-semibold text-indigo-900 mb-2">Week 4-8</p>
                <p className="text-sm text-indigo-700">Mobile optimization + accessibility</p>
              </div>
              <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
                <p className="font-semibold text-indigo-900 mb-2">Week 9-12</p>
                <p className="text-sm text-indigo-700">QA, documentation, launch prep</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}