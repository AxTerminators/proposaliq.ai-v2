import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  FileText,
  MessageSquare,
  Library,
  Users,
  ArrowRight,
  Clock,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";

const SEARCH_TYPES = {
  proposals: { icon: Target, label: 'Proposals', color: 'text-blue-600 bg-blue-100' },
  sections: { icon: FileText, label: 'Sections', color: 'text-purple-600 bg-purple-100' },
  resources: { icon: Library, label: 'Resources', color: 'text-green-600 bg-green-100' },
  personnel: { icon: Users, label: 'Personnel', color: 'text-amber-600 bg-amber-100' },
  discussions: { icon: MessageSquare, label: 'Discussions', color: 'text-pink-600 bg-pink-100' },
};

export default function GlobalSearch({ organization, isOpen, onClose }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch search results
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['global-search', organization?.id, debouncedQuery, selectedType],
    queryFn: async () => {
      if (!organization?.id || !debouncedQuery || debouncedQuery.length < 2) {
        return { proposals: [], sections: [], resources: [], personnel: [], discussions: [] };
      }

      const query = debouncedQuery.toLowerCase();
      const results = {};

      // Search proposals
      if (selectedType === 'all' || selectedType === 'proposals') {
        const proposals = await base44.entities.Proposal.filter({
          organization_id: organization.id
        });
        results.proposals = proposals.filter(p =>
          p.proposal_name?.toLowerCase().includes(query) ||
          p.project_title?.toLowerCase().includes(query) ||
          p.solicitation_number?.toLowerCase().includes(query) ||
          p.agency_name?.toLowerCase().includes(query)
        );
      }

      // Search sections
      if (selectedType === 'all' || selectedType === 'sections') {
        const sections = await base44.entities.ProposalSection.filter({});
        const orgProposals = await base44.entities.Proposal.filter({
          organization_id: organization.id
        });
        const orgProposalIds = orgProposals.map(p => p.id);
        
        results.sections = sections.filter(s =>
          orgProposalIds.includes(s.proposal_id) &&
          (s.section_name?.toLowerCase().includes(query) ||
           s.content?.toLowerCase().includes(query))
        ).slice(0, 20);
      }

      // Search resources
      if (selectedType === 'all' || selectedType === 'resources') {
        const resources = await base44.entities.ProposalResource.filter({
          organization_id: organization.id
        });
        results.resources = resources.filter(r =>
          r.title?.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.boilerplate_content?.toLowerCase().includes(query) ||
          r.file_name?.toLowerCase().includes(query)
        );
      }

      // Search key personnel
      if (selectedType === 'all' || selectedType === 'personnel') {
        const personnel = await base44.entities.KeyPersonnel.filter({
          organization_id: organization.id
        });
        results.personnel = personnel.filter(p =>
          p.full_name?.toLowerCase().includes(query) ||
          p.title?.toLowerCase().includes(query) ||
          p.skills?.some(s => s.toLowerCase().includes(query))
        );
      }

      // Search discussions
      if (selectedType === 'all' || selectedType === 'discussions') {
        const discussions = await base44.entities.Discussion.filter({
          organization_id: organization.id
        });
        results.discussions = discussions.filter(d =>
          d.title?.toLowerCase().includes(query) ||
          d.content?.toLowerCase().includes(query)
        );
      }

      return results;
    },
    enabled: !!organization?.id && debouncedQuery.length >= 2,
    staleTime: 30000
  });

  const totalResults = useMemo(() => {
    if (!searchResults) return 0;
    return Object.values(searchResults).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  }, [searchResults]);

  const handleResultClick = (type, item) => {
    if (type === 'proposals') {
      navigate(`${createPageUrl("ProposalBuilder")}?id=${item.id}`);
    } else if (type === 'sections') {
      navigate(`${createPageUrl("ProposalBuilder")}?id=${item.proposal_id}`);
    } else if (type === 'resources') {
      navigate(createPageUrl("Resources"));
    } else if (type === 'personnel') {
      navigate(createPageUrl("KeyPersonnel"));
    } else if (type === 'discussions') {
      navigate(createPageUrl("Discussions"));
    }
    onClose();
  };

  const highlightMatch = (text, query) => {
    if (!text || !query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 font-semibold">{part}</mark>
        : part
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Global Search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search across all proposals, sections, resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
              autoFocus
            />
          </div>

          {/* Type Filters */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('all')}
            >
              All Results
            </Button>
            {Object.entries(SEARCH_TYPES).map(([key, config]) => {
              const Icon = config.icon;
              const count = searchResults?.[key]?.length || 0;
              
              return (
                <Button
                  key={key}
                  variant={selectedType === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType(key)}
                  className="gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5">
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto mt-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-slate-600">Searching...</p>
            </div>
          ) : !debouncedQuery || debouncedQuery.length < 2 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Start typing to search</p>
              <p className="text-sm text-slate-500 mt-2">Search across proposals, sections, resources, and more</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No results found</p>
              <p className="text-sm text-slate-500 mt-2">Try different keywords</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Proposals */}
              {searchResults.proposals?.length > 0 && (selectedType === 'all' || selectedType === 'proposals') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-slate-900">Proposals</h4>
                    <Badge variant="outline">{searchResults.proposals.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {searchResults.proposals.map(proposal => (
                      <Card
                        key={proposal.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleResultClick('proposals', proposal)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 mb-1">
                                {highlightMatch(proposal.proposal_name, debouncedQuery)}
                              </p>
                              {proposal.agency_name && (
                                <p className="text-sm text-slate-600">
                                  {highlightMatch(proposal.agency_name, debouncedQuery)}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {proposal.status}
                                </Badge>
                                {proposal.due_date && (
                                  <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {moment(proposal.due_date).format('MMM D')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections */}
              {searchResults.sections?.length > 0 && (selectedType === 'all' || selectedType === 'sections') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <h4 className="font-semibold text-slate-900">Sections</h4>
                    <Badge variant="outline">{searchResults.sections.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {searchResults.sections.slice(0, 10).map(section => (
                      <Card
                        key={section.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleResultClick('sections', section)}
                      >
                        <CardContent className="p-4">
                          <p className="font-semibold text-slate-900 mb-1 text-sm">
                            {highlightMatch(section.section_name, debouncedQuery)}
                          </p>
                          {section.content && (
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {section.content.substring(0, 150)}...
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources */}
              {searchResults.resources?.length > 0 && (selectedType === 'all' || selectedType === 'resources') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Library className="w-4 h-4 text-green-600" />
                    <h4 className="font-semibold text-slate-900">Resources</h4>
                    <Badge variant="outline">{searchResults.resources.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {searchResults.resources.map(resource => (
                      <Card
                        key={resource.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleResultClick('resources', resource)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 mb-1 text-sm">
                                {highlightMatch(resource.title || resource.file_name, debouncedQuery)}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {resource.resource_type}
                              </Badge>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Personnel */}
              {searchResults.personnel?.length > 0 && (selectedType === 'all' || selectedType === 'personnel') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-amber-600" />
                    <h4 className="font-semibold text-slate-900">Key Personnel</h4>
                    <Badge variant="outline">{searchResults.personnel.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {searchResults.personnel.map(person => (
                      <Card
                        key={person.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleResultClick('personnel', person)}
                      >
                        <CardContent className="p-4">
                          <p className="font-semibold text-slate-900 mb-1 text-sm">
                            {highlightMatch(person.full_name, debouncedQuery)}
                          </p>
                          <p className="text-xs text-slate-600">{person.title}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Discussions */}
              {searchResults.discussions?.length > 0 && (selectedType === 'all' || selectedType === 'discussions') && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-pink-600" />
                    <h4 className="font-semibold text-slate-900">Discussions</h4>
                    <Badge variant="outline">{searchResults.discussions.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {searchResults.discussions.map(discussion => (
                      <Card
                        key={discussion.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleResultClick('discussions', discussion)}
                      >
                        <CardContent className="p-4">
                          <p className="font-semibold text-slate-900 mb-1 text-sm">
                            {highlightMatch(discussion.title, debouncedQuery)}
                          </p>
                          <p className="text-xs text-slate-600 line-clamp-2">
                            {discussion.content?.substring(0, 100)}...
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}