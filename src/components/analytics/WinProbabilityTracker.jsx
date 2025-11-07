import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Award,
  DollarSign,
  Users,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Loader2,
  ChevronRight,
  Sparkles,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import moment from "moment";

export default function WinProbabilityTracker({ proposal, organization, showCompact = false }) {
  const queryClient = useQueryClient();
  const [isCalculating, setIsCalculating] = useState(false);
  const [winProbability, setWinProbability] = useState(null);
  const [factorBreakdown, setFactorBreakdown] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [peerComparison, setPeerComparison] = useState(null);

  // Load historical snapshots for trend analysis
  const { data: snapshots = [] } = useQuery({
    queryKey: ['win-probability-snapshots', proposal.id],
    queryFn: async () => {
      if (!proposal.id) return [];
      
      // Check if we have a custom entity for win probability history
      // For now, we'll use ProposalMetricSnapshot
      const snaps = await base44.entities.ProposalMetricSnapshot.filter({
        proposal_id: proposal.id
      }, 'snapshot_date');
      
      return snaps.filter(s => s.ai_win_probability);
    },
    enabled: !!proposal.id,
    initialData: []
  });

  // Load similar proposals for peer comparison
  const { data: similarProposals = [] } = useQuery({
    queryKey: ['similar-proposals-win', organization?.id, proposal.agency_name],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const allProposals = await base44.entities.Proposal.filter({
        organization_id: organization.id,
        status: { $in: ['won', 'lost', 'submitted'] }
      }, '-created_date', 50);

      // Filter for similar proposals (same agency or project type)
      return allProposals.filter(p => 
        p.agency_name === proposal.agency_name || 
        p.project_type === proposal.project_type
      );
    },
    enabled: !!organization?.id,
    initialData: []
  });

  const calculateWinProbability = async () => {
    if (!proposal.id || !organization?.id) return;
    
    setIsCalculating(true);
    
    try {
      // Gather all relevant data
      const [tasks, sections, complianceReqs, winThemes, healthMetrics, pastPerformance] = await Promise.all([
        base44.entities.ProposalTask.filter({ proposal_id: proposal.id }),
        base44.entities.ProposalSection.filter({ proposal_id: proposal.id }),
        base44.entities.ComplianceRequirement.filter({ proposal_id: proposal.id }),
        base44.entities.WinTheme.filter({ proposal_id: proposal.id }),
        base44.entities.ProposalHealthMetric.filter({ proposal_id: proposal.id }),
        base44.entities.PastPerformance.filter({ 
          organization_id: organization.id,
          used_in_proposals: proposal.id 
        })
      ]);

      // Calculate basic metrics
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
      
      const approvedSections = sections.filter(s => s.status === 'approved').length;
      const sectionCompletionRate = sections.length > 0 ? (approvedSections / sections.length) * 100 : 0;
      
      const compliantReqs = complianceReqs.filter(c => c.compliance_status === 'compliant').length;
      const complianceRate = complianceReqs.length > 0 ? (compliantReqs / complianceReqs.length) * 100 : 0;
      
      const approvedThemes = winThemes.filter(t => t.status === 'approved').length;
      
      const daysUntilDue = proposal.due_date ? moment(proposal.due_date).diff(moment(), 'days') : 999;

      // Historical win rate
      const historicalWins = similarProposals.filter(p => p.status === 'won').length;
      const historicalWinRate = similarProposals.length > 0 ? (historicalWins / similarProposals.length) * 100 : 50;

      // AI Analysis
      const prompt = `You are an expert proposal win probability analyzer. Calculate the win probability for this proposal.

**PROPOSAL DATA:**
- Name: ${proposal.proposal_name}
- Agency: ${proposal.agency_name}
- Contract Value: $${proposal.contract_value?.toLocaleString() || 'Unknown'}
- Project Type: ${proposal.project_type}
- Due Date: ${proposal.due_date} (${daysUntilDue} days remaining)
- Current Phase: ${proposal.current_phase}

**COMPLETION METRICS:**
- Tasks: ${completedTasks}/${tasks.length} complete (${taskCompletionRate.toFixed(0)}%)
- Sections: ${approvedSections}/${sections.length} approved (${sectionCompletionRate.toFixed(0)}%)
- Compliance: ${compliantReqs}/${complianceReqs.length} met (${complianceRate.toFixed(0)}%)
- Win Themes: ${approvedThemes} approved themes
- Past Performance: ${pastPerformance.length} projects referenced

**HISTORICAL CONTEXT:**
- Similar proposals: ${similarProposals.length} total
- Historical win rate: ${historicalWinRate.toFixed(0)}%
- Won: ${historicalWins}, Lost: ${similarProposals.filter(p => p.status === 'lost').length}

**PROVIDE DETAILED ANALYSIS:**
1. **Overall Win Probability** (0-100%)
2. **Factor Breakdown** - How each factor impacts probability (positive/negative %)
   - Past Performance Quality
   - Technical Approach Strength
   - Pricing Competitiveness
   - Compliance Readiness
   - Win Theme Effectiveness
   - Team Qualifications
   - Proposal Completeness
   - Time Management
3. **Actionable Recommendations** - Specific actions to increase win probability
4. **Peer Benchmarking** - How this compares to similar proposals
5. **Critical Success Factors** - What matters most for winning this one

Return JSON:
{
  "win_probability": number,
  "confidence_level": "high|medium|low",
  "factor_breakdown": [
    {
      "factor": "string",
      "impact_percentage": number,
      "current_score": number,
      "max_score": number,
      "trend": "improving|stable|declining",
      "description": "string"
    }
  ],
  "recommendations": [
    {
      "priority": number,
      "action": "string",
      "potential_impact": number,
      "effort_hours": number,
      "category": "technical|pricing|compliance|team|content|strategy"
    }
  ],
  "peer_comparison": {
    "your_probability": number,
    "similar_proposals_avg": number,
    "percentile_rank": number,
    "comparison_note": "string"
  },
  "critical_success_factors": [
    {
      "factor": "string",
      "importance": "critical|high|medium",
      "current_status": "strong|adequate|weak|missing",
      "action_needed": "string"
    }
  ],
  "probability_trend": "increasing|stable|decreasing",
  "key_risks": ["string"],
  "key_strengths": ["string"],
  "win_probability_range": {
    "low": number,
    "mid": number,
    "high": number
  }
}`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            win_probability: { type: "number" },
            confidence_level: { type: "string" },
            factor_breakdown: { type: "array" },
            recommendations: { type: "array" },
            peer_comparison: { type: "object" },
            critical_success_factors: { type: "array" },
            probability_trend: { type: "string" },
            key_risks: { type: "array" },
            key_strengths: { type: "array" },
            win_probability_range: { type: "object" }
          }
        }
      });

      setWinProbability(analysis.win_probability);
      setFactorBreakdown(analysis.factor_breakdown || []);
      setRecommendations(analysis.recommendations?.sort((a, b) => a.priority - b.priority) || []);
      setPeerComparison(analysis.peer_comparison);

      // Build trend data from snapshots + current
      const trendHistory = snapshots.map(s => ({
        date: moment(s.snapshot_date).format('MMM D'),
        probability: s.ai_win_probability,
        stage: s.stage
      }));
      
      trendHistory.push({
        date: moment().format('MMM D'),
        probability: analysis.win_probability,
        stage: proposal.current_phase
      });
      
      setTrendData(trendHistory);

      // Save snapshot
      await base44.entities.ProposalMetricSnapshot.create({
        organization_id: organization.id,
        proposal_id: proposal.id,
        snapshot_date: new Date().toISOString(),
        stage: proposal.current_phase || proposal.status,
        status: proposal.status,
        ai_win_probability: analysis.win_probability,
        snapshot_type: 'manual',
        completion_percentage: sectionCompletionRate,
        tasks_completed: completedTasks,
        tasks_total: tasks.length
      });

    } catch (error) {
      console.error("Error calculating win probability:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (proposal?.id && organization?.id && !winProbability) {
      calculateWinProbability();
    }
  }, [proposal?.id, organization?.id]);

  if (showCompact && winProbability !== null) {
    return (
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold",
          winProbability >= 70 ? 'bg-green-100 text-green-700' :
          winProbability >= 50 ? 'bg-yellow-100 text-yellow-700' :
          winProbability >= 30 ? 'bg-orange-100 text-orange-700' :
          'bg-red-100 text-red-700'
        )}>
          <Target className="w-3 h-3" />
          {winProbability}%
        </div>
      </div>
    );
  }

  if (!winProbability && isCalculating) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-slate-600">Calculating win probability...</p>
        </CardContent>
      </Card>
    );
  }

  if (!winProbability) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-8 text-center">
          <Button onClick={calculateWinProbability} disabled={isCalculating}>
            <Sparkles className="w-4 h-4 mr-2" />
            Calculate Win Probability
          </Button>
        </CardContent>
      </Card>
    );
  }

  const probabilityColor = winProbability >= 70 ? 'green' :
                          winProbability >= 50 ? 'yellow' :
                          winProbability >= 30 ? 'orange' : 'red';

  const colorClasses = {
    green: 'bg-green-100 text-green-700 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    orange: 'bg-orange-100 text-orange-700 border-orange-300',
    red: 'bg-red-100 text-red-700 border-red-300'
  };

  return (
    <div className="space-y-6">
      {/* Main Win Probability Card */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-600" />
              Win Probability Analysis
            </CardTitle>
            <Button
              onClick={calculateWinProbability}
              disabled={isCalculating}
              size="sm"
              variant="outline"
            >
              <Sparkles className={cn("w-4 h-4 mr-2", isCalculating && "animate-spin")} />
              Recalculate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            {/* Big Number */}
            <div className={cn(
              "w-40 h-40 rounded-full flex flex-col items-center justify-center border-8",
              winProbability >= 70 ? 'bg-green-50 border-green-500' :
              winProbability >= 50 ? 'bg-yellow-50 border-yellow-500' :
              winProbability >= 30 ? 'bg-orange-50 border-orange-500' :
              'bg-red-50 border-red-500'
            )}>
              <div className={cn(
                "text-5xl font-bold",
                winProbability >= 70 ? 'text-green-700' :
                winProbability >= 50 ? 'text-yellow-700' :
                winProbability >= 30 ? 'text-orange-700' :
                'text-red-700'
              )}>
                {winProbability}%
              </div>
              <p className="text-xs text-slate-600 mt-1">Win Probability</p>
            </div>

            {/* Quick Stats */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-lg border-2 border-blue-200">
                <p className="text-xs text-slate-600 mb-1">Low Estimate</p>
                <p className="text-2xl font-bold text-blue-700">
                  {factorBreakdown.length > 0 ? (winProbability - 15) : '--'}%
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border-2 border-indigo-200">
                <p className="text-xs text-slate-600 mb-1">High Estimate</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {factorBreakdown.length > 0 ? (winProbability + 15) : '--'}%
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border-2 border-purple-200">
                <p className="text-xs text-slate-600 mb-1">Trend</p>
                <div className="flex items-center gap-2">
                  {trendData.length >= 2 && trendData[trendData.length - 1].probability > trendData[trendData.length - 2].probability ? (
                    <>
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="text-lg font-bold text-green-700">Increasing</span>
                    </>
                  ) : trendData.length >= 2 && trendData[trendData.length - 1].probability < trendData[trendData.length - 2].probability ? (
                    <>
                      <TrendingDown className="w-5 h-5 text-red-600" />
                      <span className="text-lg font-bold text-red-700">Decreasing</span>
                    </>
                  ) : (
                    <>
                      <Minus className="w-5 h-5 text-slate-600" />
                      <span className="text-lg font-bold text-slate-700">Stable</span>
                    </>
                  )}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border-2 border-amber-200">
                <p className="text-xs text-slate-600 mb-1">vs Peers</p>
                <p className="text-2xl font-bold text-amber-700">
                  {peerComparison ? `${peerComparison.percentile_rank}th` : '--'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Probability Trend Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="probability" 
                  stroke="#3b82f6" 
                  fill="#bfdbfe"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Factor Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Factor Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {factorBreakdown.map((factor, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{factor.factor}</span>
                  {factor.trend === 'improving' && <TrendingUp className="w-4 h-4 text-green-600" />}
                  {factor.trend === 'declining' && <TrendingDown className="w-4 h-4 text-red-600" />}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600">
                    {factor.current_score}/{factor.max_score}
                  </span>
                  <Badge className={cn(
                    "font-semibold",
                    factor.impact_percentage >= 0 ? 'bg-green-600' : 'bg-red-600'
                  )}>
                    {factor.impact_percentage >= 0 ? '+' : ''}{factor.impact_percentage}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={(factor.current_score / factor.max_score) * 100} 
                className="h-2"
              />
              <p className="text-xs text-slate-600">{factor.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Priority Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-blue-900">
              <Zap className="w-5 h-5" />
              Actions to Increase Win Probability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.slice(0, 5).map((rec, idx) => (
              <Card key={idx} className="border-2 border-blue-200 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {rec.priority}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-semibold text-sm">{rec.action}</p>
                        <Badge className="bg-green-600 flex-shrink-0">
                          +{rec.potential_impact}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span>⏱️ {rec.effort_hours}h effort</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {rec.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <p className="text-sm text-green-900">
                <strong>Potential Impact:</strong> Completing these top 5 actions could increase your win probability to{' '}
                <strong className="text-green-700 text-lg">
                  {Math.min(100, winProbability + recommendations.slice(0, 5).reduce((sum, r) => sum + r.potential_impact, 0))}%
                </strong>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Peer Comparison */}
      {peerComparison && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Peer Benchmarking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <p className="text-xs text-slate-600 mb-1">Your Probability</p>
                <p className="text-3xl font-bold text-blue-700">{peerComparison.your_probability}%</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                <p className="text-xs text-slate-600 mb-1">Similar Proposals Avg</p>
                <p className="text-3xl font-bold text-slate-700">{peerComparison.similar_proposals_avg}%</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                <p className="text-xs text-slate-600 mb-1">Your Percentile</p>
                <p className="text-3xl font-bold text-amber-700">{peerComparison.percentile_rank}th</p>
              </div>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-indigo-900">{peerComparison.comparison_note}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}