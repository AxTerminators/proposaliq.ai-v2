import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileText,
  Folder,
  Calendar,
  User,
  Building2,
  Filter,
  X,
  Loader2,
  Eye,
  ExternalLink,
  Clock
} from "lucide-react";
import { format } from "date-fns";

export default function AdvancedSearch() {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({
    entity_type: "all",
    date_from: "",
    date_to: "",
    author: "",
    status: "all"
  });

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading org:", error);
      }
    };
    loadOrg();
  }, []);

  const performSearch = async () => {
    if (!searchQuery.trim() && filters.entity_type === "all") {
      alert("Please enter a search term or select a filter");
      return;
    }

    setSearching(true);
    try {
      const searchResults = [];

      // Search Proposals
      if (filters.entity_type === "all" || filters.entity_type === "proposal") {
        const proposals = await base44.entities.Proposal.filter({
          organization_id: organization.id
        });
        
        proposals.forEach(proposal => {
          const score = calculateMatchScore(searchQuery, [
            proposal.proposal_name,
            proposal.agency_name,
            proposal.project_title,
            proposal.solicitation_number
          ]);
          
          if (score > 0 || !searchQuery.trim()) {
            searchResults.push({
              type: 'proposal',
              id: proposal.id,
              title: proposal.proposal_name,
              preview: `${proposal.agency_name || ''} - ${proposal.project_title || ''}`.substring(0, 200),
              metadata: {
                status: proposal.status,
                agency: proposal.agency_name,
                date: proposal.created_date,
                author: proposal.created_by
              },
              url: createPageUrl(`ProposalBuilder?id=${proposal.id}`),
              score
            });
          }
        });
      }

      // Search Proposal Sections
      if (filters.entity_type === "all" || filters.entity_type === "section") {
        const sections = await base44.entities.ProposalSection.list('-created_date', 200);
        
        for (const section of sections) {
          const proposal = await base44.entities.Proposal.filter({ id: section.proposal_id }, '-created_date', 1);
          if (proposal.length > 0 && proposal[0].organization_id === organization.id) {
            const score = calculateMatchScore(searchQuery, [
              section.section_name,
              section.content
            ]);
            
            if (score > 0 || !searchQuery.trim()) {
              searchResults.push({
                type: 'section',
                id: section.id,
                title: section.section_name,
                preview: stripHtml(section.content || '').substring(0, 200) + '...',
                metadata: {
                  proposal: proposal[0].proposal_name,
                  status: section.status,
                  date: section.created_date,
                  wordCount: section.word_count
                },
                url: createPageUrl(`ProposalBuilder?id=${section.proposal_id}`),
                score
              });
            }
          }
        }
      }

      // Search Resources
      if (filters.entity_type === "all" || filters.entity_type === "resource") {
        const resources = await base44.entities.ProposalResource.filter({
          organization_id: organization.id
        });
        
        resources.forEach(resource => {
          const score = calculateMatchScore(searchQuery, [
            resource.title,
            resource.description,
            resource.boilerplate_content,
            ...(resource.tags || [])
          ]);
          
          if (score > 0 || !searchQuery.trim()) {
            searchResults.push({
              type: 'resource',
              id: resource.id,
              title: resource.title || resource.file_name,
              preview: resource.description || resource.boilerplate_content?.substring(0, 200) || '',
              metadata: {
                type: resource.resource_type,
                category: resource.content_category,
                date: resource.created_date,
                usage: resource.usage_count
              },
              url: resource.file_url || createPageUrl("Resources"),
              score
            });
          }
        });
      }

      // Search Past Performance
      if (filters.entity_type === "all" || filters.entity_type === "past_performance") {
        const pastPerf = await base44.entities.PastPerformance.filter({
          organization_id: organization.id
        });
        
        pastPerf.forEach(project => {
          const score = calculateMatchScore(searchQuery, [
            project.project_name,
            project.client_name,
            project.project_description,
            ...(project.services_provided || []),
            ...(project.keywords || [])
          ]);
          
          if (score > 0 || !searchQuery.trim()) {
            searchResults.push({
              type: 'past_performance',
              id: project.id,
              title: project.project_name,
              preview: `${project.client_name} - ${project.project_description?.substring(0, 200) || ''}`,
              metadata: {
                client: project.client_name,
                value: project.contract_value,
                date: project.start_date,
                status: project.status
              },
              url: createPageUrl("PastPerformance"),
              score
            });
          }
        });
      }

      // Search Discussions
      if (filters.entity_type === "all" || filters.entity_type === "discussion") {
        const discussions = await base44.entities.Discussion.filter({
          organization_id: organization.id
        });
        
        discussions.forEach(discussion => {
          const score = calculateMatchScore(searchQuery, [
            discussion.title,
            discussion.content,
            ...(discussion.tags || [])
          ]);
          
          if (score > 0 || !searchQuery.trim()) {
            searchResults.push({
              type: 'discussion',
              id: discussion.id,
              title: discussion.title,
              preview: discussion.content.substring(0, 200),
              metadata: {
                author: discussion.author_name,
                category: discussion.category,
                comments: discussion.comment_count,
                date: discussion.created_date
              },
              url: createPageUrl("Discussions"),
              score
            });
          }
        });
      }

      // Sort by relevance score
      searchResults.sort((a, b) => b.score - a.score);

      // Apply date filters
      let filteredResults = searchResults;
      if (filters.date_from) {
        filteredResults = filteredResults.filter(r => 
          new Date(r.metadata.date) >= new Date(filters.date_from)
        );
      }
      if (filters.date_to) {
        filteredResults = filteredResults.filter(r => 
          new Date(r.metadata.date) <= new Date(filters.date_to)
        );
      }
      if (filters.author) {
        filteredResults = filteredResults.filter(r => 
          r.metadata.author?.toLowerCase().includes(filters.author.toLowerCase())
        );
      }
      if (filters.status !== "all") {
        filteredResults = filteredResults.filter(r => 
          r.metadata.status === filters.status
        );
      }

      setResults(filteredResults);
    } catch (error) {
      console.error("Search error:", error);
      alert("Error performing search. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const calculateMatchScore = (query, fields) => {
    if (!query || !query.trim()) return 1;
    
    const terms = query.toLowerCase().split(' ');
    let score = 0;
    
    fields.forEach(field => {
      if (!field) return;
      const fieldLower = String(field).toLowerCase();
      
      terms.forEach(term => {
        if (fieldLower.includes(term)) {
          // Exact match gets higher score
          if (fieldLower === term) score += 10;
          // Word starts with term
          else if (fieldLower.split(' ').some(word => word.startsWith(term))) score += 5;
          // Contains term
          else score += 2;
        }
      });
    });
    
    return score;
  };

  const stripHtml = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'proposal': return FileText;
      case 'section': return Folder;
      case 'resource': return FileText;
      case 'past_performance': return Building2;
      case 'discussion': return User;
      default: return FileText;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'proposal': return 'bg-blue-100 text-blue-700';
      case 'section': return 'bg-purple-100 text-purple-700';
      case 'resource': return 'bg-green-100 text-green-700';
      case 'past_performance': return 'bg-amber-100 text-amber-700';
      case 'discussion': return 'bg-pink-100 text-pink-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const clearFilters = () => {
    setFilters({
      entity_type: "all",
      date_from: "",
      date_to: "",
      author: "",
      status: "all"
    });
  };

  const hasActiveFilters = () => {
    return filters.entity_type !== "all" || 
           filters.date_from || 
           filters.date_to || 
           filters.author || 
           filters.status !== "all";
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Advanced Search</h1>
          <p className="text-slate-600">Search across all your proposals, resources, and content</p>
        </div>

        {/* Search Box */}
        <Card className="border-none shadow-xl mb-6">
          <CardContent className="p-6">
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search for proposals, sections, resources, past performance..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                  className="pl-10 text-lg py-6"
                />
              </div>
              <Button
                onClick={performSearch}
                disabled={searching}
                className="bg-blue-600 hover:bg-blue-700 px-8"
                size="lg"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <Select value={filters.entity_type} onValueChange={(value) => setFilters({...filters, entity_type: value})}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="proposal">Proposals</SelectItem>
                  <SelectItem value="section">Sections</SelectItem>
                  <SelectItem value="resource">Resources</SelectItem>
                  <SelectItem value="past_performance">Past Performance</SelectItem>
                  <SelectItem value="discussion">Discussions</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                className="w-48"
                placeholder="From date"
              />

              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                className="w-48"
                placeholder="To date"
              />

              {hasActiveFilters() && (
                <Button variant="outline" onClick={clearFilters} size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-slate-600">
              Found <strong className="text-slate-900">{results.length}</strong> results
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </div>
        )}

        {searching ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Searching your content...</p>
          </div>
        ) : results.length === 0 && searchQuery ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <Search className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Results Found</h3>
              <p className="text-slate-600 mb-6">
                Try adjusting your search terms or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.map((result, idx) => {
              const Icon = getTypeIcon(result.type);
              return (
                <Card key={`${result.type}-${result.id}-${idx}`} className="border-none shadow-lg hover:shadow-xl transition-all group cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(result.type)}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                              {result.title}
                            </h3>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge variant="outline" className="capitalize">
                                {result.type.replace(/_/g, ' ')}
                              </Badge>
                              {result.metadata.status && (
                                <Badge variant="secondary" className="capitalize">
                                  {result.metadata.status.replace(/_/g, ' ')}
                                </Badge>
                              )}
                              {result.metadata.agency && (
                                <Badge variant="outline">
                                  <Building2 className="w-3 h-3 mr-1" />
                                  {result.metadata.agency}
                                </Badge>
                              )}
                              {result.metadata.client && (
                                <Badge variant="outline">
                                  <Building2 className="w-3 h-3 mr-1" />
                                  {result.metadata.client}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (result.url.startsWith('http')) {
                                window.open(result.url, '_blank');
                              } else {
                                navigate(result.url);
                              }
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </div>

                        <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                          {result.preview}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          {result.metadata.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(result.metadata.date), 'MMM d, yyyy')}
                            </span>
                          )}
                          {result.metadata.author && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {result.metadata.author}
                            </span>
                          )}
                          {result.metadata.wordCount && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {result.metadata.wordCount} words
                            </span>
                          )}
                          {result.metadata.usage !== undefined && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Used {result.metadata.usage} times
                            </span>
                          )}
                          {result.metadata.proposal && (
                            <span className="flex items-center gap-1">
                              <Folder className="w-3 h-3" />
                              {result.metadata.proposal}
                            </span>
                          )}
                          {result.metadata.comments !== undefined && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {result.metadata.comments} comments
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}