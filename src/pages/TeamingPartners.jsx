
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  Search,
  Trash2,
  Edit,
  Building2,
  Mail,
  Phone,
  Globe,
  Award,
  Library,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Briefcase,
  MapPin,
  Shield,
  Star,
  Eye,
  Filter,
  X
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import PromoteToLibraryDialog from "../components/proposals/PromoteToLibraryDialog";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const CERTIFICATIONS_OPTIONS = [
  "8(a)", "HUBZone", "WOSB", "EDWOSB", "SDVOSB", "Small Business"
];

export default function TeamingPartners() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPartnerId, setExpandedPartnerId] = useState(null);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [partnerToPromote, setPartnerToPromote] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCertification, setFilterCertification] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterTag, setFilterTag] = useState("all"); // NEW

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

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['teaming-partners', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.TeamingPartner.filter(
        { organization_id: organization.id },
        'partner_name'
      );
    },
    enabled: !!organization?.id,
  });

  // NEW: Extract all unique tags
  const allTags = React.useMemo(() => {
    const tagSet = new Set();
    partners.forEach(p => {
      if (p.tags) {
        p.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [partners]);

  const deletePartnerMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.TeamingPartner.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaming-partners'] });
      toast.success("Partner deleted successfully");
      setShowDeleteConfirm(false);
      setPartnerToDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to delete partner: " + error.message);
    }
  });

  const handleEdit = (partner) => {
    navigate(`${createPageUrl("AddTeamingPartner")}?mode=edit&id=${partner.id}`);
  };

  const handleDelete = (partner) => {
    setPartnerToDelete(partner);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (partnerToDelete) {
      deletePartnerMutation.mutate(partnerToDelete.id);
    }
  };

  const handlePromoteToLibrary = (partner) => {
    const partnerContent = `
<h3>${partner.partner_name}</h3>
<p><strong>Type:</strong> ${partner.partner_type?.replace('_', ' ')}</p>
${partner.uei ? `<p><strong>UEI:</strong> ${partner.uei}</p>` : ''}
${partner.cage_code ? `<p><strong>CAGE Code:</strong> ${partner.cage_code}</p>` : ''}

${partner.core_capabilities && partner.core_capabilities.length > 0 ? `
<h4>Core Capabilities</h4>
<ul>
${partner.core_capabilities.map(c => `<li>${c}</li>`).join('\n')}
</ul>
` : ''}

${partner.differentiators && partner.differentiators.length > 0 ? `
<h4>Key Differentiators</h4>
<ul>
${partner.differentiators.map(d => `<li>${d}</li>`).join('\n')}
</ul>
` : ''}

${partner.past_performance_summary ? `
<h4>Past Performance Summary</h4>
<p>${partner.past_performance_summary}</p>
` : ''}

${partner.certifications && partner.certifications.length > 0 ? `
<h4>Certifications</h4>
<p>${partner.certifications.join(', ')}</p>
` : ''}
    `.trim();

    setPartnerToPromote({ content: partnerContent, title: partner.partner_name });
    setShowPromoteDialog(true);
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = !searchQuery ||
      partner.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.poc_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      partner.core_capabilities?.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase())) ||
      partner.certifications?.some(cert => cert.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCertification = filterCertification === "all" ||
      partner.certifications?.includes(filterCertification);

    const matchesStatus = filterStatus === "all" ||
      partner.relationship_status === filterStatus ||
      partner.status === filterStatus;

    const matchesType = filterType === "all" ||
      partner.partner_type === filterType;

    // NEW: Tag filter
    const matchesTag = filterTag === "all" ||
      partner.tags?.includes(filterTag);

    return matchesSearch && matchesCertification && matchesStatus && matchesType && matchesTag;
  });

  const getPartnerTypeColor = (type) => {
    const colors = {
      prime: "bg-purple-100 text-purple-800",
      subcontractor: "bg-blue-100 text-blue-800",
      teaming_partner: "bg-green-100 text-green-800",
      consultant: "bg-amber-100 text-amber-800",
      vendor: "bg-slate-100 text-slate-800"
    };
    return colors[type] || colors.teaming_partner;
  };

  const getStatusColor = (status) => {
    const colors = {
      potential: "bg-slate-100 text-slate-700",
      under_review: "bg-amber-100 text-amber-700",
      active: "bg-green-100 text-green-700",
      preferred: "bg-blue-100 text-blue-700",
      inactive: "bg-slate-100 text-slate-500",
      do_not_use: "bg-red-100 text-red-700"
    };
    return colors[status] || colors.active;
  };

  const activeFiltersCount = [
    searchQuery ? 1 : 0,
    filterCertification !== "all" ? 1 : 0,
    filterStatus !== "all" ? 1 : 0,
    filterType !== "all" ? 1 : 0,
    filterTag !== "all" ? 1 : 0  // NEW
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterCertification("all");
    setFilterStatus("all");
    setFilterType("all");
    setFilterTag("all"); // NEW
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Teaming Partners</h1>
          <p className="text-slate-600">Manage your network of partners and subcontractors</p>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl("AddTeamingPartner") + "?mode=create")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Partner
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search by name, capabilities, certifications, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 bg-white text-blue-600">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900">Filter Partners</h3>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
              <div className="grid md:grid-cols-4 gap-3"> {/* Changed to md:grid-cols-4 */}
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Certification</label>
                  <Select value={filterCertification} onValueChange={setFilterCertification}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Certifications</SelectItem>
                      {CERTIFICATIONS_OPTIONS.map(cert => (
                        <SelectItem key={cert} value={cert}>{cert}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="potential">Potential</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="preferred">Preferred</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="do_not_use">Do Not Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Type</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="prime">Prime Contractor</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      <SelectItem value="teaming_partner">Teaming Partner</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* NEW: Tag Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">Tag</label>
                  <Select value={filterTag} onValueChange={setFilterTag}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {allTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      ) : filteredPartners.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {partners.length === 0 ? "No Partners Yet" : "No Matching Partners"}
            </h3>
            <p className="text-slate-600 mb-6">
              {partners.length === 0 
                ? "Build your network by adding teaming partners and subcontractors"
                : "Try adjusting your search or filters"
              }
            </p>
            {partners.length === 0 && (
              <Button 
                onClick={() => navigate(createPageUrl("AddTeamingPartner") + "?mode=create")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Partner
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((partner) => {
            const isExpanded = expandedPartnerId === partner.id;
            const hasAIData = partner.ai_extracted === true;

            return (
              <Card 
                key={partner.id} 
                className={cn(
                  "border-none shadow-lg hover:shadow-xl transition-all",
                  hasAIData && "ring-2 ring-purple-200"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg truncate">{partner.partner_name}</CardTitle>
                        {hasAIData && (
                          <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" title="AI-Extracted Data" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getPartnerTypeColor(partner.partner_type)}>
                          {partner.partner_type?.replace('_', ' ')}
                        </Badge>
                        {(partner.relationship_status || partner.status) && (
                          <Badge className={getStatusColor(partner.relationship_status || partner.status)}>
                            {(partner.relationship_status || partner.status)?.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(partner)}
                        title="Edit partner"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(partner)}
                        title="Delete partner"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Contact Information */}
                  {partner.poc_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{partner.poc_name}</span>
                      {partner.poc_title && (
                        <span className="text-slate-500 text-xs truncate">• {partner.poc_title}</span>
                      )}
                    </div>
                  )}
                  {partner.poc_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <a href={`mailto:${partner.poc_email}`} className="text-blue-600 hover:underline truncate">
                        {partner.poc_email}
                      </a>
                    </div>
                  )}
                  {partner.poc_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{partner.poc_phone}</span>
                    </div>
                  )}
                  {partner.website_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                        Visit Website
                      </a>
                    </div>
                  )}

                  {/* Identifiers */}
                  {(partner.uei || partner.cage_code || partner.primary_naics) && (
                    <div className="pt-2 border-t">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {partner.uei && (
                          <Badge variant="outline" className="font-mono">
                            UEI: {partner.uei}
                          </Badge>
                        )}
                        {partner.cage_code && (
                          <Badge variant="outline" className="font-mono">
                            CAGE: {partner.cage_code}
                          </Badge>
                        )}
                        {partner.primary_naics && (
                          <Badge variant="outline" className="font-mono">
                            NAICS: {partner.primary_naics}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* NEW: Tags Display - Always visible */}
                  {partner.tags && partner.tags.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                        <span>🏷️</span>
                        <span>Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {partner.tags.slice(0, isExpanded ? undefined : 4).map((tag, idx) => (
                          <Badge 
                            key={idx} 
                            variant="secondary"
                            className="text-xs bg-slate-200 text-slate-700 hover:bg-slate-300"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {!isExpanded && partner.tags.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{partner.tags.length - 4}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {partner.certifications && partner.certifications.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                        <Award className="w-3 h-3" />
                        <span>Certifications</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {partner.certifications.slice(0, isExpanded ? undefined : 3).map((cert, idx) => (
                          <Badge key={idx} className="bg-blue-600 text-white text-xs">
                            {cert}
                          </Badge>
                        ))}
                        {!isExpanded && partner.certifications.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{partner.certifications.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Core Capabilities */}
                  {partner.core_capabilities && partner.core_capabilities.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                        <Briefcase className="w-3 h-3" />
                        <span>Core Capabilities</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {partner.core_capabilities.slice(0, isExpanded ? undefined : 3).map((cap, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                        {!isExpanded && partner.core_capabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{partner.core_capabilities.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="pt-3 border-t space-y-3">
                      {partner.address && (
                        <div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                            <MapPin className="w-3 h-3" />
                            <span>Address</span>
                          </div>
                          <p className="text-sm text-slate-700">{partner.address}</p>
                        </div>
                      )}

                      {partner.differentiators && partner.differentiators.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                            <Star className="w-3 h-3" />
                            <span>Differentiators</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {partner.differentiators.map((diff, idx) => (
                              <Badge key={idx} className="bg-amber-100 text-amber-800 text-xs">
                                {diff}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {partner.technologies_used && partner.technologies_used.length > 0 && (
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Technologies</div>
                          <div className="flex flex-wrap gap-1">
                            {partner.technologies_used.map((tech, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {partner.security_clearances && partner.security_clearances.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                            <Shield className="w-3 h-3" />
                            <span>Security Clearances</span>
                          </div>
                          <p className="text-sm text-slate-700">
                            {partner.security_clearances.join(', ')}
                          </p>
                        </div>
                      )}

                      {partner.past_performance_summary && (
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Past Performance</div>
                          <p className="text-sm text-slate-700 line-clamp-3">
                            {partner.past_performance_summary}
                          </p>
                        </div>
                      )}

                      {(partner.revenue_range || partner.employee_count || partner.years_in_business) && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {partner.revenue_range && (
                            <Badge variant="outline">💰 {partner.revenue_range}</Badge>
                          )}
                          {partner.employee_count && (
                            <Badge variant="outline">👥 {partner.employee_count} employees</Badge>
                          )}
                          {partner.years_in_business && (
                            <Badge variant="outline">📅 {partner.years_in_business} years</Badge>
                          )}
                        </div>
                      )}

                      {partner.strategic_fit_score !== null && partner.strategic_fit_score !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-600">Strategic Fit:</span>
                          <div className="flex items-center gap-1">
                            {[...Array(10)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-3 h-3",
                                  i < partner.strategic_fit_score
                                    ? "fill-blue-500 text-blue-500"
                                    : "text-slate-300"
                                )}
                              />
                            ))}
                            <span className="ml-1 font-semibold text-slate-900">
                              {partner.strategic_fit_score}/10
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-3 border-t space-y-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedPartnerId(isExpanded ? null : partner.id)}
                      className="w-full justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        {isExpanded ? "Show Less" : "View Details"}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePromoteToLibrary(partner)}
                      className="w-full bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300"
                    >
                      <Library className="w-4 h-4 mr-2 text-green-600" />
                      Add to Content Library
                    </Button>
                  </div>

                  {/* Footer Stats */}
                  {(partner.total_collaborations > 0 || partner.last_collaboration_date) && (
                    <div className="pt-2 border-t text-xs text-slate-500">
                      {partner.total_collaborations > 0 && (
                        <span>{partner.total_collaborations} collaboration{partner.total_collaborations !== 1 ? 's' : ''}</span>
                      )}
                      {partner.total_collaborations > 0 && partner.last_collaboration_date && <span> • </span>}
                      {partner.last_collaboration_date && (
                        <span>Last: {new Date(partner.last_collaboration_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPartnerToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Teaming Partner?"
        variant="danger"
        confirmText="Yes, Delete Partner"
        cancelText="Cancel"
        isLoading={deletePartnerMutation.isPending}
      >
        <div className="space-y-3">
          <p className="text-slate-700">
            Are you sure you want to delete <strong>"{partnerToDelete?.partner_name}"</strong>?
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              ⚠️ <strong>Warning:</strong> This will permanently remove this partner from your organization. 
              Any proposals currently using this partner will need to be updated.
            </p>
          </div>
        </div>
      </ConfirmDialog>

      <PromoteToLibraryDialog
        isOpen={showPromoteDialog}
        onClose={() => {
          setShowPromoteDialog(false);
          setPartnerToPromote(null);
        }}
        sectionContent={partnerToPromote?.content || ""}
        sectionName={partnerToPromote?.title || ""}
        organization={organization}
      />
    </div>
  );
}
