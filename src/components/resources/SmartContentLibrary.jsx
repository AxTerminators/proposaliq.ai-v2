import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  TrendingUp,
  Sparkles,
  Upload,
  Tag,
  Filter,
  BarChart3,
  Clock,
  Award,
  Loader2,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function SmartContentLibrary({ organization, currentProposal }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [semanticSearching, setSemanticSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [autoTagging, setAutoTagging] = useState(false);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['smart-resources', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalResource.filter({
        organization_id: organization.id
      }, '-created_date');
    },
    enabled: !!organization?.id,
    initialData: []
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['resource-recommendations', currentProposal?.id],
    queryFn: async () => {
      if (!currentProposal?.id || !organization?.id) return [];
      
      // Get recommendations based on current proposal
      const allResources = await base44.entities.ProposalResource.filter({
        organization_id: organization.id
      });

      // Filter resources not already linked to this proposal
      const unlinkedResources = allResources.filter(r => 
        !r.linked_proposal_ids?.includes(currentProposal.id)
      );

      // AI-powered recommendations
      if (unlinkedResources.length > 0) {
        const prompt = `You are a proposal content recommendation engine. Analyze the current proposal and recommend relevant resources.

**CURRENT PROPOSAL:**
- Name: ${currentProposal.proposal_name}
- Agency: ${currentProposal.agency_name || 'Unknown'}
- Type: ${currentProposal.project_type || 'Unknown'}
- Solicitation: ${currentProposal.solicitation_number || 'N/A'}

**AVAILABLE RESOURCES:**
${unlinkedResources.slice(0, 20).map(r => `
- ID: ${r.id}
- Title: ${r.title}
- Type: ${r.resource_type}
- Category: ${r.content_category || 'N/A'}
- Tags: ${r.tags?.join(', ') || 'None'}
- Usage: ${r.usage_count || 0} times, Win Rate: ${r.win_rate || 'Unknown'}%
`).join('\n')}

Recommend top 5 most relevant resources. For each, provide:
1. Resource ID
2. Relevance score (0-100)
3. Why it's relevant
4. How to use it effectively

Return JSON:
{
  "recommendations": [
    {
      "resource_id": "string",
      "relevance_score": number,
      "reason": "string",
      "usage_suggestion": "string"
    }
  ]
}`;

        try {
          const analysis = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
              type: "object",
              properties: {
                recommendations: { type: "array" }
              }
            }
          });

          return analysis.recommendations.map(rec => ({
            ...rec,
            resource: unlinkedResources.find(r => r.id === rec.resource_id)
          })).filter(rec => rec.resource);
        } catch (error) {
          console.error("Error getting recommendations:", error);
          return [];
        }
      }
      return [];
    },
    enabled: !!currentProposal?.id && !!organization?.id,
    initialData: []
  });

  const autoTagMutation = useMutation({
    mutationFn: async (resource) => {
      const prompt = `Analyze this proposal resource and generate smart tags, categories, and metadata.

**RESOURCE:**
- Title: ${resource.title}
- Type: ${resource.resource_type}
- Description: ${resource.description || 'N/A'}
- Current Tags: ${resource.tags?.join(', ') || 'None'}

Generate:
1. 5-10 relevant tags (specific keywords, topics, capabilities)
2. Best content category
3. Suggested agencies this applies to
4. Key topics covered

Return JSON:
{
  "tags": ["string"],
  "content_category": "string",
  "applicable_agencies": ["string"],
  "key_topics": ["string"],
  "summary": "string (one-sentence summary)"
}`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            tags: { type: "array" },
            content_category: { type: "string" },
            applicable_agencies: { type: "array" },
            key_topics: { type: "array" },
            summary: { type: "string" }
          }
        }
      });

      // Update resource with AI-generated metadata
      await base44.entities.ProposalResource.update(resource.id, {
        tags: [...new Set([...(resource.tags || []), ...analysis.tags])],
        content_category: analysis.content_category || resource.content_category,
        description: analysis.summary || resource.description
      });

      return analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-resources'] });
    }
  });

  const semanticSearchMutation = useMutation({
    mutationFn: async (query) => {
      if (!query.trim()) return resources;

      setSemanticSearching(true);

      const prompt = `You are a semantic search engine for proposal resources. Find resources that match the user's intent.

**USER QUERY:** "${query}"

**AVAILABLE RESOURCES:**
${resources.slice(0, 50).map(r => `
- ID: ${r.id}
- Title: ${r.title}
- Type: ${r.resource_type}
- Category: ${r.content_category || 'N/A'}
- Tags: ${r.tags?.join(', ') || 'None'}
- Description: ${r.description?.substring(0, 200) || 'N/A'}
`).join('\n')}

Return resource IDs ranked by relevance with scores:
{
  "results": [
    {
      "resource_id": "string",
      "relevance_score": number,
      "match_reason": "string"
    }
  ]
}`;

      const results = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            results: { type: "array" }
          }
        }
      });

      setSemanticSearching(false);

      return results.results
        .map(r => ({
          ...resources.find(res => res.id === r.resource_id),
          relevance_score: r.relevance_score,
          match_reason: r.match_reason
        }))
        .filter(r => r.id);
    }
  });

  const handleSemanticSearch = async () => {
    if (searchQuery.length > 3) {
      await semanticSearchMutation.mutateAsync(searchQuery);
    }
  };

  const handleAutoTag = async (resource) => {
    setAutoTagging(true);
    try {
      await autoTagMutation.mutateAsync(resource);
      alert(`✓ Auto-tagged: ${resource.title}`);
    } catch (error) {
      alert('Error auto-tagging resource');
    } finally {
      setAutoTagging(false);
    }
  };

  const handleBulkAutoTag = async () => {
    setAutoTagging(true);
    try {
      for (const resource of resources.slice(0, 10)) {
        if (!resource.tags || resource.tags.length < 3) {
          await autoTagMutation.mutateAsync(resource);
        }
      }
      alert('✓ Bulk auto-tagging complete!');
    } catch (error) {
      alert('Error during bulk tagging');
    } finally {
      setAutoTagging(false);
    }
  };

  // Calculate usage analytics
  const analytics = {
    totalResources: resources.length,
    mostUsed: resources.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))[0],
    highestWinRate: resources
      .filter(r => r.win_rate)
      .sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0))[0],
    recentlyAdded: resources.filter(r => {
      const daysSince = r.created_date 
        ? (new Date() - new Date(r.created_date)) / (1000 * 60 * 60 * 24)
        : 999;
      return daysSince <= 7;
    }).length,
    byCategory: resources.reduce((acc, r) => {
      const cat = r.content_category || 'uncategorized';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  };

  // Filter and sort resources
  const filteredResources = React.useMemo(() => {
    let filtered = semanticSearchMutation.data || resources;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.content_category === selectedCategory);
    }

    // Filter by search query (keyword search)
    if (searchQuery && !semanticSearchMutation.data) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.title?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered = [...filtered].sort((a, b) => 
          new Date(b.created_date || 0) - new Date(a.created_date || 0)
        );
        break;
      case 'usage':
        filtered = [...filtered].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
        break;
      case 'winrate':
        filtered = [...filtered].sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0));
        break;
      case 'relevance':
        filtered = [...filtered].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
        break;
    }

    return filtered;
  }, [resources, semanticSearchMutation.data, selectedCategory, searchQuery, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-700">{analytics.totalResources}</p>
            <p className="text-xs text-blue-900">Total Resources</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-700">
              {analytics.mostUsed?.usage_count || 0}
            </p>
            <p className="text-xs text-green-900">Most Used</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <Award className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-amber-700">
              {analytics.highestWinRate?.win_rate?.toFixed(0) || 0}%
            </p>
            <p className="text-xs text-amber-900">Highest Win Rate</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-purple-700">{analytics.recentlyAdded}</p>
            <p className="text-xs text-purple-900">Added This Week</p>
          </CardContent>
        </Card>
      </div>

      {/* Smart Recommendations */}
      {currentProposal && recommendations.length > 0 && (
        <Card className="border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              AI Recommendations for "{currentProposal.proposal_name}"
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec, idx) => (
                <Card key={idx} className="border-indigo-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{rec.resource?.title}</h4>
                          <Badge className="bg-indigo-600">
                            {rec.relevance_score}% Match
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          <strong>Why:</strong> {rec.reason}
                        </p>
                        <p className="text-sm text-indigo-700">
                          <strong>Tip:</strong> {rec.usage_suggestion}
                        </p>
                      </div>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Use This
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search resources... (try semantic search)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSemanticSearch()}
                className="pl-10"
              />
            </div>

            <Button
              onClick={handleSemanticSearch}
              disabled={semanticSearching || searchQuery.length < 3}
              variant="outline"
              className="bg-gradient-to-r from-purple-50 to-indigo-50"
            >
              {semanticSearching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Search
            </Button>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="company_overview">Company Overview</SelectItem>
                <SelectItem value="past_performance">Past Performance</SelectItem>
                <SelectItem value="technical_approach">Technical Approach</SelectItem>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="key_personnel">Key Personnel</SelectItem>
                <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="usage">Most Used</SelectItem>
                <SelectItem value="winrate">Highest Win Rate</SelectItem>
                {semanticSearchMutation.data && (
                  <SelectItem value="relevance">Most Relevant</SelectItem>
                )}
              </SelectContent>
            </Select>

            <Button
              onClick={handleBulkAutoTag}
              disabled={autoTagging}
              variant="outline"
            >
              {autoTagging ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Tag className="w-4 h-4 mr-2" />
              )}
              Auto-Tag All
            </Button>
          </div>

          {semanticSearchMutation.data && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                <Sparkles className="w-3 h-3 mr-1" />
                Semantic search active - showing AI-ranked results
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => semanticSearchMutation.reset()}
              >
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resources Grid */}
      <div className="grid gap-4">
        {filteredResources.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Resources Found</h3>
              <p className="text-slate-600 mb-4">
                {searchQuery 
                  ? 'Try different search terms or clear filters'
                  : 'Upload resources to build your content library'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredResources.map((resource) => (
            <Card key={resource.id} className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 truncate">{resource.title}</h3>
                        {resource.description && (
                          <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {resource.tags.slice(0, 5).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {resource.tags.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{resource.tags.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                      {resource.content_category && (
                        <Badge className="bg-blue-100 text-blue-700 capitalize">
                          {resource.content_category.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      {resource.usage_count > 0 && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Used {resource.usage_count}x
                        </div>
                      )}
                      {resource.win_rate && (
                        <div className="flex items-center gap-1">
                          <Award className="w-3 h-3 text-green-600" />
                          {resource.win_rate}% Win Rate
                        </div>
                      )}
                      {resource.created_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(resource.created_date), 'MMM d, yyyy')}
                        </div>
                      )}
                      {resource.relevance_score && (
                        <Badge className="bg-purple-100 text-purple-700">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {resource.relevance_score}% Relevant
                        </Badge>
                      )}
                    </div>

                    {/* AI Match Reason (for semantic search) */}
                    {resource.match_reason && (
                      <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-900">
                        <strong>AI Match:</strong> {resource.match_reason}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {resource.file_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAutoTag(resource)}
                      disabled={autoTagging}
                    >
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Usage Analytics Tab */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-3">Resources by Category</h4>
              <div className="space-y-2">
                {Object.entries(analytics.byCategory).map(([category, count]) => (
                  <div key={category} className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm capitalize">{category.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600"
                          style={{ width: `${(count / analytics.totalResources) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {analytics.mostUsed && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-sm text-green-900 mb-1">Most Used Resource</h4>
                <p className="text-sm text-green-800">
                  <strong>{analytics.mostUsed.title}</strong> - Used {analytics.mostUsed.usage_count} times
                </p>
              </div>
            )}

            {analytics.highestWinRate && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-semibold text-sm text-amber-900 mb-1">Highest Win Rate</h4>
                <p className="text-sm text-amber-800">
                  <strong>{analytics.highestWinRate.title}</strong> - {analytics.highestWinRate.win_rate}% win rate
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}