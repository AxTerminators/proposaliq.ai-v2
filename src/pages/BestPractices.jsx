import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Search,
  Star,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileText,
  Shield,
  TrendingUp,
  Loader2,
  Brain,
  Award,
  Target,
  Zap,
  Eye,
  BookmarkPlus,
  Bookmark
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from 'react-markdown';

export default function BestPractices() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showArticle, setShowArticle] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const orgs = await base44.entities.Organization.filter(
        { created_by: currentUser.email },
        '-created_date',
        1
      );

      if (orgs.length > 0) {
        setOrganization(orgs[0]);
        
        // Load bookmarks from user data or localStorage
        const saved = localStorage.getItem(`bookmarks_${currentUser.email}`);
        if (saved) {
          setBookmarkedIds(JSON.parse(saved));
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const { data: content = [], isLoading } = useQuery({
    queryKey: ['best-practices'],
    queryFn: async () => {
      // Get all public admin content
      const allContent = await base44.entities.AdminData.filter({
        is_public: true
      }, '-created_date');

      return allContent;
    },
  });

  const handleGetAIRecommendations = async () => {
    if (!organization) return;

    setLoadingRecommendations(true);
    try {
      // Get recent proposals to understand context
      const proposals = await base44.entities.Proposal.filter({
        organization_id: organization.id
      }, '-created_date', 5);

      const industries = [...new Set(proposals.map(p => p.agency_name).filter(Boolean))];
      const projectTypes = [...new Set(proposals.map(p => p.project_type).filter(Boolean))];

      const prompt = `Based on this organization's proposal activity, recommend 5 best practices articles they should read:

**Their Context:**
- Industries/Agencies: ${industries.join(', ') || 'General'}
- Project Types: ${projectTypes.join(', ') || 'Various'}
- Total Proposals: ${proposals.length}

**Available Content Categories:**
- Writing Guides (technical writing, executive summaries, etc.)
- Compliance Checklists (FAR, DFARS, etc.)
- Industry Tips (agency-specific guidance)
- Sample Language (boilerplate, templates)
- Common Mistakes (what to avoid)

Provide recommendations as JSON array:
[
  {
    "category": "writing_guide",
    "title": "...",
    "reason": "...",
    "priority": "high"
  }
]`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  title: { type: "string" },
                  reason: { type: "string" },
                  priority: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAiRecommendations(response.recommendations || []);

    } catch (error) {
      console.error("Error getting recommendations:", error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const toggleBookmark = (id) => {
    const newBookmarks = bookmarkedIds.includes(id)
      ? bookmarkedIds.filter(bid => bid !== id)
      : [...bookmarkedIds, id];
    
    setBookmarkedIds(newBookmarks);
    localStorage.setItem(`bookmarks_${user.email}`, JSON.stringify(newBookmarks));
  };

  const filteredContent = content.filter(item => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filterCategory === "all" || item.data_type === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (type) => {
    switch (type) {
      case 'training_material': return BookOpen;
      case 'guideline': return Lightbulb;
      case 'far_regulation': return Shield;
      case 'dfars': return Shield;
      case 'template': return FileText;
      default: return BookOpen;
    }
  };

  const getCategoryColor = (type) => {
    switch (type) {
      case 'training_material': return 'bg-blue-100 text-blue-700';
      case 'guideline': return 'bg-amber-100 text-amber-700';
      case 'far_regulation': return 'bg-red-100 text-red-700';
      case 'dfars': return 'bg-purple-100 text-purple-700';
      case 'template': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getCategoryLabel = (type) => {
    const labels = {
      'training_material': 'Training',
      'guideline': 'Best Practice',
      'far_regulation': 'FAR Regulation',
      'dfars': 'DFARS',
      'template': 'Template'
    };
    return labels[type] || type;
  };

  // Organize content by type
  const writingGuides = filteredContent.filter(c => c.data_type === 'training_material' && c.category?.includes('writing'));
  const complianceContent = filteredContent.filter(c => c.data_type === 'far_regulation' || c.data_type === 'dfars');
  const industryTips = filteredContent.filter(c => c.data_type === 'guideline');
  const sampleLanguage = filteredContent.filter(c => c.data_type === 'template');
  const bookmarkedContent = filteredContent.filter(c => bookmarkedIds.includes(c.id));

  const ContentCard = ({ item }) => {
    const Icon = getCategoryIcon(item.data_type);
    const isBookmarked = bookmarkedIds.includes(item.id);

    return (
      <Card className="border-none shadow-lg hover:shadow-xl transition-all group cursor-pointer">
        <CardContent className="p-6" onClick={() => {
          setSelectedArticle(item);
          setShowArticle(true);
        }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex gap-2">
              <Badge className={getCategoryColor(item.data_type)}>
                {getCategoryLabel(item.data_type)}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(item.id);
                }}
              >
                {isBookmarked ? (
                  <Bookmark className="w-4 h-4 fill-amber-500 text-amber-500" />
                ) : (
                  <BookmarkPlus className="w-4 h-4 text-slate-400" />
                )}
              </Button>
            </div>
          </div>

          <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
            {item.title}
          </h3>

          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
            {item.content?.substring(0, 150)}...
          </p>

          {item.category && (
            <Badge variant="outline" className="text-xs capitalize">
              {item.category}
            </Badge>
          )}

          {item.is_proprietary && (
            <Badge className="bg-indigo-100 text-indigo-700 text-xs ml-2">
              <Star className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Best Practices Library</h1>
          <p className="text-slate-600">Learn from experts and improve your proposal quality</p>
        </div>

        {/* AI Recommendations Banner */}
        <Card className="border-none shadow-xl mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">AI-Powered Recommendations</h3>
                  <p className="text-sm text-slate-600">
                    Get personalized content recommendations based on your proposal activity
                  </p>
                </div>
              </div>
              <Button
                onClick={handleGetAIRecommendations}
                disabled={loadingRecommendations}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loadingRecommendations ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Get Recommendations
                  </>
                )}
              </Button>
            </div>

            {aiRecommendations.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-slate-700">Recommended for you:</p>
                {aiRecommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-indigo-200">
                    <div className="flex items-start gap-3">
                      <Target className={`w-5 h-5 flex-shrink-0 ${
                        rec.priority === 'high' ? 'text-red-500' : 
                        rec.priority === 'medium' ? 'text-amber-500' : 'text-blue-500'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900">{rec.title}</p>
                          <Badge variant="outline" className="text-xs capitalize">
                            {rec.category.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{rec.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <BookOpen className="w-8 h-8 text-blue-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{writingGuides.length}</p>
                  <p className="text-xs text-slate-600">Writing Guides</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Shield className="w-8 h-8 text-red-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{complianceContent.length}</p>
                  <p className="text-xs text-slate-600">Compliance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Lightbulb className="w-8 h-8 text-amber-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{industryTips.length}</p>
                  <p className="text-xs text-slate-600">Industry Tips</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <FileText className="w-8 h-8 text-green-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{sampleLanguage.length}</p>
                  <p className="text-xs text-slate-600">Sample Language</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Bookmark className="w-8 h-8 text-purple-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{bookmarkedContent.length}</p>
                  <p className="text-xs text-slate-600">Bookmarked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="border-none shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search best practices, guides, regulations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="training_material">Training Material</SelectItem>
                  <SelectItem value="guideline">Guidelines</SelectItem>
                  <SelectItem value="far_regulation">FAR Regulations</SelectItem>
                  <SelectItem value="dfars">DFARS</SelectItem>
                  <SelectItem value="template">Templates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">
              All ({filteredContent.length})
            </TabsTrigger>
            <TabsTrigger value="writing">
              <BookOpen className="w-4 h-4 mr-2" />
              Writing Guides ({writingGuides.length})
            </TabsTrigger>
            <TabsTrigger value="compliance">
              <Shield className="w-4 h-4 mr-2" />
              Compliance ({complianceContent.length})
            </TabsTrigger>
            <TabsTrigger value="tips">
              <Lightbulb className="w-4 h-4 mr-2" />
              Tips ({industryTips.length})
            </TabsTrigger>
            <TabsTrigger value="samples">
              <FileText className="w-4 h-4 mr-2" />
              Samples ({sampleLanguage.length})
            </TabsTrigger>
            <TabsTrigger value="bookmarks">
              <Bookmark className="w-4 h-4 mr-2" />
              Bookmarks ({bookmarkedContent.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {filteredContent.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Content Found</h3>
                  <p className="text-slate-600">Try adjusting your search or filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContent.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="writing" className="space-y-6">
            {writingGuides.length === 0 ? (
              <p className="text-center text-slate-500 py-12">No writing guides available</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {writingGuides.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            {complianceContent.length === 0 ? (
              <p className="text-center text-slate-500 py-12">No compliance content available</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {complianceContent.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tips" className="space-y-6">
            {industryTips.length === 0 ? (
              <p className="text-center text-slate-500 py-12">No industry tips available</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {industryTips.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="samples" className="space-y-6">
            {sampleLanguage.length === 0 ? (
              <p className="text-center text-slate-500 py-12">No sample language available</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sampleLanguage.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks" className="space-y-6">
            {bookmarkedContent.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-12 text-center">
                  <Bookmark className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Bookmarks Yet</h3>
                  <p className="text-slate-600">Click the bookmark icon on any article to save it here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookmarkedContent.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Article View Dialog */}
        <Dialog open={showArticle} onOpenChange={setShowArticle}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-2xl mb-2">{selectedArticle?.title}</DialogTitle>
                  <div className="flex gap-2">
                    <Badge className={getCategoryColor(selectedArticle?.data_type)}>
                      {getCategoryLabel(selectedArticle?.data_type)}
                    </Badge>
                    {selectedArticle?.category && (
                      <Badge variant="outline" className="capitalize">
                        {selectedArticle.category}
                      </Badge>
                    )}
                    {selectedArticle?.is_proprietary && (
                      <Badge className="bg-indigo-100 text-indigo-700">
                        <Star className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleBookmark(selectedArticle?.id)}
                >
                  {bookmarkedIds.includes(selectedArticle?.id) ? (
                    <Bookmark className="w-5 h-5 fill-amber-500 text-amber-500" />
                  ) : (
                    <BookmarkPlus className="w-5 h-5 text-slate-400" />
                  )}
                </Button>
              </div>
            </DialogHeader>
            {selectedArticle && (
              <div className="py-4">
                <ReactMarkdown className="prose prose-slate max-w-none">
                  {selectedArticle.content}
                </ReactMarkdown>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}