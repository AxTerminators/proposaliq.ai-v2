
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, AlertCircle, Clock, Target, TrendingUp, Zap, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const ROADMAP_PHASES = [
  {
    id: "phase1",
    name: "Phase 1: Critical Missing Features",
    duration: "Weeks 1-4",
    status: "completed",
    priority: "P0",
    features: [
      {
        name: "AI Confidence Scoring System",
        status: "completed",
        impact: "HIGH",
        effort: "MEDIUM",
        description: "Calculate comprehensive win probability based on proposal completeness, quality, compliance, and strategy",
        implementation: "Phase 4 Enhancement - ✅ LIVE",
        estimatedTokens: "50K/month"
      },
      {
        name: "Content Reuse Intelligence AI Engine",
        status: "completed",
        impact: "HIGH",
        effort: "MEDIUM",
        description: "Semantic similarity scoring to suggest relevant historical content",
        implementation: "ProposalReuseIntelligence + Phase 6 - ✅ LIVE",
        estimatedTokens: "100K/month"
      },
      {
        name: "Red Team Review AI",
        status: "completed",
        impact: "HIGH",
        effort: "MEDIUM",
        description: "AI-powered quality assurance and review recommendations",
        implementation: "Phase 7 Enhancement - ✅ LIVE",
        estimatedTokens: "75K/month"
      },
      {
        name: "Compliance AI Enhancement",
        status: "completed",
        impact: "HIGH",
        effort: "HIGH",
        description: "Auto-extract requirements from RFPs using AI with structured data extraction",
        implementation: "Phase 2 + ComplianceMatrixGenerator - ✅ LIVE",
        estimatedTokens: "150K/month"
      }
    ]
  },
  {
    id: "phase2",
    name: "Phase 2: Analytics & Intelligence",
    duration: "Weeks 5-8",
    status: "completed",
    priority: "P1",
    features: [
      {
        name: "Win/Loss Pattern Recognition",
        status: "completed",
        impact: "MEDIUM",
        effort: "HIGH",
        description: "ML pattern matching across historical proposals",
        implementation: "WinLossAnalyzer Enhancement - ✅ LIVE",
        estimatedTokens: "60K/month"
      },
      {
        name: "Predictive Analytics Engine",
        status: "completed",
        impact: "MEDIUM",
        effort: "HIGH",
        description: "Time-series forecasting for revenue and win probability",
        implementation: "PredictiveAnalytics Enhancement - ✅ LIVE",
        estimatedTokens: "60K/month"
      },
      {
        name: "Client Churn Prediction",
        status: "completed",
        impact: "MEDIUM",
        effort: "MEDIUM",
        description: "Engagement pattern analysis with risk scoring",
        implementation: "ClientHealthMonitor Enhancement - ✅ LIVE",
        estimatedTokens: "30K/month"
      },
      {
        name: "Price-to-Win AI Analysis",
        status: "completed",
        impact: "MEDIUM",
        effort: "MEDIUM",
        description: "Competitive pricing intelligence using historical data",
        implementation: "PricingAnalyzer Enhancement - ✅ LIVE",
        estimatedTokens: "40K/month"
      }
    ]
  },
  {
    id: "phase3",
    name: "Phase 3: Calendar & Scheduling Intelligence",
    duration: "Weeks 9-12",
    status: "pending",
    priority: "P2",
    features: [
      {
        name: "Predictive Risk Alerts Engine",
        status: "pending",
        impact: "MEDIUM",
        effort: "HIGH",
        description: "Pattern-based delay prediction from task history",
        implementation: "PredictiveRiskAlerts + TaskPerformanceHistory",
        estimatedTokens: "40K/month"
      },
      {
        name: "Schedule Optimization Algorithm",
        status: "pending",
        impact: "MEDIUM",
        effort: "HIGH",
        description: "Constraint satisfaction solver with AI recommendations",
        implementation: "ScheduleOptimizer Enhancement",
        estimatedTokens: "40K/month"
      },
      {
        name: "Adaptive Learning Patterns",
        status: "pending",
        impact: "LOW",
        effort: "MEDIUM",
        description: "Pattern detection from user scheduling behavior",
        implementation: "AdaptiveLearningPanel + SchedulingPattern",
        estimatedTokens: "30K/month"
      },
      {
        name: "Time Debt AI Analysis",
        status: "pending",
        impact: "LOW",
        effort: "MEDIUM",
        description: "Productivity analysis with personalized recommendations",
        implementation: "TimeDebtTracker Enhancement",
        estimatedTokens: "20K/month"
      }
    ]
  },
  {
    id: "phase4",
    name: "Phase 4: Enhanced User Experience",
    duration: "Weeks 13-16",
    status: "pending",
    priority: "P3",
    features: [
      {
        name: "Smart Automation Suggestions",
        status: "pending",
        impact: "LOW",
        effort: "MEDIUM",
        description: "Behavioral analysis to suggest workflows",
        implementation: "SmartAutomationEngine Enhancement",
        estimatedTokens: "30K/month"
      },
      {
        name: "SAM.gov Opportunity Matching",
        status: "pending",
        impact: "MEDIUM",
        effort: "MEDIUM",
        description: "Semantic similarity between capabilities and requirements",
        implementation: "OpportunityFinder Enhancement",
        estimatedTokens: "80K/month"
      },
      {
        name: "AI Insights Enhancement",
        status: "pending",
        impact: "LOW",
        effort: "MEDIUM",
        description: "Anomaly detection and predictive insights",
        implementation: "AIInsightsCard Enhancement",
        estimatedTokens: "30K/month"
      },
      {
        name: "Proposal Comparison AI",
        status: "pending",
        impact: "LOW",
        effort: "MEDIUM",
        description: "Automated comparison analysis with winner prediction",
        implementation: "ProposalComparisonTool Enhancement",
        estimatedTokens: "40K/month"
      }
    ]
  }
];

const getStatusIcon = (status) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case "in_progress":
      return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
    case "pending":
      return <Circle className="w-5 h-5 text-slate-300" />;
    default:
      return <AlertCircle className="w-5 h-5 text-amber-600" />;
  }
};

const getImpactColor = (impact) => {
  switch (impact) {
    case "HIGH":
      return "bg-red-100 text-red-800";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800";
    case "LOW":
      return "bg-green-100 text-green-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

const getEffortColor = (effort) => {
  switch (effort) {
    case "HIGH":
      return "bg-red-100 text-red-800";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800";
    case "LOW":
      return "bg-green-100 text-green-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
};

export default function AIFeatureRoadmap() {
  const navigate = useNavigate();

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
              <h1 className="text-3xl font-bold text-slate-900">AI Feature Implementation Roadmap</h1>
              <p className="text-slate-600">Strategic plan for enhancing ProposalIQ.ai with advanced AI capabilities</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-4 mt-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-900 mb-1">Total Features</p>
                    <p className="text-3xl font-bold text-blue-600">16</p>
                  </div>
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-900 mb-1">High Impact</p>
                    <p className="text-3xl font-bold text-green-600">7</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-900 mb-1">Est. Duration</p>
                    <p className="text-3xl font-bold text-purple-600">16</p>
                    <p className="text-xs text-purple-800">weeks</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-900 mb-1">Token Budget</p>
                    <p className="text-3xl font-bold text-amber-600">~600K</p>
                    <p className="text-xs text-amber-800">per month</p>
                  </div>
                  <Award className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Roadmap Phases */}
        <div className="space-y-6">
          {ROADMAP_PHASES.map((phase) => (
            <Card key={phase.id} className="border-none shadow-xl">
              <CardHeader className={`${
                phase.status === 'in_progress' ? 'bg-gradient-to-r from-blue-50 to-indigo-50' :
                phase.status === 'completed' ? 'bg-gradient-to-r from-green-50 to-emerald-50' :
                'bg-slate-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {getStatusIcon(phase.status)}
                    <div>
                      <CardTitle className="text-xl mb-2">{phase.name}</CardTitle>
                      <CardDescription className="text-base">
                        {phase.duration} • Priority: {phase.priority}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={
                    phase.status === 'in_progress' ? 'bg-blue-600 text-white' :
                    phase.status === 'completed' ? 'bg-green-600 text-white' :
                    'bg-slate-500 text-white'
                  }>
                    {phase.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {phase.features.map((feature, idx) => (
                    <Card key={idx} className="border-2 hover:shadow-lg transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            {getStatusIcon(feature.status)}
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 mb-1">{feature.name}</h4>
                              <p className="text-sm text-slate-600 mb-2">{feature.description}</p>
                              <div className="flex flex-wrap gap-2 mb-2">
                                <Badge className={getImpactColor(feature.impact)}>
                                  Impact: {feature.impact}
                                </Badge>
                                <Badge className={getEffortColor(feature.effort)}>
                                  Effort: {feature.effort}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {feature.estimatedTokens}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500">
                                <strong>Implementation:</strong> {feature.implementation}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ROI Summary */}
        <Card className="mt-8 border-none shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Expected ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Time Savings</h4>
                <p className="text-3xl font-bold text-indigo-600">3-5x</p>
                <p className="text-sm text-slate-600">Improvement in proposal completion speed</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Win Rate Increase</h4>
                <p className="text-3xl font-bold text-green-600">15-25%</p>
                <p className="text-sm text-slate-600">Expected increase in proposal success</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Cost Efficiency</h4>
                <p className="text-3xl font-bold text-purple-600">40%</p>
                <p className="text-sm text-slate-600">Reduction in proposal development costs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <Target className="w-5 h-5 mr-2" />
            Start Phase 1 Implementation
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate(createPageUrl("AnalyticsDashboard"))}
          >
            View Analytics Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
