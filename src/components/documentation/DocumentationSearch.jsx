import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Video, HelpCircle, Clock, Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function DocumentationSearch({ guides, videos, faqItems, searchQuery }) {
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results = [];

    // Search guides
    guides.forEach(guide => {
      if (guide.is_published) {
        const titleMatch = guide.title.toLowerCase().includes(query);
        const contentMatch = guide.content?.toLowerCase().includes(query);
        const tagsMatch = guide.tags?.some(tag => tag.toLowerCase().includes(query));
        
        if (titleMatch || contentMatch || tagsMatch) {
          results.push({
            type: 'guide',
            item: guide,
            relevance: titleMatch ? 3 : contentMatch ? 2 : 1
          });
        }
      }
    });

    // Search videos
    videos.forEach(video => {
      if (video.is_published) {
        const titleMatch = video.title.toLowerCase().includes(query);
        const descMatch = video.description?.toLowerCase().includes(query);
        const tagsMatch = video.tags?.some(tag => tag.toLowerCase().includes(query));
        
        if (titleMatch || descMatch || tagsMatch) {
          results.push({
            type: 'video',
            item: video,
            relevance: titleMatch ? 3 : descMatch ? 2 : 1
          });
        }
      }
    });

    // Search FAQ
    faqItems.forEach(faq => {
      if (faq.is_published) {
        const questionMatch = faq.question.toLowerCase().includes(query);
        const answerMatch = faq.answer?.toLowerCase().includes(query);
        const tagsMatch = faq.tags?.some(tag => tag.toLowerCase().includes(query));
        
        if (questionMatch || answerMatch || tagsMatch) {
          results.push({
            type: 'faq',
            item: faq,
            relevance: questionMatch ? 3 : answerMatch ? 2 : 1
          });
        }
      }
    });

    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  }, [guides, videos, faqItems, searchQuery]);

  if (!searchQuery.trim()) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-slate-500">
          <p>Enter a search query to find documentation, videos, and FAQs</p>
        </CardContent>
      </Card>
    );
  }

  if (searchResults.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-slate-500">
          <p>No results found for "{searchQuery}"</p>
          <p className="text-sm mt-2">Try different keywords or browse by category</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Search Results for "{searchQuery}"
          </CardTitle>
          <p className="text-sm text-slate-600">
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {searchResults.map((result, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              {result.type === 'guide' && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <Badge variant="outline" className="text-xs">User Guide</Badge>
                    <Badge className="capitalize text-xs">{result.item.difficulty_level}</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{result.item.title}</h3>
                  <p className="text-sm text-slate-600 mb-2">{result.item.excerpt}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {result.item.reading_time} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {result.item.view_count || 0} views
                    </span>
                  </div>
                </div>
              )}

              {result.type === 'video' && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="w-4 h-4 text-purple-600" />
                    <Badge variant="outline" className="text-xs">Tutorial Video</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{result.item.title}</h3>
                  <p className="text-sm text-slate-600 mb-2">{result.item.description}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {result.item.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {result.item.view_count || 0} views
                    </span>
                  </div>
                </div>
              )}

              {result.type === 'faq' && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-green-600" />
                    <Badge variant="outline" className="text-xs">FAQ</Badge>
                    <Badge variant="outline" className="capitalize text-xs">
                      {result.item.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{result.item.question}</h3>
                  <div className="prose prose-sm prose-slate max-w-none">
                    <ReactMarkdown>{result.item.answer}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}