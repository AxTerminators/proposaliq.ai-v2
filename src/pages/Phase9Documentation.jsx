import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, AlertTriangle, CheckCircle2, Info, FileText, Video, Code } from "lucide-react";

const DOCUMENTATION_AUDIT = [
  {
    id: 1,
    area: "User Documentation",
    priority: "critical",
    status: "missing",
    scope: "End Users",
    items: [
      "Getting Started Guide",
      "Dashboard Overview",
      "Creating & Managing Proposals",
      "Using the Kanban Board",
      "Workflow Templates Guide",
      "Team Collaboration Features",
      "Calendar & Tasks Integration",
      "AI Assistant Usage",
      "Content Library Management",
      "Resource & Partner Management",
      "Export & Reporting",
      "Mobile App Guide"
    ],
    deliverables: [
      "Written guides (12 articles)",
      "Screenshot tutorials",
      "Video walkthroughs (5-10 minutes each)",
      "Quick reference cards"
    ]
  },
  {
    id: 2,
    area: "Role-Specific Guides",
    priority: "high",
    status: "missing",
    scope: "Different User Types",
    items: [
      "Administrator Guide (org setup, user management, settings)",
      "Consultant Guide (client management, multi-org workflows)",
      "Proposal Manager Guide (advanced features, automation)",
      "Team Member Guide (collaboration, tasks, reviews)",
      "Client User Guide (portal access, feedback, approvals)"
    ],
    deliverables: [
      "5 comprehensive role-based guides",
      "Permission & feature matrices",
      "Common workflows per role"
    ]
  },
  {
    id: 3,
    area: "Feature Documentation",
    priority: "high",
    status: "partial",
    scope: "Specific Features",
    items: [
      "Kanban Board Configuration",
      "Modal Builder System",
      "RAG-Enhanced AI Writing",
      "Data Calls Management",
      "Past Performance Library",
      "Pricing & Cost Estimation",
      "Client Portal Configuration",
      "Resource Sharing Workflows",
      "Automation Rules"
    ],
    deliverables: [
      "Feature-specific documentation",
      "Configuration examples",
      "Best practices guides"
    ],
    existing: [
      "✅ Some inline help text exists",
      "✅ SystemDocumentation page has technical info"
    ]
  },
  {
    id: 4,
    area: "API Documentation",
    priority: "high",
    status: "missing",
    scope: "Developers & Integrations",
    items: [
      "REST API endpoints reference",
      "Authentication & authorization",
      "Entity schemas and relationships",
      "Backend function documentation",
      "Webhook configurations",
      "Integration SDK examples",
      "Rate limiting & best practices",
      "Error codes & troubleshooting"
    ],
    deliverables: [
      "OpenAPI/Swagger specification",
      "Interactive API explorer",
      "Code examples (JavaScript, Python)",
      "Postman collection"
    ]
  },
  {
    id: 5,
    area: "Developer Guide",
    priority: "medium",
    status: "partial",
    scope: "Platform Developers",
    items: [
      "Architecture overview",
      "Tech stack documentation",
      "Component library reference",
      "State management patterns",
      "Styling guidelines (Tailwind)",
      "Backend function development",
      "Entity model design",
      "Testing strategies",
      "Deployment process"
    ],
    deliverables: [
      "Developer portal",
      "Code contribution guide",
      "Component storybook",
      "Architecture diagrams"
    ],
    existing: [
      "✅ SystemDocumentation page exists",
      "✅ Some code comments in place"
    ]
  },
  {
    id: 6,
    area: "Video Tutorials",
    priority: "high",
    status: "missing",
    scope: "Visual Learners",
    items: [
      "Platform Overview (5 min)",
      "Creating Your First Proposal (8 min)",
      "Configuring Kanban Workflows (10 min)",
      "AI Writing Assistant Tutorial (6 min)",
      "Team Collaboration Features (7 min)",
      "Client Portal Setup (5 min)",
      "Advanced Tips & Tricks (12 min)"
    ],
    deliverables: [
      "Professional screen recordings",
      "Voiceover narration",
      "Closed captions",
      "YouTube channel",
      "In-app video embeds"
    ]
  },
  {
    id: 7,
    area: "Migration Guides",
    priority: "medium",
    status: "missing",
    scope: "New Customers",
    items: [
      "Importing from Excel/Word",
      "Migrating from other tools",
      "Data import templates",
      "Bulk operations guide",
      "Data validation checklist",
      "Rollback procedures"
    ],
    deliverables: [
      "Step-by-step migration guides",
      "Import templates",
      "Validation scripts",
      "Support migration service docs"
    ]
  },
  {
    id: 8,
    area: "Troubleshooting & FAQ",
    priority: "high",
    status: "missing",
    scope: "Self-Service Support",
    items: [
      "Common issues & solutions",
      "Error message explanations",
      "Browser compatibility",
      "Performance troubleshooting",
      "Permission issues",
      "Integration problems",
      "Data sync issues",
      "Mobile app issues"
    ],
    deliverables: [
      "Searchable FAQ database",
      "Troubleshooting flowcharts",
      "Community forum",
      "Support ticket system integration"
    ]
  },
  {
    id: 9,
    area: "Knowledge Base Structure",
    priority: "critical",
    status: "needs_design",
    scope: "Overall Documentation",
    structure: [
      "Getting Started",
      "User Guides (by role)",
      "Feature Documentation",
      "How-To Guides",
      "Video Library",
      "API Reference",
      "Developer Docs",
      "Troubleshooting",
      "Release Notes",
      "Best Practices"
    ],
    requirements: [
      "Full-text search",
      "Breadcrumb navigation",
      "Related articles",
      "Article ratings",
      "Content feedback",
      "Version history",
      "Multi-language support (future)",
      "Mobile-responsive"
    ]
  },
  {
    id: 10,
    area: "Release Notes & Changelog",
    priority: "medium",
    status: "partial",
    scope: "Product Updates",
    items: [
      "Feature releases",
      "Bug fixes",
      "Breaking changes",
      "Deprecation notices",
      "Security updates",
      "Performance improvements"
    ],
    deliverables: [
      "Changelog page",
      "In-app update notifications",
      "Email digests",
      "RSS feed"
    ],
    existing: [
      "✅ ProductRoadmap page shows planned features"
    ]
  }
];

const KB_PLATFORMS = [
  {
    name: "Self-Hosted Documentation",
    pros: ["Full control", "No cost", "Custom branding"],
    cons: ["Requires maintenance", "Search less sophisticated"],
    tools: ["Docusaurus", "MkDocs", "VuePress"]
  },
  {
    name: "GitBook",
    pros: ["Beautiful UI", "Git integration", "Collaboration features"],
    cons: ["Monthly cost", "Some limitations"],
    tools: ["GitBook"]
  },
  {
    name: "Notion",
    pros: ["Easy to use", "Collaborative editing", "Flexible"],
    cons: ["Not purpose-built for docs", "Search limitations"],
    tools: ["Notion"]
  },
  {
    name: "Intercom/HelpScout",
    pros: ["Integrated support", "Analytics", "Search"],
    cons: ["Higher cost", "Complexity"],
    tools: ["Intercom Articles", "HelpScout Docs"]
  }
];

const IMPLEMENTATION_PHASES = [
  {
    phase: "Phase 1: Foundation (Week 1-2)",
    items: [
      "Select documentation platform",
      "Set up knowledge base structure",
      "Create style guide & templates",
      "Define content workflow",
      "Assign content owners"
    ]
  },
  {
    phase: "Phase 2: Critical Content (Week 3-5)",
    items: [
      "Write Getting Started Guide",
      "Create Dashboard Overview",
      "Document proposal creation flow",
      "Write Kanban Board guide",
      "Create FAQ section"
    ]
  },
  {
    phase: "Phase 3: Feature Documentation (Week 6-8)",
    items: [
      "Document all major features",
      "Create role-specific guides",
      "Write troubleshooting articles",
      "Add API reference",
      "Create developer guide"
    ]
  },
  {
    phase: "Phase 4: Video & Visual (Week 9-10)",
    items: [
      "Record platform overview video",
      "Create tutorial videos",
      "Add screenshots to articles",
      "Create quick reference cards",
      "Build interactive demos"
    ]
  },
  {
    phase: "Phase 5: Polish & Launch (Week 11-12)",
    items: [
      "Full content review",
      "SEO optimization",
      "Add search functionality",
      "User testing",
      "Soft launch & feedback",
      "Official launch"
    ]
  }
];

const CONTENT_METRICS = [
  "Article count by category",
  "Search queries & results",
  "Article views & engagement",
  "User feedback ratings",
  "Time spent on page",
  "Exit pages (where users drop off)",
  "Top searched terms",
  "Unresolved support tickets (gaps)"
];

export default function Phase9Documentation() {
  const missingCount = DOCUMENTATION_AUDIT.filter(a => a.status === "missing").length;
  const criticalCount = DOCUMENTATION_AUDIT.filter(a => a.priority === "critical").length;
  const highCount = DOCUMENTATION_AUDIT.filter(a => a.priority === "high").length;
  const totalDeliverables = DOCUMENTATION_AUDIT.reduce((sum, item) => {
    if (item.deliverables) return sum + item.deliverables.length;
    if (item.items) return sum + item.items.length;
    return sum;
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Phase 9: Documentation</h1>
              <p className="text-slate-600">External knowledge base, user guides, and developer documentation</p>
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
                  <p className="text-sm text-slate-600">Missing</p>
                  <p className="text-2xl font-bold text-slate-900">{missingCount}</p>
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
                  <p className="text-sm text-slate-600">Critical Priority</p>
                  <p className="text-2xl font-bold text-slate-900">{criticalCount}</p>
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
                  <p className="text-sm text-slate-600">High Priority</p>
                  <p className="text-2xl font-bold text-slate-900">{highCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Items</p>
                  <p className="text-2xl font-bold text-slate-900">{totalDeliverables}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documentation Audit */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Documentation Audit</h2>
          {DOCUMENTATION_AUDIT.map((item) => (
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
                        item.status === "missing" ? "border-red-500 text-red-700" :
                        item.status === "partial" ? "border-blue-500 text-blue-700" :
                        "border-green-500 text-green-700"
                      }>
                        {item.status?.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </CardTitle>
                    {item.scope && (
                      <p className="text-sm text-slate-600">Scope: {item.scope}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Items */}
                {item.items && item.items.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Content Needed:</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {item.items.map((content, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-slate-400">□</span>
                          {content}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Structure */}
                {item.structure && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Recommended Structure:</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.structure.map((section, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {section}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements */}
                {item.requirements && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Technical Requirements:</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {item.requirements.map((req, idx) => (
                        <li key={idx} className="text-sm text-blue-600 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Deliverables */}
                {item.deliverables && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Deliverables:</h4>
                    <ul className="space-y-1">
                      {item.deliverables.map((deliverable, idx) => (
                        <li key={idx} className="text-sm text-green-600 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {deliverable}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Existing */}
                {item.existing && (
                  <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-900 mb-2">Already Available:</h4>
                    <ul className="space-y-1">
                      {item.existing.map((existing, idx) => (
                        <li key={idx} className="text-sm text-green-700">
                          {existing}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform Options */}
        <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-purple-900 mb-4">📚 Knowledge Base Platform Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {KB_PLATFORMS.map((platform, idx) => (
                <div key={idx} className="bg-white rounded-lg border-2 border-purple-200 p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">{platform.name}</h4>
                  <div className="space-y-2 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-1">Pros:</p>
                      <ul className="text-xs text-green-600 space-y-0.5">
                        {platform.pros.map((pro, i) => (
                          <li key={i}>✓ {pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-1">Cons:</p>
                      <ul className="text-xs text-red-600 space-y-0.5">
                        {platform.cons.map((con, i) => (
                          <li key={i}>• {con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {platform.tools.map((tool, i) => (
                      <Badge key={i} className="bg-purple-100 text-purple-700 text-xs">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Implementation Roadmap */}
        <Card className="mb-6 bg-blue-50 border-2 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">📋 12-Week Implementation Roadmap</h3>
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

        {/* Success Metrics */}
        <Card className="bg-green-50 border-2 border-green-200">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-green-900 mb-4">📊 Success Metrics to Track</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CONTENT_METRICS.map((metric, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-green-700">{metric}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}