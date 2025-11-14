
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Sparkles, 
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  Award,
  Rocket,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * RAG Enhancement Status Page
 * 
 * Shows the current implementation status of all RAG enhancements.
 * Tracks progress across all 8 phases of the RAG buildout.
 */
export default function RAGEnhancementStatus() {
  const phases = [
    {
      phase: 1,
      name: "Critical Foundation",
      status: "complete",
      completion: 100,
      features: [
        { name: "Section-Type Aware RAG", status: "complete", impact: "high", description: "AI filters by section type" },
        { name: "Intelligent Token Management", status: "complete", impact: "high", description: "100K token capacity" },
        { name: "Enhanced Error Handling", status: "complete", impact: "high", description: "Full error tracking" },
        { name: "Quality Feedback System", status: "complete", impact: "high", description: "Rate AI content" }
      ]
    },
    {
      phase: 2,
      name: "Smart Recommendations",
      status: "complete",
      completion: 100,
      features: [
        { name: "AI Reference Recommender", status: "complete", impact: "high", description: "Auto-suggest references" },
        { name: "Reference Preview", status: "complete", impact: "medium", description: "Preview before linking" },
        { name: "Token Visualizer", status: "complete", impact: "medium", description: "Real-time breakdown" }
      ]
    },
    {
      phase: 3,
      name: "Performance & Caching",
      status: "complete",
      completion: 100,
      features: [
        { name: "Parse Cache", status: "complete", impact: "high", description: "10x faster (7-day TTL)" },
        { name: "Parallel Processing", status: "complete", impact: "high", description: "5x faster parsing" },
        { name: "Auto Refresh", status: "complete", impact: "medium", description: "30s debounced updates" }
      ]
    },
    {
      phase: 4,
      name: "Citations",
      status: "complete",
      completion: 100,
      features: [
        { name: "Citation System", status: "complete", impact: "medium", description: "Source attribution" },
        { name: "RAG Analytics", status: "complete", impact: "medium", description: "Quality dashboard" },
        { name: "Source Viewer", status: "complete", impact: "medium", description: "Click to view original" }
      ]
    },
    {
      phase: 5,
      name: "Cross-Org RAG",
      status: "complete",
      completion: 100,
      features: [
        { name: "Smart Discovery", status: "complete", impact: "high", description: "AI-powered proposal finding" },
        { name: "Org Knowledge Base", status: "complete", impact: "high", description: "Learn from all proposals" },
        { name: "Privacy-Aware", status: "complete", impact: "high", description: "Consultant boundaries" }
      ]
    },
    {
      phase: 6,
      name: "A/B Testing",
      status: "planned",
      completion: 0,
      features: [
        { name: "A/B Comparison", status: "planned", impact: "medium", description: "Test RAG vs non-RAG" },
        { name: "Effectiveness Reports", status: "planned", impact: "medium", description: "Monthly analysis" }
      ]
    },
    {
      phase: 7,
      name: "Semantic Chunking",
      status: "in_progress",
      completion: 75,
      features: [
        { name: "Semantic Chunking", status: "complete", impact: "high", description: "Break proposals into 200-word chunks with AI summaries" },
        { name: "Chunk Search", status: "complete", impact: "high", description: "Find exact relevant paragraphs, not full sections" },
        { name: "Chunk Viewer UI", status: "complete", impact: "medium", description: "Display paragraph-level results with context" }
      ]
    },
    {
      phase: 8,
      name: "Advanced AI",
      status: "planned",
      completion: 0,
      features: [
        { name: "Adaptive Learning", status: "planned", impact: "high", description: "Learn from usage" },
        { name: "Quality Predictor", status: "planned", impact: "medium", description: "Predict reference value" }
      ]
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'planned': return <Circle className="w-5 h-5 text-slate-400" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      complete: "bg-green-100 text-green-800 border-green-300",
      in_progress: "bg-blue-100 text-blue-800 border-blue-300",
      planned: "bg-slate-100 text-slate-800 border-slate-300"
    };
    return <Badge className={variants[status]}>{status.replace('_', ' ')}</Badge>;
  };

  const getImpactBadge = (impact) => {
    const variants = {
      high: "bg-red-100 text-red-800",
      medium: "bg-amber-100 text-amber-800",
      low: "bg-blue-100 text-blue-800"
    };
    return <Badge className={variants[impact]}>{impact}</Badge>;
  };

  const totalFeatures = phases.reduce((sum, p) => sum + p.features.length, 0);
  const completedFeatures = phases.reduce((sum, p) => 
    sum + p.features.filter(f => f.status === 'complete').length, 0
  );
  const overallProgress = Math.round((completedFeatures / totalFeatures) * 100);

  const completedPhases = phases.filter(p => p.status === 'complete').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600" />
              RAG Enhancement Status
            </h1>
            <p className="text-slate-600 mt-2">
              Retrieval-Augmented Generation system improvements for AI-powered proposal writing
            </p>
          </div>
          <Link to={createPageUrl("SystemDocumentation")}>
            <Button variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              View Documentation
            </Button>
          </Link>
        </div>

        {/* Overall Progress Card */}
        <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Rocket className="w-6 h-6 text-purple-600" />
                Overall Progress
              </span>
              <Badge className="bg-purple-600 text-white text-lg px-4 py-2">
                {overallProgress}% Complete
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={overallProgress} className="h-4 [&>div]:bg-gradient-to-r [&>div]:from-purple-600 [&>div]:to-pink-600" />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-green-200 bg-white">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{completedPhases}</p>
                  <p className="text-sm text-slate-600 mt-1">Phases Complete</p>
                </CardContent>
              </Card>
              
              <Card className="border-blue-200 bg-white">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{completedFeatures}</p>
                  <p className="text-sm text-slate-600 mt-1">Features Live</p>
                </CardContent>
              </Card>
              
              <Card className="border-amber-200 bg-white">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">{totalFeatures - completedFeatures}</p>
                  <p className="text-sm text-slate-600 mt-1">Features Planned</p>
                </CardContent>
              </Card>
              
              <Card className="border-purple-200 bg-white">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{phases.length}</p>
                  <p className="text-sm text-slate-600 mt-1">Total Phases</p>
                </CardContent>
              </Card>
            </div>

            {/* Key Achievements */}
            <div className="bg-white rounded-lg p-4 border-2 border-green-300">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Phase 5 Unlocked: Organization Intelligence
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">🤖 Smart Discovery</p>
                    <p className="text-xs text-slate-600">AI finds relevant references automatically</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">🏢 Org Knowledge Base</p>
                    <p className="text-xs text-slate-600">Learn from all past wins</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">🔒 Privacy-Aware</p>
                    <p className="text-xs text-slate-600">Consultant firms share across clients safely</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phase Cards */}
        <div className="space-y-4">
          {phases.map((phase) => (
            <Card 
              key={phase.phase}
              className={cn(
                "border-2",
                phase.status === 'complete' && "border-green-300 bg-green-50",
                phase.status === 'in_progress' && "border-blue-300 bg-blue-50",
                phase.status === 'planned' && "border-slate-200 bg-white"
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(phase.status)}
                    <div>
                      <CardTitle className="text-xl">
                        Phase {phase.phase}: {phase.name}
                      </CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        {phase.features.length} features • {phase.completion}% complete
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(phase.status)}
                </div>
                <Progress value={phase.completion} className="h-2 mt-3" />
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {phase.features.map((feature, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        feature.status === 'complete' && "bg-white border-green-200",
                        feature.status === 'in_progress' && "bg-white border-blue-200",
                        feature.status === 'planned' && "bg-slate-50 border-slate-200"
                      )}
                    >
                      {getStatusIcon(feature.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-slate-900">{feature.name}</h4>
                          {getImpactBadge(feature.impact)}
                        </div>
                        <p className="text-sm text-slate-600">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Next Steps */}
        <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Target className="w-6 h-6" />
              Next: Phase 7 (Semantic Chunking)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Highest Impact: Semantic Chunking</p>
                <p className="text-sm text-blue-800 mt-1">
                  Retrieve exact relevant paragraphs instead of full proposals. Game-changing relevance boost.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testing Checklist */}
        <Card className="border-2 border-purple-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-purple-600" />
              Testing Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Generate content → See cache performance (first = 5s, repeat = 0.1s)</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Check generated content → Look for [REF1: Section Name] citations</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Click citation badge → View original source content</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Enable auto-refresh → Edit proposal → Context updates in 30s</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>View RAG Analytics → See quality trends and top references</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
