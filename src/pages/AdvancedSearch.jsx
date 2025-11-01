import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, FileText, Users, Award, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

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

export default function AdvancedSearch() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [entityType, setEntityType] = useState("all");
  const [results, setResults] = useState([]);

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

  const { data: searchIndex, isLoading } = useQuery({
    queryKey: ['search-index', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.SearchIndex.filter(
        { organization_id: organization.id },
        '-last_indexed',
        100
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = searchIndex.filter(item => {
      const matchesType = entityType === "all" || item.entity_type === entityType;
      const matchesQuery = 
        item.title?.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query) ||
        item.keywords?.some(k => k.toLowerCase().includes(query));
      
      return matchesType && matchesQuery;
    });

    setResults(filtered);
  };

  const getEntityIcon = (type) => {
    const icons = {
      proposal: FileText,
      resource: FileText,
      past_performance: Award,
      teaming_partner: Building2,
      discussion: Users
    };
    const Icon = icons[type] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const getEntityColor = (type) => {
    const colors = {
      proposal: "bg-blue-100 text-blue-800",
      resource: "bg-green-100 text-green-800",
      past_performance: "bg-purple-100 text-purple-800",
      teaming_partner: "bg-amber-100 text-amber-800",
      discussion: "bg-pink-100 text-pink-800"
    };
    return colors[type] || "bg-slate-100 text-slate-800";
  };

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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Advanced Search</h1>
        <p className="text-slate-600">Search across all your content</p>
      </div>

      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search proposals, resources, past performance..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="text-lg"
              />
            </div>
            <select
              className="border rounded-md px-4"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="proposal">Proposals</option>
              <option value="resource">Resources</option>
              <option value="past_performance">Past Performance</option>
              <option value="teaming_partner">Partners</option>
              <option value="discussion">Discussions</option>
            </select>
            <Button onClick={handleSearch} size="lg">
              <Search className="w-5 h-5 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchQuery ? 'No Results Found' : 'Start Searching'}
            </h3>
            <p className="text-slate-600">
              {searchQuery 
                ? 'Try different keywords or filters' 
                : 'Enter keywords to search across all your content'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
          {results.map((result) => (
            <Card key={result.id} className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer"
              onClick={() => {
                // Navigate to the entity
                if (result.entity_type === 'proposal' && result.metadata?.proposal_id) {
                  navigate(createPageUrl(`ProposalBuilder?id=${result.metadata.proposal_id}`));
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getEntityIcon(result.entity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 line-clamp-2">{result.title}</h3>
                      <Badge className={getEntityColor(result.entity_type)}>
                        {result.entity_type?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {result.content?.substring(0, 200)}...
                    </p>
                    {result.metadata && (
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        {result.metadata.agency_name && (
                          <span>Agency: {result.metadata.agency_name}</span>
                        )}
                        {result.metadata.status && (
                          <span>• Status: {result.metadata.status}</span>
                        )}
                      </div>
                    )}
                    {result.keywords && result.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {result.keywords.slice(0, 5).map((keyword, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}