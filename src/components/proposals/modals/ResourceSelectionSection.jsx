import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
  Filter,
  FileText,
  Award,
  Users,
  Lightbulb,
  Link as LinkIcon,
  X,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * ResourceSelectionSection - Search and select existing resources
 * Allows users to filter and link content from library and past work
 */
export default function ResourceSelectionSection({
  organizationId,
  proposalId,
  onLinkComplete,
}) {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [contentType, setContentType] = useState("all");
  const [source, setSource] = useState("all");
  const [selectedTags, setSelectedTags] = useState([]);
  const [teamingPartnerId, setTeamingPartnerId] = useState("all");

  // Selected items state
  const [selectedResources, setSelectedResources] = useState([]);

  // Linking state
  const [isLinking, setIsLinking] = useState(false);

  /**
   * Fetch ProposalResource entities
   */
  const { data: resources = [], isLoading: loadingResources } = useQuery({
    queryKey: ["proposal-resources", organizationId],
    queryFn: () =>
      base44.entities.ProposalResource.filter({
        organization_id: organizationId,
      }),
    enabled: !!organizationId,
  });

  /**
   * Fetch PastPerformanceRecord entities
   */
  const { data: pastPerformance = [], isLoading: loadingPastPerf } = useQuery({
    queryKey: ["past-performance", organizationId],
    queryFn: () =>
      base44.entities.PastPerformanceRecord.filter({
        organization_id: organizationId,
      }),
    enabled: !!organizationId,
  });

  /**
   * Fetch KeyPersonnel entities
   */
  const { data: keyPersonnel = [], isLoading: loadingPersonnel } = useQuery({
    queryKey: ["key-personnel", organizationId],
    queryFn: () =>
      base44.entities.KeyPersonnel.filter({
        organization_id: organizationId,
      }),
    enabled: !!organizationId,
  });

  /**
   * Fetch WinTheme entities
   */
  const { data: winThemes = [], isLoading: loadingThemes } = useQuery({
    queryKey: ["win-themes", organizationId],
    queryFn: () =>
      base44.entities.WinTheme.filter({
        organization_id: organizationId,
      }),
    enabled: !!organizationId,
  });

  /**
   * Fetch TeamingPartner entities for filter
   */
  const { data: teamingPartners = [] } = useQuery({
    queryKey: ["teaming-partners", organizationId],
    queryFn: () =>
      base44.entities.TeamingPartner.filter({
        organization_id: organizationId,
      }),
    enabled: !!organizationId,
  });

  const isLoading = loadingResources || loadingPastPerf || loadingPersonnel || loadingThemes;

  /**
   * Combine all resources into a unified list with metadata
   */
  const allResources = React.useMemo(() => {
    const items = [];

    // Add ProposalResource items
    resources.forEach((r) => {
      items.push({
        id: r.id,
        type: "resource",
        entityType: "ProposalResource",
        title: r.title || "Untitled Resource",
        description: r.description || "",
        tags: r.tags || [],
        source: "Content Library",
        icon: FileText,
        resourceType: r.resource_type,
        teamingPartnerId: r.teaming_partner_id,
      });
    });

    // Add PastPerformanceRecord items
    pastPerformance.forEach((p) => {
      items.push({
        id: p.id,
        type: "past_performance",
        entityType: "PastPerformanceRecord",
        title: p.title || "Untitled Project",
        description: p.project_description || p.customer_agency || "",
        tags: p.tags || [],
        source: "Past Performance",
        icon: Award,
        recordType: p.record_type,
      });
    });

    // Add KeyPersonnel items
    keyPersonnel.forEach((k) => {
      items.push({
        id: k.id,
        type: "key_personnel",
        entityType: "KeyPersonnel",
        title: k.full_name || "Unnamed Personnel",
        description: k.current_title || k.summary || "",
        tags: k.skill_tags || [],
        source: "Key Personnel",
        icon: Users,
      });
    });

    // Add WinTheme items
    winThemes.forEach((w) => {
      items.push({
        id: w.id,
        type: "win_theme",
        entityType: "WinTheme",
        title: w.theme_title || "Untitled Theme",
        description: w.theme_description || "",
        tags: [],
        source: "Win Themes",
        icon: Lightbulb,
      });
    });

    return items;
  }, [resources, pastPerformance, keyPersonnel, winThemes]);

  /**
   * Filter resources based on search and filters
   */
  const filteredResources = React.useMemo(() => {
    let filtered = allResources;

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Content type filter
    if (contentType !== "all") {
      filtered = filtered.filter((item) => item.type === contentType);
    }

    // Source filter
    if (source !== "all") {
      filtered = filtered.filter((item) => item.source === source);
    }

    // Teaming partner filter
    if (teamingPartnerId !== "all") {
      filtered = filtered.filter(
        (item) => item.teamingPartnerId === teamingPartnerId
      );
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((item) =>
        selectedTags.some((tag) => item.tags.includes(tag))
      );
    }

    return filtered;
  }, [allResources, searchQuery, contentType, source, teamingPartnerId, selectedTags]);

  /**
   * Toggle selection of a resource
   */
  const toggleSelection = (item) => {
    const isSelected = selectedResources.some((r) => r.id === item.id && r.entityType === item.entityType);
    if (isSelected) {
      setSelectedResources(selectedResources.filter((r) => !(r.id === item.id && r.entityType === item.entityType)));
    } else {
      setSelectedResources([...selectedResources, item]);
    }
  };

  /**
   * Clear all selections
   */
  const clearSelections = () => {
    setSelectedResources([]);
  };

  /**
   * Handle linking selected resources to the proposal
   * TODO: Phase 4 - Implement actual backend integration
   */
  const handleLinkResources = async () => {
    if (selectedResources.length === 0) {
      alert("Please select at least one resource to link");
      return;
    }

    setIsLinking(true);

    try {
      // TODO: Phase 4 - Update Proposal entity with reference IDs
      // TODO: Phase 4 - Increment usage_count for linked entities
      console.log("Linking resources:", selectedResources);

      // Simulate linking delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Clear selections and notify parent
      clearSelections();
      if (onLinkComplete) {
        onLinkComplete(selectedResources);
      }
    } catch (error) {
      console.error("Linking failed:", error);
      alert("Failed to link resources: " + error.message);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div>
        <Label htmlFor="search" className="text-base font-semibold mb-2 block">
          Search Resources
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            id="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, or tags..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Content Type Filter */}
          <div>
            <Label htmlFor="content-type" className="text-sm mb-1 block">
              Content Type
            </Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger id="content-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="resource">Resources</SelectItem>
                <SelectItem value="past_performance">Past Performance</SelectItem>
                <SelectItem value="key_personnel">Key Personnel</SelectItem>
                <SelectItem value="win_theme">Win Themes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source Filter */}
          <div>
            <Label htmlFor="source" className="text-sm mb-1 block">
              Source
            </Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="Content Library">Content Library</SelectItem>
                <SelectItem value="Past Performance">Past Performance</SelectItem>
                <SelectItem value="Key Personnel">Key Personnel</SelectItem>
                <SelectItem value="Win Themes">Win Themes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Teaming Partner Filter */}
          <div>
            <Label htmlFor="partner" className="text-sm mb-1 block">
              Teaming Partner
            </Label>
            <Select value={teamingPartnerId} onValueChange={setTeamingPartnerId}>
              <SelectTrigger id="partner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Partners</SelectItem>
                {teamingPartners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.partner_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">
            Available Resources ({filteredResources.length})
          </Label>
          {selectedResources.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelections}
              className="text-slate-500"
            >
              Clear Selection
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-600">Loading resources...</span>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No resources found</p>
            <p className="text-sm text-slate-500 mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] border border-slate-200 rounded-lg">
            <div className="p-4 space-y-3">
              {filteredResources.map((item) => {
                const isSelected = selectedResources.some(
                  (r) => r.id === item.id && r.entityType === item.entityType
                );
                const Icon = item.icon;

                return (
                  <Card
                    key={`${item.entityType}-${item.id}`}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    onClick={() => toggleSelection(item)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(item)}
                          className="mt-1"
                        />
                        <Icon className="w-5 h-5 text-slate-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 mb-1">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {item.source}
                            </Badge>
                            {item.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 3 && (
                              <span className="text-xs text-slate-500">
                                +{item.tags.length - 3} more
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
          </ScrollArea>
        )}
      </div>

      {/* Selected Items Summary */}
      {selectedResources.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-900">
              Selected Resources ({selectedResources.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelections}
              className="text-blue-700 hover:text-blue-900"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedResources.map((item) => (
              <Badge
                key={`${item.entityType}-${item.id}`}
                className="bg-white text-blue-900 border border-blue-300"
              >
                {item.title}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Link Button */}
      <div className="pt-4">
        <Button
          onClick={handleLinkResources}
          disabled={isLinking || selectedResources.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {isLinking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Linking Resources...
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4 mr-2" />
              Link Selected Resources ({selectedResources.length})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}