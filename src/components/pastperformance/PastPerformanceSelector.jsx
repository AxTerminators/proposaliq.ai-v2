import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles,
  Target,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Award,
  Building2,
  DollarSign,
  Calendar,
  Star,
  AlertCircle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function PastPerformanceSelector({ proposalId, organizationId, proposalData, onSelect }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);

  useEffect(() => {
    const loadProjects = async () => {
      if (!organizationId) return;
      
      try {
        const projects = await base44.entities.PastPerformance.filter({
          organization_id: organizationId
        });
        setAllProjects(projects);
      } catch (error) {
        console.error("Error loading projects:", error);
      }
    };
    loadProjects();
  }, [organizationId]);

  const analyzeAndRecommend = async () => {
    if (!proposalId || !organizationId) {
      alert("Please save the proposal first");
      return;
    }

    if (allProjects.length === 0) {
      alert("No past performance projects found. Add some projects first in the Past Performance section.");
      return;
    }

    setIsAnalyzing(true);

    try {
      // Get comprehensive context
      const [solicitationDocs, complianceReqs, winThemes] = await Promise.all([
        base44.entities.SolicitationDocument.filter({
          proposal_id: proposalId,
          organization_id: organizationId
        }),
        base44.entities.ComplianceRequirement.filter({
          proposal_id: proposalId,
          organization_id: organizationId
        }),
        base44.entities.WinTheme.filter({
          proposal_id: proposalId,
          organization_id: organizationId,
          status: { $in: ['approved', 'reviewed'] }
        })
      ]);

      const fileUrls = solicitationDocs
        .filter(doc => doc.file_url)
        .map(doc => doc.file_url)
        .slice(0, 5);

      // Build context for AI
      const requirementsContext = complianceReqs
        .filter(req => req.requirement_category === 'mandatory')
        .slice(0, 10)
        .map(req => `- ${req.requirement_title}`)
        .join('\n');

      const winThemesContext = winThemes
        .slice(0, 5)
        .map(wt => `- ${wt.theme_title}: ${wt.theme_statement}`)
        .join('\n');

      const projectsContext = allProjects.map(p => `
**Project ID: ${p.id}**
- Name: ${p.project_name}
- Client: ${p.client_name} ${p.client_agency ? `(${p.client_agency})` : ''}
- Client Type: ${p.client_type}
- Value: $${p.contract_value?.toLocaleString() || 'N/A'}
- Type: ${p.contract_type}
- Status: ${p.status}
- NAICS: ${p.naics_codes?.join(', ') || 'N/A'}
- Services: ${p.services_provided?.slice(0, 5).join(', ') || 'N/A'}
- Technologies: ${p.technologies_used?.slice(0, 5).join(', ') || 'N/A'}
- Keywords: ${p.keywords?.join(', ') || 'N/A'}
- CPARS: ${p.cpars_rating}
- Quality Score: ${p.outcomes?.quality_score || 'N/A'}/5
- On-Time: ${p.outcomes?.on_time_delivery_pct || 'N/A'}%
- Description: ${p.project_description?.substring(0, 200) || 'N/A'}...
`).join('\n');

      const prompt = `You are an expert proposal strategist. Analyze this new proposal opportunity and recommend the MOST RELEVANT past performance examples from the provided projects.

**NEW PROPOSAL:**
- Proposal: ${proposalData.proposal_name}
- Agency: ${proposalData.agency_name}
- Project: ${proposalData.project_title}
- Type: ${proposalData.project_type}
- Estimated Value: ${proposalData.contract_value ? '$' + proposalData.contract_value.toLocaleString() : 'Unknown'}

**KEY REQUIREMENTS:**
${requirementsContext || 'N/A'}

**WIN THEMES:**
${winThemesContext || 'N/A'}

**AVAILABLE PAST PERFORMANCE PROJECTS:**
${projectsContext}

**YOUR TASK:**
Analyze each project and score its relevance to this new proposal. Consider:
1. **Technical Relevance** - Similar services, technologies, scope
2. **Client Similarity** - Same agency type, similar client, same domain
3. **Contract Similarity** - Similar value range, contract type
4. **Requirements Match** - Project demonstrates capabilities needed
5. **Win Theme Alignment** - Project supports our win themes
6. **Quality Indicators** - Strong CPARS, metrics, outcomes
7. **Recency** - More recent is generally better

Return JSON with recommendations:
{
  "recommended_projects": [
    {
      "project_id": "string",
      "project_name": "string",
      "relevance_score": number (0-100),
      "relevance_category": "highly_relevant|relevant|somewhat_relevant",
      "why_relevant": "string (2-3 sentences explaining relevance)",
      "strengths": ["string (specific strengths for this proposal)"],
      "how_to_use": "string (how to position this in the proposal)",
      "requirements_addressed": ["string (which requirements this demonstrates)"],
      "win_themes_supported": ["string (which win themes this supports)"],
      "recommended_narrative_type": "technical|executive|brief",
      "priority": "must_include|should_include|optional"
    }
  ],
  "usage_strategy": {
    "executive_summary_projects": ["project_id"],
    "technical_volume_projects": ["project_id"],
    "past_performance_volume_projects": ["project_id"],
    "max_projects_recommended": number
  },
  "gaps_identified": ["string (capabilities we're missing in past performance)"],
  "overall_recommendation": "string (strategic advice on past performance approach)"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_projects: { type: "array" },
            usage_strategy: { type: "object" },
            gaps_identified: { type: "array" },
            overall_recommendation: { type: "string" }
          }
        }
      });

      // Enrich recommendations with full project data
      const enrichedRecommendations = result.recommended_projects.map(rec => {
        const project = allProjects.find(p => p.id === rec.project_id);
        return { ...rec, project };
      });

      setRecommendations({
        ...result,
        recommended_projects: enrichedRecommendations
      });

      // Auto-select must_include projects
      const mustInclude = enrichedRecommendations
        .filter(rec => rec.priority === 'must_include')
        .map(rec => rec.project_id);
      setSelectedProjects(mustInclude);

      alert(`✓ AI analyzed ${allProjects.length} projects and found ${enrichedRecommendations.length} relevant matches!`);

    } catch (error) {
      console.error("Error analyzing projects:", error);
      alert("Error analyzing past performance. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleProject = (projectId) => {
    if (selectedProjects.includes(projectId)) {
      setSelectedProjects(selectedProjects.filter(id => id !== projectId));
    } else {
      setSelectedProjects([...selectedProjects, projectId]);
    }
  };

  const handleUseSelected = () => {
    const selectedFullProjects = allProjects.filter(p => selectedProjects.includes(p.id));
    if (onSelect) {
      onSelect(selectedFullProjects);
    }
  };

  const getRelevanceBadgeColor = (category) => {
    switch (category) {
      case 'highly_relevant':
        return 'bg-green-100 text-green-700';
      case 'relevant':
        return 'bg-blue-100 text-blue-700';
      case 'somewhat_relevant':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'must_include':
        return 'bg-red-100 text-red-700';
      case 'should_include':
        return 'bg-amber-100 text-amber-700';
      case 'optional':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Target className="w-6 h-6 text-indigo-600" />
                AI Past Performance Recommender
              </CardTitle>
              <CardDescription>
                Get intelligent recommendations for which past performance examples to include
              </CardDescription>
            </div>
            <Button
              onClick={analyzeAndRecommend}
              disabled={isAnalyzing || allProjects.length === 0}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze & Recommend
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {!recommendations && (
          <CardContent>
            <Alert className="bg-white">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
              <AlertDescription>
                <p className="font-semibold text-indigo-900 mb-2">AI will analyze:</p>
                <ul className="text-sm text-indigo-800 space-y-1">
                  <li>✓ Technical relevance to solicitation requirements</li>
                  <li>✓ Client and agency similarity</li>
                  <li>✓ Alignment with your win themes</li>
                  <li>✓ Contract value and type match</li>
                  <li>✓ Quality indicators (CPARS, metrics)</li>
                  <li>✓ {allProjects.length} available projects in your library</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {isAnalyzing && (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <AlertDescription>
            <p className="font-semibold text-blue-900">AI is analyzing your past performance library...</p>
            <p className="text-sm text-blue-700 mt-1">
              Matching projects to requirements, scoring relevance, and developing usage strategy...
            </p>
          </AlertDescription>
        </Alert>
      )}

      {recommendations && (
        <>
          {/* Overall Strategy */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Strategic Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-green-900">{recommendations.overall_recommendation}</p>
              
              {recommendations.usage_strategy && (
                <div className="grid md:grid-cols-3 gap-3 mt-3">
                  <div className="p-3 bg-white border rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">Executive Summary</p>
                    <p className="text-lg font-bold text-slate-900">
                      {recommendations.usage_strategy.executive_summary_projects?.length || 0} projects
                    </p>
                  </div>
                  <div className="p-3 bg-white border rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">Technical Volume</p>
                    <p className="text-lg font-bold text-slate-900">
                      {recommendations.usage_strategy.technical_volume_projects?.length || 0} projects
                    </p>
                  </div>
                  <div className="p-3 bg-white border rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">Past Performance Volume</p>
                    <p className="text-lg font-bold text-slate-900">
                      {recommendations.usage_strategy.past_performance_volume_projects?.length || 0} projects
                    </p>
                  </div>
                </div>
              )}

              {recommendations.gaps_identified?.length > 0 && (
                <Alert variant="default" className="bg-amber-50 border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <AlertDescription>
                    <p className="font-semibold text-amber-900 mb-1">Gaps in Past Performance:</p>
                    <ul className="text-sm text-amber-800 space-y-1">
                      {recommendations.gaps_identified.map((gap, idx) => (
                        <li key={idx}>• {gap}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Project Recommendations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Recommended Projects ({recommendations.recommended_projects.length})
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">
                  {selectedProjects.length} selected
                </span>
                <Button
                  onClick={handleUseSelected}
                  disabled={selectedProjects.length === 0}
                  size="sm"
                >
                  Use Selected
                </Button>
              </div>
            </div>

            {recommendations.recommended_projects.map((rec, idx) => (
              <Card key={idx} className="border-none shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedProjects.includes(rec.project_id)}
                      onCheckedChange={() => toggleProject(rec.project_id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-slate-900">{rec.project_name}</h4>
                            {rec.project?.is_featured && (
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge className={getRelevanceBadgeColor(rec.relevance_category)}>
                              {rec.relevance_category?.replace('_', ' ')}
                            </Badge>
                            <Badge className={getPriorityBadgeColor(rec.priority)}>
                              {rec.priority?.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {rec.project?.cpars_rating && rec.project.cpars_rating !== 'N/A' && (
                              <Badge className="bg-green-100 text-green-700">
                                CPARS: {rec.project.cpars_rating}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Progress value={rec.relevance_score} className="w-24 h-2" />
                            <span className="font-bold text-slate-900">{rec.relevance_score}%</span>
                          </div>
                          <p className="text-xs text-slate-600">Relevance Score</p>
                        </div>
                      </div>

                      {rec.project && (
                        <div className="grid md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-xs text-slate-600">Client</p>
                              <p className="text-sm font-medium text-slate-900">
                                {rec.project.client_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-xs text-slate-600">Value</p>
                              <p className="text-sm font-medium text-slate-900">
                                ${rec.project.contract_value?.toLocaleString() || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-xs text-slate-600">Period</p>
                              <p className="text-sm font-medium text-slate-900">
                                {rec.project.start_date ? new Date(rec.project.start_date).getFullYear() : 'N/A'} - 
                                {rec.project.end_date ? new Date(rec.project.end_date).getFullYear() : 'Present'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Why It's Relevant:</p>
                        <p className="text-sm text-blue-800">{rec.why_relevant}</p>
                      </div>

                      {rec.strengths?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-700 mb-2">Strengths for This Proposal:</p>
                          <div className="flex flex-wrap gap-2">
                            {rec.strengths.map((strength, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {strength}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {rec.requirements_addressed?.length > 0 && (
                        <div className="p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-xs font-semibold text-green-900 mb-1">
                            Addresses Requirements:
                          </p>
                          <p className="text-xs text-green-800">
                            {rec.requirements_addressed.join(', ')}
                          </p>
                        </div>
                      )}

                      {rec.win_themes_supported?.length > 0 && (
                        <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                          <p className="text-xs font-semibold text-purple-900 mb-1">
                            Supports Win Themes:
                          </p>
                          <p className="text-xs text-purple-800">
                            {rec.win_themes_supported.join(', ')}
                          </p>
                        </div>
                      )}

                      <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                        <p className="text-xs font-semibold text-amber-900 mb-1">
                          How to Use:
                        </p>
                        <p className="text-xs text-amber-800">{rec.how_to_use}</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Recommended narrative: <strong>{rec.recommended_narrative_type}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}