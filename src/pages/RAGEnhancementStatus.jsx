import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  TrendingUp, 
  Zap, 
  Target,
  Award,
  FileText,
  Database,
  Filter,
  Users,
  Search,
  BookOpen,
  BarChart3,
  ExternalLink
} from "lucide-react";

export default function RAGEnhancementStatus() {
  const phases = [
    {
      name: "Phase 1: Smart Reference Discovery",
      status: "complete",
      completion: 100,
      features: [
        { name: "Automatic similar proposal discovery", status: "complete", impact: "high" },
        { name: "AI-powered relevance scoring", status: "complete", impact: "high" },
        { name: "Integration with resource gathering", status: "complete", impact: "medium" }
      ]
    },
    {
      name: "Phase 2: Intelligent Token Management",
      status: "complete",
      completion: 100,
      features: [
        { name: "Provider-specific token limits", status: "complete", impact: "high" },
        { name: "Smart truncation strategies", status: "complete", impact: "high" },
        { name: "Budget visualization UI", status: "complete", impact: "medium" }
      ]
    },
    {
      name: "Phase 3: Enhanced Caching System",
      status: "complete",
      completion: 100,
      features: [
        { name: "7-day TTL cache for parsed proposals", status: "complete", impact: "high" },
        { name: "Access tracking & performance metrics", status: "complete", impact: "medium" },
        { name: "Cache performance indicators", status: "complete", impact: "medium" }
      ]
    },
    {
      name: "Phase 4: Section-Type Filtering",
      status: "complete",
      completion: 100,
      features: [
        { name: "Targeted content retrieval by section", status: "complete", impact: "high" },
        { name: "Reduced noise, improved relevance", status: "complete", impact: "high" },
        { name: "Filter indicators in UI", status: "complete", impact: "low" }
      ]
    },
    {
      name: "Phase 5: Cross-Organization RAG",
      status: "complete",
      completion: 100,
      features: [
        { name: "Organization-wide learning", status: "complete", impact: "high" },
        { name: "Privacy-respecting data sharing", status: "complete", impact: "high" },
        { name: "Enhanced context for new proposals", status: "complete", impact: "high" }
      ]
    },
    {
      name: "Phase 6: Citation & Transparency",
      status: "complete",
      completion: 100,
      features: [
        { name: "Automatic citation generation", status: "complete", impact: "high" },
        { name: "Source attribution in content", status: "complete", impact: "high" },
        { name: "Enhanced citation indicators", status: "complete", impact: "medium" },
        { name: "Audit trail for compliance", status: "complete", impact: "high" }
      ]
    },
    {
      name: "Phase 7: Semantic Chunking",
      status: "complete",
      completion: 100,
      features: [
        { name: "Paragraph-level content storage", status: "complete", impact: "high" },
        { name: "Semantic chunk search function", status: "complete", impact: "high" },
        { name: "Real-time relevant paragraph discovery", status: "complete", impact: "high" },
        { name: "Chunk viewer component", status: "complete", impact: "medium" }
      ]
    },
    {
      name: "Phase 8: Continuous Learning Loop",
      status: "complete",
      completion: 100,
      features: [
        { name: "Quality feedback collection", status: "complete", impact: "high" },
        { name: "Performance tracking dashboard", status: "complete", impact: "high" },
        { name: "Adaptive reference selection", status: "complete", impact: "high" },
        { name: "Smart reference selector component", status: "complete", impact: "medium" }
      ]
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'planned':
        return <Circle className="w-4 h-4 text-slate-400" />;
      default:
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'planned':
        return <Badge className="bg-slate-100 text-slate-800">Planned</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getImpactBadge = (impact) => {
    switch (impact) {
      case 'high':
        return <Badge className="bg-purple-100 text-purple-800 text-xs">High Impact</Badge>;
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800 text-xs">Medium</Badge>;
      case 'low':
        return <Badge className="bg-slate-100 text-slate-800 text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  const completedPhases = phases.filter(p => p.status === 'complete').length;
  const totalPhases = phases.length;
  const overallProgress = (completedPhases / totalPhases) * 100;

  const liveFeatures = phases.flatMap(p => p.features).filter(f => f.status === 'complete').length;
  const plannedFeatures = phases.flatMap(p => p.features).filter(f => f.status === 'planned').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Zap className="w-8 h-8 text-blue-600" />
              RAG Enhancement Status
            </h1>
            <p className="text-slate-600 mt-1">
              Retrieval-Augmented Generation system - All phases complete! 🎉
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-600">Overall Progress</p>
            <p className="text-3xl font-bold text-green-600">{overallProgress.toFixed(0)}%</p>
          </div>
        </div>

        {/* Overall Progress Card */}
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              System Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-700">All Phases Complete</span>
                <span className="font-semibold text-green-700">{completedPhases} / {totalPhases}</span>
              </div>
              <Progress value={100} className="h-3 bg-green-200" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{completedPhases}</p>
                <p className="text-xs text-slate-600">Completed Phases</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{liveFeatures}</p>
                <p className="text-xs text-slate-600">Live Features</p>
              </div>
              <div className="text-center">
                <Link to={createPageUrl('RAGPerformanceDashboard')}>
                  <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual Phases */}
        <div className="grid gap-4">
          {phases.map((phase, idx) => (
            <Card key={idx} className="border-green-200 bg-green-50/30">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      {phase.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(phase.status)}
                      <span className="text-sm text-slate-600">{phase.completion}% Complete</span>
                    </div>
                  </div>
                  <Progress value={100} className="w-24 h-2" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {phase.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">{feature.name}</span>
                      </div>
                      {getImpactBadge(feature.impact)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Success Banner */}
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Award className="w-5 h-5" />
              RAG System Fully Operational
            </CardTitle>
            <CardDescription>All enhancement phases complete and ready for production use</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
              <BarChart3 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-green-900">Performance Dashboard Live</p>
                <p className="text-sm text-green-700 mt-1">
                  Track quality metrics, reference performance, and system efficiency in real-time
                </p>
                <Link to={createPageUrl('RAGPerformanceDashboard')}>
                  <Button variant="outline" size="sm" className="mt-2 border-green-300 text-green-700">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
              <Zap className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">Adaptive Learning Active</p>
                <p className="text-sm text-green-700 mt-1">
                  System automatically improves reference selection based on quality feedback
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
              <Search className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">Semantic Search Enabled</p>
                <p className="text-sm text-green-700 mt-1">
                  Paragraph-level precision with real-time relevant content discovery
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testing Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              System Testing Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                "Create proposal and link reference proposals",
                "Generate content with RAG-enhanced context",
                "Verify cache performance indicators",
                "Test section-type filtering accuracy",
                "Try semantic chunk search with various prompts",
                "Check citation generation and display",
                "Submit quality feedback ratings",
                "Review performance dashboard metrics",
                "Test adaptive reference selector",
                "Verify token budget management"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}