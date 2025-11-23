import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Video,
  HelpCircle,
  Clock,
  Users,
  CheckCircle2,
  Search,
  FileText,
  TrendingUp,
  Target,
  PlayCircle,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import UserGuideManager from "@/components/documentation/UserGuideManager";
import TutorialVideoManager from "@/components/documentation/TutorialVideoManager";
import FAQManager from "@/components/documentation/FAQManager";
import DocumentationSearch from "@/components/documentation/DocumentationSearch";
import DocumentationMetrics from "@/components/documentation/DocumentationMetrics";

const SPRINT_INFO = {
  number: 17,
  name: "Documentation - User Guides",
  duration: "2 weeks",
  priority: "Medium",
  dependencies: "Sprint 16",
  team: "Technical Writer, Product Manager",
  successCriteria: {
    guides: 6,
    videos: 3,
    faqItems: 50
  }
};

const GUIDE_CATEGORIES = [
  { id: 'getting_started', name: 'Getting Started', icon: BookOpen },
  { id: 'proposals', name: 'Proposals', icon: FileText },
  { id: 'kanban', name: 'Kanban Board', icon: Target },
  { id: 'collaboration', name: 'Collaboration', icon: Users },
  { id: 'ai_features', name: 'AI Features', icon: TrendingUp },
  { id: 'export', name: 'Export & Reporting', icon: FileText }
];

export default function Sprint17Documentation() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000
  });

  // Fetch user guides
  const { data: guides = [], isLoading: loadingGuides } = useQuery({
    queryKey: ['user-guides'],
    queryFn: async () => {
      return base44.entities.UserGuide.filter({}, '-created_date');
    },
    staleTime: 60000
  });

  // Fetch tutorial videos
  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ['tutorial-videos'],
    queryFn: async () => {
      return base44.entities.TutorialVideo.filter({}, '-created_date');
    },
    staleTime: 60000
  });

  // Fetch FAQ items
  const { data: faqItems = [], isLoading: loadingFAQ } = useQuery({
    queryKey: ['faq-items'],
    queryFn: async () => {
      return base44.entities.FAQItem.filter({}, '-priority');
    },
    staleTime: 60000
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const publishedGuides = guides.filter(g => g.is_published).length;
    const publishedVideos = videos.filter(v => v.is_published).length;
    const publishedFAQ = faqItems.filter(f => f.is_published).length;

    const meetsSuccessCriteria = 
      publishedGuides >= SPRINT_INFO.successCriteria.guides &&
      publishedVideos >= SPRINT_INFO.successCriteria.videos &&
      publishedFAQ >= SPRINT_INFO.successCriteria.faqItems;

    return {
      totalGuides: guides.length,
      publishedGuides,
      totalVideos: videos.length,
      publishedVideos,
      totalFAQ: faqItems.length,
      publishedFAQ,
      meetsSuccessCriteria
    };
  }, [guides, videos, faqItems]);

  const isLoading = loadingGuides || loadingVideos || loadingFAQ;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-slate-400 animate-pulse" />
            <p className="text-slate-600">Loading documentation system...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Sprint {SPRINT_INFO.number}: Documentation</h1>
                <p className="text-slate-600">{SPRINT_INFO.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Badge className="bg-blue-600 text-white">
                {SPRINT_INFO.priority}
              </Badge>
              <span className="text-slate-600">
                <Clock className="w-4 h-4 inline mr-1" />
                {SPRINT_INFO.duration}
              </span>
              <span className="text-slate-600">
                <Users className="w-4 h-4 inline mr-1" />
                {SPRINT_INFO.team}
              </span>
            </div>
          </div>
        </div>

        {/* Success Criteria Card */}
        <Card className={cn(
          "border-2",
          metrics.meetsSuccessCriteria ? "border-green-500 bg-green-50" : "border-amber-500 bg-amber-50"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Success Criteria
              {metrics.meetsSuccessCriteria && (
                <Badge className="bg-green-600 text-white ml-2">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Met
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                {metrics.publishedGuides >= SPRINT_INFO.successCriteria.guides ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <div className="text-sm text-slate-600">User Guides</div>
                  <div className="text-lg font-bold text-slate-900">
                    {metrics.publishedGuides} / {SPRINT_INFO.successCriteria.guides}+
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {metrics.publishedVideos >= SPRINT_INFO.successCriteria.videos ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <div className="text-sm text-slate-600">Tutorial Videos</div>
                  <div className="text-lg font-bold text-slate-900">
                    {metrics.publishedVideos} / {SPRINT_INFO.successCriteria.videos}+
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {metrics.publishedFAQ >= SPRINT_INFO.successCriteria.faqItems ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                )}
                <div>
                  <div className="text-sm text-slate-600">FAQ Items</div>
                  <div className="text-lg font-bold text-slate-900">
                    {metrics.publishedFAQ} / {SPRINT_INFO.successCriteria.faqItems}+
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">User Guides</p>
                  <p className="text-3xl font-bold text-slate-900">{metrics.publishedGuides}</p>
                  <p className="text-xs text-slate-500 mt-1">{metrics.totalGuides} total</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Tutorial Videos</p>
                  <p className="text-3xl font-bold text-slate-900">{metrics.publishedVideos}</p>
                  <p className="text-xs text-slate-500 mt-1">{metrics.totalVideos} total</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">FAQ Items</p>
                  <p className="text-3xl font-bold text-slate-900">{metrics.publishedFAQ}</p>
                  <p className="text-xs text-slate-500 mt-1">{metrics.totalFAQ} total</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Content</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {metrics.publishedGuides + metrics.publishedVideos + metrics.publishedFAQ}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Published items</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Search */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all documentation, guides, videos, and FAQs..."
                className="pl-10 h-12 text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="guides">User Guides</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <DocumentationMetrics
              guides={guides}
              videos={videos}
              faqItems={faqItems}
              metrics={metrics}
            />

            <Card>
              <CardHeader>
                <CardTitle>Documentation Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {GUIDE_CATEGORIES.map(category => {
                    const Icon = category.icon;
                    const categoryGuides = guides.filter(g => g.category === category.id && g.is_published).length;
                    return (
                      <div key={category.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{category.name}</h3>
                            <p className="text-xs text-slate-600">{categoryGuides} guides</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guides">
            <UserGuideManager user={user} />
          </TabsContent>

          <TabsContent value="videos">
            <TutorialVideoManager user={user} />
          </TabsContent>

          <TabsContent value="faq">
            <FAQManager user={user} />
          </TabsContent>

          <TabsContent value="search">
            <DocumentationSearch
              guides={guides}
              videos={videos}
              faqItems={faqItems}
              searchQuery={searchQuery}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}