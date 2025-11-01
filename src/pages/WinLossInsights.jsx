import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingDown, TrendingUp, Target, AlertCircle, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function WinLossInsights() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: analyses, isLoading } = useQuery({
    queryKey: ['winloss-analyses', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.WinLossAnalysis.filter(
        { organization_id: organization.id },
        '-decision_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const wonAnalyses = analyses.filter(a => a.outcome === 'won');
  const lostAnalyses = analyses.filter(a => a.outcome === 'lost');

  // Aggregate insights
  const allWinFactors = wonAnalyses.flatMap(a => a.primary_win_factors || []);
  const allLossFactors = lostAnalyses.flatMap(a => a.primary_loss_factors || []);
  const allLessons = analyses.flatMap(a => 
    (a.lessons_learned || []).map(l => l.lesson || l)
  );

  // Count frequency
  const factorCounts = (factors) => {
    const counts = {};
    factors.forEach(f => {
      counts[f] = (counts[f] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const topWinFactors = factorCounts(allWinFactors);
  const topLossFactors = factorCounts(allLossFactors);

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Win/Loss Insights</h1>
        <p className="text-slate-600">Aggregate lessons and patterns from your proposals</p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Analysis Data Yet</h3>
            <p className="text-slate-600">
              Start capturing win/loss analyses to see insights
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Analyzed
                </CardTitle>
                <Target className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{analyses.length}</div>
                <p className="text-xs text-slate-500 mt-1">
                  Proposals analyzed
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Wins
                </CardTitle>
                <Trophy className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{wonAnalyses.length}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {analyses.length > 0 ? Math.round((wonAnalyses.length / analyses.length) * 100) : 0}% win rate
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Losses
                </CardTitle>
                <TrendingDown className="w-4 h-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{lostAnalyses.length}</div>
                <p className="text-xs text-slate-500 mt-1">
                  Opportunities for improvement
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Lessons Learned
                </CardTitle>
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{allLessons.length}</div>
                <p className="text-xs text-slate-500 mt-1">
                  Captured insights
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Factors */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Top Win Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topWinFactors.length === 0 ? (
                  <p className="text-sm text-slate-500">No win factors captured yet</p>
                ) : (
                  <div className="space-y-3">
                    {topWinFactors.map(([factor, count], idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{factor}</p>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${(count / wonAnalyses.length) * 100}%` }}
                            />
                          </div>
                        </div>
                        <Badge className="ml-3 bg-green-100 text-green-800">{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Top Loss Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topLossFactors.length === 0 ? (
                  <p className="text-sm text-slate-500">No loss factors captured yet</p>
                ) : (
                  <div className="space-y-3">
                    {topLossFactors.map(([factor, count], idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{factor}</p>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-red-500 h-2 rounded-full transition-all"
                              style={{ width: `${(count / lostAnalyses.length) * 100}%` }}
                            />
                          </div>
                        </div>
                        <Badge className="ml-3 bg-red-100 text-red-800">{count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Lessons */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                Recent Lessons Learned
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allLessons.length === 0 ? (
                <p className="text-sm text-slate-500">No lessons learned captured yet</p>
              ) : (
                <div className="space-y-2">
                  {allLessons.slice(0, 10).map((lesson, idx) => (
                    <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-slate-900">{lesson}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}