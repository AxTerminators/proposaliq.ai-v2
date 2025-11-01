import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  TrendingUp,
  Target,
  Calendar,
  AlertTriangle,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import moment from "moment";

export default function PredictiveAnalytics({ organization, proposals = [], snapshots = [] }) {
  const [generatingPredictions, setGeneratingPredictions] = useState(false);
  const [predictions, setPredictions] = useState(null);

  // Calculate predictions based on historical data
  const predictiveForecast = useMemo(() => {
    if (proposals.length < 3) return null;

    // Calculate historical win rate
    const decidedProposals = proposals.filter(p => ['won', 'lost'].includes(p.status));
    const wonProposals = proposals.filter(p => p.status === 'won');
    const winRate = decidedProposals.length > 0 
      ? (wonProposals.length / decidedProposals.length) * 100
      : 50;

    // Active proposals with completion data
    const activeProposals = proposals.filter(p => 
      ['draft', 'in_progress', 'evaluating', 'submitted'].includes(p.status)
    );

    // Calculate expected completion dates based on historical averages
    const avgTimeToComplete = snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + (s.total_time_in_pipeline_hours || 0), 0) / snapshots.length / 24
      : 30; // Default 30 days

    const forecastData = [];
    const weeks = 12; // Forecast 12 weeks ahead

    for (let i = 0; i < weeks; i++) {
      const weekStart = moment().add(i, 'weeks');
      const weekEnd = moment().add(i + 1, 'weeks');

      // Count proposals expected to complete this week
      const expectedCompletions = activeProposals.filter(p => {
        if (!p.created_date) return false;
        
        const expectedCompleteDate = moment(p.created_date).add(avgTimeToComplete, 'days');
        return expectedCompleteDate.isBetween(weekStart, weekEnd);
      }).length;

      // Estimate wins based on historical win rate
      const expectedWins = Math.round(expectedCompletions * (winRate / 100));

      forecastData.push({
        week: weekStart.format('MMM D'),
        expectedCompletions,
        expectedWins,
        cumulative: forecastData.reduce((sum, d) => sum + d.expectedWins, 0) + expectedWins
      });
    }

    return forecastData;
  }, [proposals, snapshots]);

  // Completion probability for individual proposals
  const proposalPredictions = useMemo(() => {
    const activeProposals = proposals.filter(p => 
      ['draft', 'in_progress', 'evaluating'].includes(p.status) && p.due_date
    );

    return activeProposals.map(p => {
      const daysUntilDue = moment(p.due_date).diff(moment(), 'days');
      const proposalSnapshots = snapshots.filter(s => s.proposal_id === p.id);
      
      let completionProbability = 50; // Default

      if (proposalSnapshots.length > 0) {
        const latestSnapshot = proposalSnapshots[proposalSnapshots.length - 1];
        const progress = latestSnapshot.completion_percentage || 0;
        const hoursInPipeline = latestSnapshot.total_time_in_pipeline_hours || 0;
        const daysInPipeline = hoursInPipeline / 24;

        // Simple prediction: based on progress vs time remaining
        const progressRate = daysInPipeline > 0 ? progress / daysInPipeline : 0;
        const requiredRate = daysUntilDue > 0 ? (100 - progress) / daysUntilDue : 100;

        if (progressRate >= requiredRate) {
          completionProbability = Math.min(95, 60 + (progressRate / requiredRate) * 35);
        } else {
          completionProbability = Math.max(10, 60 - ((requiredRate - progressRate) / requiredRate) * 50);
        }
      } else {
        // No snapshots, estimate based on time remaining
        if (daysUntilDue > 30) completionProbability = 80;
        else if (daysUntilDue > 14) completionProbability = 65;
        else if (daysUntilDue > 7) completionProbability = 50;
        else completionProbability = 30;
      }

      return {
        proposal: p,
        daysUntilDue,
        completionProbability: Math.round(completionProbability),
        risk: completionProbability < 50 ? 'high' : completionProbability < 75 ? 'medium' : 'low'
      };
    }).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [proposals, snapshots]);

  const generateAIPredictions = async () => {
    setGeneratingPredictions(true);
    try {
      const prompt = `You are an AI analytics engine for proposal management. Based on this pipeline data, generate predictions and insights.

**PIPELINE DATA:**
${JSON.stringify({
  total_proposals: proposals.length,
  active_proposals: proposals.filter(p => ['draft', 'in_progress'].includes(p.status)).length,
  win_rate: proposals.filter(p => ['won', 'lost'].includes(p.status)).length > 0
    ? (proposals.filter(p => p.status === 'won').length / proposals.filter(p => ['won', 'lost'].includes(p.status)).length * 100).toFixed(0)
    : 'N/A',
  avg_lead_time: snapshots.length > 0 
    ? Math.round(snapshots.reduce((sum, s) => sum + (s.total_time_in_pipeline_hours || 0), 0) / snapshots.length / 24)
    : 'N/A',
  at_risk_proposals: proposalPredictions.filter(p => p.risk === 'high').length
}, null, 2)}

Provide predictions for:
1. Next 30 days forecast
2. Risk factors
3. Opportunities for improvement
4. Resource allocation recommendations

Return JSON:
{
  "next_30_days": {
    "expected_completions": number,
    "expected_wins": number,
    "expected_revenue": number
  },
  "top_risks": [string],
  "top_opportunities": [string],
  "recommendations": [string]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            next_30_days: {
              type: "object",
              properties: {
                expected_completions: { type: "number" },
                expected_wins: { type: "number" },
                expected_revenue: { type: "number" }
              }
            },
            top_risks: { type: "array", items: { type: "string" } },
            top_opportunities: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setPredictions(result);
    } catch (error) {
      console.error("Error generating predictions:", error);
      alert("Error generating AI predictions: " + error.message);
    } finally {
      setGeneratingPredictions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ... keep existing code (header, key metrics cards) ... */}

      {/* Charts Tabs */}
      <Tabs defaultValue="lead-time" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="lead-time">Lead & Cycle Time</TabsTrigger>
          <TabsTrigger value="stage-duration">Stage Duration</TabsTrigger>
          <TabsTrigger value="cumulative-flow">Cumulative Flow</TabsTrigger>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
          <TabsTrigger value="efficiency">Process Efficiency</TabsTrigger>
          <TabsTrigger value="predictions">
            <Sparkles className="w-4 h-4 mr-1" />
            AI Predictions
          </TabsTrigger>
        </TabsList>

        {/* ... keep existing code (lead-time, stage-duration, cumulative-flow, velocity TabsContent) ... */}

        <TabsContent value="efficiency">
          <ProcessEfficiencyReport proposals={proposals} snapshots={snapshots} />
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-6 h-6 text-purple-600" />
                    AI-Powered Predictions
                  </CardTitle>
                  <CardDescription>
                    Forecast future outcomes and identify at-risk proposals
                  </CardDescription>
                </div>
                <Button onClick={generateAIPredictions} disabled={generatingPredictions}>
                  {generatingPredictions ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Insights
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {predictiveForecast && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-4">12-Week Forecast</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={predictiveForecast}>
                      <defs>
                        <linearGradient id="colorWins" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="expectedCompletions" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorCompletions)"
                        name="Expected Completions"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expectedWins" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorWins)"
                        name="Expected Wins"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {predictions && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white rounded-lg border-2 border-blue-200 text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {predictions.next_30_days.expected_completions}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">Expected Completions</div>
                      <div className="text-xs text-slate-500 mt-1">Next 30 days</div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border-2 border-green-200 text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {predictions.next_30_days.expected_wins}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">Expected Wins</div>
                      <div className="text-xs text-slate-500 mt-1">Based on win rate</div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border-2 border-purple-200 text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        ${(predictions.next_30_days.expected_revenue / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-sm text-slate-600 mt-1">Expected Revenue</div>
                      <div className="text-xs text-slate-500 mt-1">Pipeline value</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                      <div className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Top Risks
                      </div>
                      <ul className="space-y-2">
                        {predictions.top_risks?.map((risk, idx) => (
                          <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                            <span className="text-red-600 font-bold">•</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                      <div className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Opportunities
                      </div>
                      <ul className="space-y-2">
                        {predictions.top_opportunities?.map((opp, idx) => (
                          <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                            <span className="text-green-600 font-bold">•</span>
                            <span>{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Recommendations
                    </div>
                    <ul className="space-y-2">
                      {predictions.recommendations?.map((rec, idx) => (
                        <li key={idx} className="text-sm text-blue-800 flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                            {idx + 1}
                          </div>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* At-Risk Proposals */}
              {proposalPredictions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    Completion Risk Analysis
                  </h4>
                  <div className="space-y-3">
                    {proposalPredictions.slice(0, 5).map((pred, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "p-4 rounded-lg border-2",
                          pred.risk === 'high' && "bg-red-50 border-red-300",
                          pred.risk === 'medium' && "bg-amber-50 border-amber-300",
                          pred.risk === 'low' && "bg-green-50 border-green-300"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">{pred.proposal.proposal_name}</div>
                            <div className="text-sm text-slate-600 mt-1">
                              Due in {pred.daysUntilDue} days • {pred.proposal.agency_name}
                            </div>
                          </div>
                          <Badge className={cn(
                            pred.risk === 'high' && "bg-red-600 text-white",
                            pred.risk === 'medium' && "bg-amber-600 text-white",
                            pred.risk === 'low' && "bg-green-600 text-white"
                          )}>
                            {pred.risk} risk
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">On-time completion probability</span>
                            <span className={cn(
                              "font-semibold",
                              pred.completionProbability >= 75 && "text-green-600",
                              pred.completionProbability >= 50 && pred.completionProbability < 75 && "text-amber-600",
                              pred.completionProbability < 50 && "text-red-600"
                            )}>
                              {pred.completionProbability}%
                            </span>
                          </div>
                          <Progress value={pred.completionProbability} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}