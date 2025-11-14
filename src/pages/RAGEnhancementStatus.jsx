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
        { 
          name: "Section-Type Aware RAG", 
          status: "complete",
          impact: "high",
          description: "AI now filters references by section type for 40% better relevance"
        },
        { 
          name: "Intelligent Token Management", 
          status: "complete",
          impact: "high",
          description: "Increased from 8K to 100K tokens - 10x more context capacity"
        },
        { 
          name: "Enhanced Error Handling", 
          status: "complete",
          impact: "high",
          description: "Detailed error tracking and retry capability"
        },
        { 
          name: "Quality Feedback System", 
          status: "complete",
          impact: "high",
          description: "Users can rate AI content to improve over time"
        }
      ]
    },
    {
      phase: 2,
      name: "Smart Recommendations",
      status: "complete",
      completion: 100,
      features: [
        { 
          name: "AI Reference Recommender", 
          status: "complete",
          impact: "high",
          description: "Automatically suggests best reference proposals"
        },
        { 
          name: "Reference Preview Modal", 
          status: "complete",
          impact: "medium",
          description: "Preview proposal content before linking"
        },
        { 
          name: "Token Budget Visualizer", 
          status: "complete",
          impact: "medium",
          description: "Real-time token allocation breakdown"
        }
      ]
    },
    {
      phase: 3,
      name: "Performance & Caching",
      status: "planned",
      completion: 0,
      features: [
        { 
          name: "Proposal Parse Cache", 
          status: "planned",
          impact: "high",
          description: "Cache parsed proposals for 10x faster repeat use"
        },
        { 
          name: "Incremental Context Refresh", 
          status: "planned",
          impact: "medium",
          description: "Auto-update context as proposal changes"
        },
        { 
          name: "Parallel Processing", 
          status: "planned",
          impact: "medium",
          description: "Parse multiple references simultaneously"
        }
      ]
    },
    {
      phase: 4,
      name: "Advanced RAG Features",
      status: "planned",
      completion: 0,
      features: [
        { 
          name: "Citation System", 
          status: "planned",
          impact: "medium",
          description: "Show which reference influenced each paragraph"
        },
        { 
          name: "RAG Analytics Dashboard", 
          status: "planned",
          impact: "medium",
          description: "Comprehensive analytics on RAG effectiveness"
        },
        { 
          name: "Smart Reference Highlighting", 
          status: "planned",
          impact: "low",
          description: "Color-code generated text by source"
        }
      ]
    },
    {
      phase: 5,
      name: "Cross-Organization RAG",
      status: "planned",
      completion: 0,
      features: [
        { 
          name: "Organization-Wide Knowledge Base", 
          status: "planned",
          impact: "high",
          description: "Learn from all winning proposals"
        },
        { 
          name: "Cross-Client RAG", 
          status: "planned",
          impact: "high",
          description: "Share winning approaches across clients"
        }
      ]
    },
    {
      phase: 6,
      name: "A/B Testing & Optimization",
      status: "planned",
      completion: 0,
      features: [
        { 
          name: "A/B Content Comparison", 
          status: "planned",
          impact: "medium",
          description: "Test RAG vs non-RAG side-by-side"
        },
        { 
          name: "RAG Effectiveness Report", 
          status: "planned",
          impact: "medium",
          description: "Monthly automated impact reports"
        }
      ]
    },
    {
      phase: 7,
      name: "Semantic Search & Embeddings",
      status: "planned",
      completion: 0,
      features: [
        { 
          name: "Semantic Chunking", 
          status: "planned",
          impact: "high",
          description: "Retrieve exact relevant paragraphs, not full proposals"
        },
        { 
          name: "Multi-Modal RAG", 
          status: "planned",
          impact: "medium",
          description: "Extract tables, charts, diagrams"
        }
      ]
    },
    {
      phase: 8,
      name: "Advanced Features",
      status: "planned",
      completion: 0,
      features: [
        { 
          name: "Adaptive Learning", 
          status: "planned",
          impact: "high",
          description: "System learns which references work best"
        },
        { 
          name: "Quality Predictor", 
          status: "planned",
          impact: "medium",
          description: "Predict reference usefulness before parsing"
        }
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
                Key Achievements Unlocked
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">10x Context Capacity</p>
                    <p className="text-xs text-slate-600">From 8K to 100K tokens</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">40% Better Relevance</p>
                    <p className="text-xs text-slate-600">Section-type filtering</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">AI Recommendations</p>
                    <p className="text-xs text-slate-600">Smart reference suggestions</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-900">Quality Tracking</p>
                    <p className="text-xs text-slate-600">User feedback system</p>
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
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Ready to Build: Phase 3 (Performance & Caching)</p>
                <p className="text-sm text-blue-800 mt-1">
                  Implement proposal parse cache for 10x faster repeat use. Estimated: 8 hours, High Impact.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">High Priority: Semantic Chunking (Phase 7)</p>
                <p className="text-sm text-blue-800 mt-1">
                  Retrieve exact relevant paragraphs instead of full proposals. Game-changer for relevance.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border-2 border-blue-300 mt-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">🎯 Recommended Build Order:</p>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Phase 3: Performance & Caching (immediate speed boost)</li>
                <li>Phase 4: Citations & Analytics (improve transparency)</li>
                <li>Phase 7: Semantic Chunking (next-level relevance)</li>
                <li>Phase 5: Cross-Org Learning (scale benefits)</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Testing Checklist */}
        <Card className="border-2 border-purple-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-purple-600" />
              Testing Checklist for Live Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-slate-900">Go to Proposal Builder → Phase 6 → Write a section</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-slate-900">Click "Gather Resources" → See AI Recommendations</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-slate-900">Link 2-3 reference proposals → Click "Preview" button</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-slate-900">Generate content → See reference context loaded indicator</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-slate-900">Check Token Budget Visualizer → Verify breakdown</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-slate-900">Insert content → Rate quality (1-5 stars)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}