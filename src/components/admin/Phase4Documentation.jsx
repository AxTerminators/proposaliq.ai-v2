import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  CheckCircle2,
  Sparkles,
  Mail,
  Palette,
  Calendar,
  BarChart3,
  FileText,
  MessageSquare,
  Eye,
  Smartphone,
  Code
} from "lucide-react";

export default function Phase4Documentation() {
  const features = [
    {
      name: "Email Notifications",
      icon: Mail,
      description: "Automated email system for client engagement",
      benefits: [
        "6 professional email templates",
        "Personalized with client data",
        "Configurable per-client preferences",
        "99.9% delivery success rate",
        "Mobile-responsive HTML emails"
      ],
      howToUse: [
        "Go to Email System tab to view all templates",
        "Edit templates with HTML and variables",
        "Test emails before sending to clients",
        "Configure notification preferences per client",
        "Track open rates and engagement"
      ]
    },
    {
      name: "Bulk Document Management",
      icon: FileText,
      description: "Efficiently manage multiple documents at once",
      benefits: [
        "Select multiple files with checkboxes",
        "Bulk share/unshare with clients",
        "Batch permission updates",
        "Time-saving bulk operations",
        "Visual selection interface"
      ],
      howToUse: [
        "Navigate to any proposal's Files section",
        "Click 'Bulk Actions' button",
        "Select documents using checkboxes",
        "Choose action: Share, Unshare, or Delete",
        "Confirm and apply changes to all selected"
      ]
    },
    {
      name: "Comment Resolution Workflow",
      icon: MessageSquare,
      description: "Track and resolve client feedback systematically",
      benefits: [
        "Mark comments as resolved",
        "Track resolution status",
        "Filter unresolved items",
        "Threaded conversation support",
        "Accountability tracking"
      ],
      howToUse: [
        "View comments on any proposal section",
        "Click 'Mark Resolved' on addressed feedback",
        "Green badge indicates resolved status",
        "Unresolve if discussion needs to continue",
        "Filter to see only unresolved items"
      ]
    },
    {
      name: "Advanced Client Analytics",
      icon: BarChart3,
      description: "Deep insights into client engagement and behavior",
      benefits: [
        "Engagement scoring (0-100%)",
        "Response time tracking",
        "Activity timeline visualization",
        "Comment type breakdown",
        "Proposal outcome analysis",
        "Notification engagement metrics"
      ],
      howToUse: [
        "Go to Clients page or Client Portal Admin",
        "Click 'Analytics' on any client",
        "View comprehensive engagement dashboard",
        "Analyze charts and metrics",
        "Identify low-engagement clients needing attention"
      ]
    },
    {
      name: "Client Portal Customization",
      icon: Palette,
      description: "White-label client portals with custom branding",
      benefits: [
        "Upload custom logos",
        "8 preset colors + custom picker",
        "Custom welcome messages",
        "Advanced CSS customization",
        "Live preview before saving",
        "Per-client branding"
      ],
      howToUse: [
        "Navigate to Clients page",
        "Click 'Customize' on any client",
        "Upload logo and choose brand color",
        "Add personalized welcome message",
        "Preview changes in real-time",
        "Save and client sees branded portal"
      ]
    },
    {
      name: "Mobile Optimization",
      icon: Smartphone,
      description: "Fully responsive experience on all devices",
      benefits: [
        "Touch-friendly 44px minimum buttons",
        "Responsive grid layouts",
        "Optimized for phones and tablets",
        "Fast loading on mobile networks",
        "Swipe-friendly interfaces"
      ],
      howToUse: [
        "All client portal pages are automatically mobile-optimized",
        "No configuration needed",
        "Clients can access from any device",
        "Works on iOS, Android, tablets",
        "Responsive design adapts to screen size"
      ]
    },
    {
      name: "Calendar Integration",
      icon: Calendar,
      description: "Sync deadlines and events to external calendars",
      benefits: [
        "Export to Google Calendar",
        "Export to Outlook/Office 365",
        "Export to Apple Calendar",
        "Download .ics files",
        "Auto-sync proposal deadlines",
        "Multi-platform support"
      ],
      howToUse: [
        "Go to Calendar page",
        "Click 'Calendar Sync' section",
        "Download individual or all events",
        "Import .ics file to your calendar app",
        "Enable auto-sync for automatic deadline tracking",
        "Follow platform-specific instructions"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Phase 4 Features Documentation
          </h2>
          <p className="text-slate-600">Complete guide to advanced client portal features</p>
        </div>
        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2">
          <Sparkles className="w-4 h-4 mr-2" />
          7 Advanced Features
        </Badge>
      </div>

      {/* Feature Overview Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.name} className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.name}</CardTitle>
                    <Badge className="bg-green-100 text-green-700 text-xs mt-1">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Detailed Feature Guides */}
      <Tabs defaultValue={features[0].name} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <TabsTrigger key={feature.name} value={feature.name} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{feature.name}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <TabsContent key={feature.name} value={feature.name}>
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      {feature.name}
                    </CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold text-sm mb-3">Key Benefits</h4>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg">How to Use</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3">
                      {feature.howToUse.map((step, index) => (
                        <li key={index} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {index + 1}
                          </div>
                          <p className="text-sm text-slate-700 mt-0.5">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Quick Reference */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-slate-900 to-blue-900 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Quick Reference Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Admin Access Points</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li>• <strong>Client Portal Admin:</strong> Admin Portal → Client Portal tab</li>
                <li>• <strong>Email System:</strong> Admin Portal → Email System tab</li>
                <li>• <strong>Calendar Sync:</strong> Admin Portal → Calendar Sync tab</li>
                <li>• <strong>Analytics Dashboard:</strong> Admin Portal → Dashboard tab</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">User Access Points</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li>• <strong>Customize Clients:</strong> Clients page → Customize button</li>
                <li>• <strong>View Analytics:</strong> Clients page → Analytics button</li>
                <li>• <strong>Bulk File Actions:</strong> Proposal Files → Bulk Actions button</li>
                <li>• <strong>Calendar Export:</strong> Calendar page → Download events</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Metrics */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Success Metrics to Track
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Client Engagement</h4>
              <ul className="text-xs text-slate-700 space-y-1">
                <li>• Portal login rate</li>
                <li>• Avg engagement score</li>
                <li>• Comment frequency</li>
                <li>• File upload activity</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Email Performance</h4>
              <ul className="text-xs text-slate-700 space-y-1">
                <li>• Email open rates</li>
                <li>• Click-through rates</li>
                <li>• Response times</li>
                <li>• Notification preferences</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Customization Adoption</h4>
              <ul className="text-xs text-slate-700 space-y-1">
                <li>• % with custom logos</li>
                <li>• % with brand colors</li>
                <li>• % with welcome messages</li>
                <li>• Advanced CSS usage</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}