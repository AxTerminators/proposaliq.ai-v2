
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ExternalLink,
  Users,
  Star,
  MessageSquare,
  DollarSign,
  UserCircle,
  BarChart3,
  TrendingUp,
  Award,
  BookOpen,
  Lightbulb,
  FileQuestion
} from "lucide-react";

export default function AdminPagesModule({ currentUser }) {
  const adminPages = [
    {
      category: "Client Portal Pages",
      description: "Pages accessible by clients through special links",
      pages: [
        {
          name: "Client Portal",
          url: "ClientPortal?admin_preview=true",
          icon: Users,
          description: "Main client dashboard and portal entry",
          requiresToken: true,
          openInSameWindow: true
        },
        {
          name: "Client Proposal View",
          url: "ClientProposalView?admin_preview=true",
          icon: FileText,
          description: "Client-facing proposal viewing page",
          requiresToken: true,
          openInSameWindow: true
        },
        {
          name: "Client Feedback Form",
          url: "ClientFeedbackForm",
          icon: MessageSquare,
          description: "Client feedback submission form",
          requiresToken: false,
          openInSameWindow: true
        },
        {
          name: "Client Satisfaction Survey",
          url: "ClientSatisfactionSurvey?admin_preview=true",
          icon: Star,
          description: "Post-proposal satisfaction survey",
          requiresToken: false,
          openInSameWindow: true
        }
      ]
    },
    {
      category: "User Onboarding & Marketing",
      description: "Pages for new user onboarding and marketing",
      pages: [
        {
          name: "Onboarding",
          url: "Onboarding",
          icon: UserCircle,
          description: "New user onboarding flow",
          requiresToken: false
        },
        {
          name: "Onboarding Guide",
          url: "OnboardingGuide",
          icon: Lightbulb,
          description: "Interactive onboarding guide",
          requiresToken: false
        },
        {
          name: "Landing Page",
          url: "LandingPage",
          icon: ExternalLink,
          description: "Public landing page",
          requiresToken: false
        },
        {
          name: "Pricing",
          url: "Pricing",
          icon: DollarSign,
          description: "Pricing plans page",
          requiresToken: false
        }
      ]
    },
    {
      category: "Feedback & Analytics",
      description: "Internal feedback and analytics pages",
      pages: [
        {
          name: "Rate Feedback",
          url: "RateFeedback",
          icon: Star,
          description: "Feedback rating page",
          requiresToken: false
        },
        {
          name: "Analytics Dashboard",
          url: "AnalyticsDashboard",
          icon: BarChart3,
          description: "Detailed analytics dashboard",
          requiresToken: false
        },
        {
          name: "Error Monitoring",
          url: "ErrorMonitoringDashboard",
          icon: TrendingUp,
          description: "Error tracking and monitoring",
          requiresToken: false
        }
      ]
    },
    {
      category: "Win/Loss Analysis",
      description: "Win/loss tracking and insights",
      pages: [
        {
          name: "Win/Loss Capture",
          url: "WinLossCapture",
          icon: Award,
          description: "Capture win/loss analysis data",
          requiresToken: false
        },
        {
          name: "Win/Loss Insights",
          url: "WinLossInsights",
          icon: TrendingUp,
          description: "View win/loss insights and trends",
          requiresToken: false
        }
      ]
    },
    {
      category: "Resources",
      description: "Additional resource pages",
      pages: [
        {
          name: "Best Practices",
          url: "BestPractices",
          icon: BookOpen,
          description: "Proposal best practices library",
          requiresToken: false
        },
        {
          name: "Templates Library",
          url: "TemplatesLibrary",
          icon: FileText,
          description: "Proposal templates library",
          requiresToken: false
        },
        {
          name: "Advanced Search",
          url: "AdvancedSearch",
          icon: FileQuestion,
          description: "Advanced search functionality",
          requiresToken: false
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Admin Pages</h2>
          <p className="text-slate-600">Access and manage all hidden/development pages</p>
        </div>
        <Badge className="bg-purple-100 text-purple-700">
          {adminPages.reduce((sum, cat) => sum + cat.pages.length, 0)} Pages
        </Badge>
      </div>

      <div className="space-y-6">
        {adminPages.map((category, idx) => (
          <Card key={idx} className="border-none shadow-lg">
            <CardHeader className="border-b bg-slate-50">
              <CardTitle className="text-lg">{category.category}</CardTitle>
              <p className="text-sm text-slate-600 mt-1">{category.description}</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {category.pages.map((page, pageIdx) => {
                  const Icon = page.icon;
                  return (
                    <Link
                      key={pageIdx}
                      to={createPageUrl(page.url)}
                      target={page.openInSameWindow ? "_self" : "_blank"}
                      className="group p-4 border-2 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                          <Icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {page.name}
                            </h3>
                            {!page.openInSameWindow && (
                              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{page.description}</p>
                          {page.requiresToken && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              Requires Access Token
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-lg bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">About Admin Pages</h3>
              <p className="text-sm text-blue-800 mb-2">
                These pages are not visible in the main user navigation but are accessible via direct links. 
                They're used for testing, client access, or specific workflows.
              </p>
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Pages marked "Requires Access Token" need special authentication parameters 
                to function properly (typically accessed via email links sent to clients).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
