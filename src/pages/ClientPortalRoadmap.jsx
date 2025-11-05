import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Shield,
  MessageSquare,
  BarChart3,
  Settings,
  FileText,
  Users,
  Bell,
  Target,
  Zap,
  TrendingUp,
  Calendar
} from "lucide-react";

export default function ClientPortalRoadmap() {
  const [selectedPhase, setSelectedPhase] = useState("phase1");

  const roadmapPhases = [
    {
      id: "phase1",
      name: "Phase 1",
      title: "Core Client Experience & Layout Improvements",
      status: "in_progress",
      icon: Settings,
      color: "from-blue-500 to-blue-600",
      description: "Foundation improvements to ensure a polished, professional client portal experience",
      timeline: "Q1 2025",
      features: [
        {
          name: "Refine 'Final' Column Header Layout",
          description: "Address height discrepancy for columns with badges (e.g., 'Approval') by integrating badges more compactly into the main header row using flexible layout. Ensure all header elements (collapse chevron, title, metrics, badges, icons, menu) are consistently aligned on a single line.",
          priority: "high",
          impact: "UX consistency and professional appearance"
        },
        {
          name: "Implement Immediate Tooltips",
          description: "Ensure all icons display tooltips instantly on hover for better user guidance and reduced confusion.",
          priority: "medium",
          impact: "Improved usability and discoverability"
        },
        {
          name: "Remove Duplicate Close Button in Proposal Modal",
          description: "Identify and remove redundant 'X' close button in ProposalCardModal.jsx to ensure cleaner UI and avoid confusion.",
          priority: "low",
          impact: "Cleaner, more intuitive interface"
        }
      ]
    },
    {
      id: "phase2",
      name: "Phase 2",
      title: "Enhanced Access & Data Management",
      status: "planned",
      icon: Shield,
      color: "from-purple-500 to-purple-600",
      description: "Advanced permission controls and document management for enterprise-grade security and collaboration",
      timeline: "Q2 2025",
      features: [
        {
          name: "Granular Client Access Control",
          description: "Develop fine-grained permissions for client team members (e.g., view-only for specific sections, comment-only, approval rights). Create an intuitive interface for consultants to manage and adjust these permissions dynamically.",
          priority: "high",
          impact: "Enhanced security and flexibility for multi-stakeholder engagements"
        },
        {
          name: "Robust Document Version Control",
          description: "Implement full version history for client-uploaded documents, allowing clients to view previous versions and potentially revert changes. Include clear indicators for current and previous document versions.",
          priority: "high",
          impact: "Audit trail and document integrity"
        }
      ]
    },
    {
      id: "phase3",
      name: "Phase 3",
      title: "Advanced Collaboration & Communication",
      status: "planned",
      icon: MessageSquare,
      color: "from-green-500 to-green-600",
      description: "Sophisticated communication tools and workflow automation for seamless client-consultant collaboration",
      timeline: "Q3 2025",
      features: [
        {
          name: "Customizable Client Notifications",
          description: "Allow clients to control their notification preferences (e.g., type of events, frequency, channels). Provide consultants with tools to set default or critical notification preferences for clients.",
          priority: "medium",
          impact: "Reduced notification fatigue and improved engagement"
        },
        {
          name: "Structured Review & Approval Workflows",
          description: "Enhance formal review cycles within the client portal, enabling explicit 'approve' or 'request changes' actions on proposal sections or the entire proposal. Implement comprehensive audit trails for all review and approval actions.",
          priority: "high",
          impact: "Streamlined approval process and compliance"
        }
      ]
    },
    {
      id: "phase4",
      name: "Phase 4",
      title: "Insights & Reporting",
      status: "future",
      icon: BarChart3,
      color: "from-orange-500 to-orange-600",
      description: "Data-driven insights and health monitoring to maximize client value and retention",
      timeline: "Q4 2025",
      features: [
        {
          name: "Client-Specific Reporting Dashboards",
          description: "Develop dedicated dashboards for clients to view the status, progress, and key metrics of their proposals. Include high-level summaries of feedback, meetings, and shared documents.",
          priority: "medium",
          impact: "Transparency and client satisfaction"
        },
        {
          name: "Client Health Score Integration",
          description: "(Internal for consultants) Further develop the 'Client Health Score' to proactively identify client engagement levels and potential risks. Enable data-driven client retention strategies.",
          priority: "high",
          impact: "Proactive client success management"
        }
      ]
    }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
      in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Zap },
      planned: { label: "Planned", color: "bg-purple-100 text-purple-700", icon: Clock },
      future: { label: "Future", color: "bg-slate-100 text-slate-700", icon: Target }
    };
    const config = statusConfig[status] || statusConfig.future;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      high: { label: "High Priority", color: "bg-red-100 text-red-700" },
      medium: { label: "Medium Priority", color: "bg-yellow-100 text-yellow-700" },
      low: { label: "Low Priority", color: "bg-slate-100 text-slate-700" }
    };
    const config = priorityConfig[priority] || priorityConfig.medium;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-slate-900">Client Portal Roadmap</h1>
              <p className="text-lg text-slate-600">Strategic enhancements for world-class client experience</p>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Features</p>
                  <p className="text-3xl font-bold text-slate-900">9</p>
                </div>
                <FileText className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600">3</p>
                </div>
                <Zap className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Planned</p>
                  <p className="text-3xl font-bold text-purple-600">4</p>
                </div>
                <Clock className="w-10 h-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Future</p>
                  <p className="text-3xl font-bold text-orange-600">2</p>
                </div>
                <Target className="w-10 h-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline View */}
        <Card className="border-none shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Roadmap Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />
              
              {/* Timeline items */}
              <div className="space-y-8">
                {roadmapPhases.map((phase, index) => {
                  const Icon = phase.icon;
                  return (
                    <div key={phase.id} className="relative flex items-start gap-6">
                      {/* Timeline dot */}
                      <div className={`relative z-10 w-16 h-16 rounded-full bg-gradient-to-br ${phase.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-8">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-slate-900">{phase.title}</h3>
                          {getStatusBadge(phase.status)}
                        </div>
                        <p className="text-slate-600 mb-2">{phase.description}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {phase.timeline}
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            {phase.features.length} features
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPhase(phase.id)}
                          className="mt-3"
                        >
                          View Details →
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Phase View */}
        <Tabs value={selectedPhase} onValueChange={setSelectedPhase}>
          <TabsList className="grid grid-cols-4 mb-6">
            {roadmapPhases.map((phase) => (
              <TabsTrigger key={phase.id} value={phase.id}>
                {phase.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {roadmapPhases.map((phase) => {
            const Icon = phase.icon;
            return (
              <TabsContent key={phase.id} value={phase.id}>
                <Card className="border-none shadow-lg">
                  <CardHeader className={`bg-gradient-to-r ${phase.color} text-white rounded-t-lg`}>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                        <Icon className="w-8 h-8" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl mb-2">{phase.title}</CardTitle>
                        <CardDescription className="text-white/90">
                          {phase.description}
                        </CardDescription>
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {phase.timeline}
                          </div>
                          <div className="px-3 py-1 bg-white/20 rounded-full">
                            {phase.features.length} features
                          </div>
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(phase.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {phase.features.map((feature, index) => (
                        <div key={index} className="border-2 border-slate-200 rounded-lg p-6 hover:border-blue-300 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-lg font-semibold text-slate-900">{feature.name}</h4>
                            {getPriorityBadge(feature.priority)}
                          </div>
                          <p className="text-slate-700 mb-4">{feature.description}</p>
                          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                            <div className="flex items-start gap-2">
                              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-blue-900">Expected Impact</p>
                                <p className="text-sm text-blue-700">{feature.impact}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Strategic Value Section */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold mb-4">Strategic Value</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">Client Satisfaction</h4>
                <p className="text-white/90 text-sm">
                  Enhanced portal experience leads to higher client satisfaction scores and improved retention rates.
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">Operational Efficiency</h4>
                <p className="text-white/90 text-sm">
                  Streamlined workflows and automation reduce manual effort and accelerate proposal cycles.
                </p>
              </div>
              <div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">Competitive Advantage</h4>
                <p className="text-white/90 text-sm">
                  Best-in-class client portal differentiates your consultancy and attracts premium clients.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}