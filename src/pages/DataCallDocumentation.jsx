import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileQuestion,
  Book,
  Zap,
  Shield,
  Mail,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Calendar,
  Users,
  Download,
  MessageSquare,
  RefreshCw,
  Eye,
  Edit
} from "lucide-react";

export default function DataCallDocumentation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <FileQuestion className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Data Call System</h1>
              <p className="text-blue-100 text-lg">Complete Documentation & User Guide</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Badge className="bg-green-500 text-white px-4 py-2 text-sm">
              ✅ Production Ready
            </Badge>
            <Badge className="bg-purple-500 text-white px-4 py-2 text-sm">
              8 Core Phases Complete
            </Badge>
            <Badge className="bg-amber-500 text-white px-4 py-2 text-sm">
              3 Premium Features
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <Book className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="features">
              <Zap className="w-4 h-4 mr-2" />
              Features
            </TabsTrigger>
            <TabsTrigger value="workflows">
              <TrendingUp className="w-4 h-4 mr-2" />
              Workflows
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="tips">
              <Sparkles className="w-4 h-4 mr-2" />
              Best Practices
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>What is the Data Call System?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-700">
                <p>
                  The Data Call System is a comprehensive solution for requesting, tracking, and managing information 
                  from clients, partners, and team members during the proposal development process.
                </p>
                <p className="font-semibold text-slate-900">
                  💡 Perfect for gathering:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Client requirements and specifications</li>
                  <li>Partner capability statements and certifications</li>
                  <li>Team member expertise documentation</li>
                  <li>Past performance references</li>
                  <li>Technical documentation</li>
                  <li>Financial and pricing information</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Core Components
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700 ml-7">
                      <li>• Data Call Requests (DataCallRequest entity)</li>
                      <li>• File Management (ClientUploadedFile entity)</li>
                      <li>• Version Control (automatic versioning)</li>
                      <li>• Activity Tracking (AuditLog integration)</li>
                      <li>• Email Templates (EmailTemplate entity)</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      Key Features
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-700 ml-7">
                      <li>• Secure token-based access</li>
                      <li>• Drag-drop file uploads</li>
                      <li>• Real-time progress tracking</li>
                      <li>• Discussion threads</li>
                      <li>• Mobile-responsive design</li>
                      <li>• AI-powered suggestions</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6 mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Email Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <p><strong>Customizable Templates:</strong> Create and manage email templates for different scenarios</p>
                  <p><strong>12+ Placeholders:</strong> Dynamic content insertion (names, dates, links, progress)</p>
                  <p><strong>Live Preview:</strong> See exactly how emails will look before sending</p>
                  <p><strong>Default Templates:</strong> Pre-configured for client, internal, and partner communications</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-600" />
                    Security Audit Trail
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <p><strong>Complete Tracking:</strong> All views, exports, downloads logged</p>
                  <p><strong>Sensitive Data Detection:</strong> Auto-flags confidential content</p>
                  <p><strong>Admin Only Access:</strong> Secure audit viewer for administrators</p>
                  <p><strong>IP Address Logging:</strong> Track access locations and times</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Dashboard Widget
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <p><strong>Real-Time Metrics:</strong> Active, overdue, completed counts</p>
                  <p><strong>Completion Rate:</strong> Overall progress visualization</p>
                  <p><strong>Smart Alerts:</strong> Color-coded warnings for items needing attention</p>
                  <p><strong>Quick Navigation:</strong> Click-through to full Data Calls page</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <p><strong>Smart Suggestions:</strong> AI-generated checklist items</p>
                  <p><strong>Time Predictions:</strong> Estimated completion dates</p>
                  <p><strong>Template Library:</strong> Pre-built request templates</p>
                  <p><strong>Pattern Recognition:</strong> Learn from historical data</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-amber-600" />
                    Recurring Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <p><strong>Automated Scheduling:</strong> Set up weekly, monthly, or custom intervals</p>
                  <p><strong>Template-Based:</strong> Reuse checklists across occurrences</p>
                  <p><strong>Pause/Resume:</strong> Flexible control over automation</p>
                  <p><strong>Performance Tracking:</strong> Monitor recurring request completion rates</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-indigo-600" />
                    Export & Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <p><strong>PDF Reports:</strong> Professional formatted documents</p>
                  <p><strong>Excel Export:</strong> Structured data for analysis</p>
                  <p><strong>Batch Operations:</strong> Export multiple data calls at once</p>
                  <p><strong>Calendar Sync:</strong> Integrate due dates with calendar</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Standard Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { step: 1, title: "Create Request", desc: "Define what you need and who should provide it", icon: Edit },
                    { step: 2, title: "Build Checklist", desc: "Add specific items with descriptions and requirements", icon: CheckCircle2 },
                    { step: 3, title: "Send Notification", desc: "Email sent with secure portal link", icon: Mail },
                    { step: 4, title: "Track Progress", desc: "Monitor submissions and completion in real-time", icon: Eye },
                    { step: 5, title: "Review & Discuss", desc: "Comment on items, request clarifications", icon: MessageSquare },
                    { step: 6, title: "Complete & Archive", desc: "Mark complete and export for records", icon: Download }
                  ].map(({ step, title, desc, icon: Icon }) => (
                    <div key={step} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {step}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-blue-600" />
                          <h4 className="font-semibold text-slate-900">{title}</h4>
                        </div>
                        <p className="text-sm text-slate-600">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recipient Types & Use Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border-2 border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Client Organizations
                    </h4>
                    <p className="text-sm text-slate-700">
                      Perfect for consulting firms managing multiple clients. Request information from 
                      client team members with secure portal access and professional email templates.
                    </p>
                  </div>

                  <div className="p-4 border-2 border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Internal Team Members
                    </h4>
                    <p className="text-sm text-slate-700">
                      Coordinate with your own team to gather proposal content. Track who's responsible 
                      for each section and monitor progress centrally.
                    </p>
                  </div>

                  <div className="p-4 border-2 border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Teaming Partners
                    </h4>
                    <p className="text-sm text-slate-700">
                      Request capability statements, past performance, and certifications from subcontractors 
                      and partners with professional email notifications.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6 mt-6">
            <Card className="border-2 border-red-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-red-600" />
                  Security & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">🔒 Secure Access</h4>
                  <ul className="space-y-2 text-sm text-slate-700 ml-4">
                    <li>• Unique access tokens (32-character secure tokens)</li>
                    <li>• 90-day token expiration with configurable duration</li>
                    <li>• No login required - token-based authentication</li>
                    <li>• HTTPS encrypted file uploads and transfers</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">📊 Audit Logging (Admin Only)</h4>
                  <ul className="space-y-2 text-sm text-slate-700 ml-4">
                    <li>• Every view, export, and download tracked</li>
                    <li>• IP address and timestamp recording</li>
                    <li>• Sensitive data access flagging (keywords: financial, confidential, proprietary)</li>
                    <li>• Complete timeline visualization for administrators</li>
                    <li>• Bulk operation tracking for compliance</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">🛡️ Data Isolation</h4>
                  <ul className="space-y-2 text-sm text-slate-700 ml-4">
                    <li>• Organization-based data segregation</li>
                    <li>• Client workspace isolation for consulting firms</li>
                    <li>• Role-based access control (RBAC)</li>
                    <li>• Automatic data purging for temporary documents</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                  Best Practices & Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">✍️ Writing Effective Requests</h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li><strong>Be Specific:</strong> Clearly describe format, length, and content requirements</li>
                    <li><strong>Provide Context:</strong> Explain how the information will be used</li>
                    <li><strong>Set Realistic Deadlines:</strong> Account for complexity and recipient availability</li>
                    <li><strong>Use Examples:</strong> Include sample documents or references in item descriptions</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">🎯 Maximizing Response Rates</h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li><strong>Prioritize Items:</strong> Mark truly critical items as "Required" only</li>
                    <li><strong>Send Reminders:</strong> Follow up 3-5 days before due date</li>
                    <li><strong>Use Custom Templates:</strong> Personalize emails for different audiences</li>
                    <li><strong>Acknowledge Submissions:</strong> Thank recipients promptly to encourage completion</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">⚡ Power User Tips</h4>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li><strong>Template Library:</strong> Save successful requests as templates for future use</li>
                    <li><strong>AI Suggestions:</strong> Use AI to generate checklist items based on proposal context</li>
                    <li><strong>Bulk Actions:</strong> Select multiple data calls to send reminders or export in batch</li>
                    <li><strong>Advanced Filters:</strong> Create saved views for different workflows (urgent, overdue, by client)</li>
                    <li><strong>Recurring Requests:</strong> Automate monthly compliance documentation requests</li>
                    <li><strong>Version History:</strong> Track changes to data call requirements over time</li>
                  </ul>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Integration Pro Tips
                  </h4>
                  <ul className="space-y-2 text-sm text-purple-900">
                    <li>• Sync due dates to calendar for automatic reminders</li>
                    <li>• Use approval workflows for sensitive information requests</li>
                    <li>• Export to PDF for client records and compliance documentation</li>
                    <li>• Link data calls directly to proposals for context</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Common Workflows</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-l-4 border-blue-600 pl-4">
                  <h4 className="font-semibold text-blue-900 mb-2">📋 Client Requirement Gathering</h4>
                  <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
                    <li>Create data call for specific proposal</li>
                    <li>Select client organization and assign to team member</li>
                    <li>Add checklist items (requirements, specs, constraints)</li>
                    <li>Send with professional email template</li>
                    <li>Monitor portal access and file uploads</li>
                    <li>Discuss items needing clarification</li>
                    <li>Mark complete and export summary</li>
                  </ol>
                </div>

                <div className="border-l-4 border-green-600 pl-4">
                  <h4 className="font-semibold text-green-900 mb-2">👥 Partner Capability Collection</h4>
                  <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
                    <li>Create data call for teaming partner</li>
                    <li>Request capability statement, certs, past performance</li>
                    <li>Use "Partner Formal Request" email template</li>
                    <li>Track submission progress</li>
                    <li>Review uploaded documents</li>
                    <li>Approve or request revisions</li>
                    <li>Archive to partner's folder in Content Library</li>
                  </ol>
                </div>

                <div className="border-l-4 border-purple-600 pl-4">
                  <h4 className="font-semibold text-purple-900 mb-2">🔄 Recurring Compliance Docs</h4>
                  <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
                    <li>Create recurring data call template (monthly/quarterly)</li>
                    <li>Define standard checklist (financial docs, certifications, etc.)</li>
                    <li>Set schedule (e.g., 1st of every month)</li>
                    <li>System auto-creates new data calls</li>
                    <li>Auto-sends reminder emails 3 days before due</li>
                    <li>Track completion trends over time</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Reference Card */}
        <Card className="border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-xl">📚 Quick Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Keyboard Shortcuts</h4>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li><code className="bg-white px-2 py-1 rounded">Ctrl/Cmd + K</code> - Global Search</li>
                  <li><code className="bg-white px-2 py-1 rounded">N</code> - New Data Call</li>
                  <li><code className="bg-white px-2 py-1 rounded">?</code> - Show Help</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Status Meanings</h4>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li><Badge className="bg-slate-600">draft</Badge> - Not yet sent</li>
                  <li><Badge className="bg-indigo-600">sent</Badge> - Email delivered</li>
                  <li><Badge className="bg-blue-600">in_progress</Badge> - Partial completion</li>
                  <li><Badge className="bg-green-600">completed</Badge> - All items done</li>
                  <li><Badge className="bg-red-600">overdue</Badge> - Past due date</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Support Resources</h4>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>• System Documentation page</li>
                  <li>• Feedback form for issues</li>
                  <li>• AI Chat for help</li>
                  <li>• Email templates library</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}