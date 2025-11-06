import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Plus, 
  Search,
  Trash2,
  Edit,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Target,
  DollarSign,
  Building2,
  Star
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function CompetitorIntel() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState(null);
  const [viewingCompetitor, setViewingCompetitor] = useState(null);
  
  const [competitorData, setCompetitorData] = useState({
    competitor_name: "",
    competitor_type: "prime_contractor",
    naics_codes: [],
    certifications: [],
    strengths: [],
    weaknesses: [],
    typical_pricing_strategy: "competitive",
    relationship_status: "competitor",
    competitive_intelligence_notes: ""
  });

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

  const { data: competitors, isLoading } = useQuery({
    queryKey: ['competitors', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.CompetitorIntel.filter(
        { organization_id: organization.id },
        '-last_updated'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const createCompetitorMutation = useMutation({
    mutationFn: async (data) => {
      if (editingCompetitor) {
        return base44.entities.CompetitorIntel.update(editingCompetitor.id, {
          ...data,
          last_updated: new Date().toISOString()
        });
      } else {
        return base44.entities.CompetitorIntel.create({
          ...data,
          organization_id: organization.id,
          last_updated: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      setShowDialog(false);
      setEditingCompetitor(null);
      resetForm();
      alert(`Competitor ${editingCompetitor ? "updated" : "added"} successfully.`);
    },
    onError: (error) => {
      console.error("Error saving competitor:", error);
      alert(`Failed to save competitor: ${error.message}`);
    }
  });

  const deleteCompetitorMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.CompetitorIntel.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      alert("Competitor deleted successfully.");
    },
    onError: (error) => {
      console.error("Error deleting competitor:", error);
      alert(`Failed to delete competitor: ${error.message}`);
    }
  });

  const resetForm = () => {
    setCompetitorData({
      competitor_name: "",
      competitor_type: "prime_contractor",
      naics_codes: [],
      certifications: [],
      strengths: [],
      weaknesses: [],
      typical_pricing_strategy: "competitive",
      relationship_status: "competitor",
      competitive_intelligence_notes: ""
    });
  };

  const handleEdit = (competitor) => {
    setEditingCompetitor(competitor);
    setCompetitorData(competitor);
    setShowDialog(true);
  };

  const handleView = (competitor) => {
    setViewingCompetitor(competitor);
  };

  const handleSave = () => {
    if (!competitorData.competitor_name.trim()) {
      alert("Please enter a competitor name before saving.");
      return;
    }
    createCompetitorMutation.mutate(competitorData);
  };

  const handleArrayInput = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setCompetitorData({ ...competitorData, [field]: items });
  };

  const filteredCompetitors = competitors.filter(c => 
    c.competitor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.naics_codes?.some(code => code.includes(searchQuery)) ||
    c.competitive_intelligence_notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCompetitorTypeColor = (type) => {
    const colors = {
      prime_contractor: "bg-purple-100 text-purple-800",
      subcontractor: "bg-blue-100 text-blue-800",
      teaming_partner: "bg-green-100 text-green-800",
      incumbent: "bg-red-100 text-red-800"
    };
    return colors[type] || colors.prime_contractor;
  };

  const getRelationshipColor = (status) => {
    const colors = {
      competitor: "bg-red-100 text-red-800",
      potential_teaming_partner: "bg-amber-100 text-amber-800",
      past_partner: "bg-blue-100 text-blue-800",
      avoided: "bg-slate-100 text-slate-800"
    };
    return colors[status] || colors.competitor;
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Competitor Intelligence</h1>
          <p className="text-slate-600">Track and analyze your competition</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-5 h-5 mr-2" />
          Add Competitor
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search competitors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filteredCompetitors.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Competitors Tracked Yet</h3>
            <p className="text-slate-600 mb-6">
              Start building your competitive intelligence database
            </p>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Competitor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompetitors.map((competitor) => (
            <Card 
              key={competitor.id} 
              className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer"
              onClick={() => handleView(competitor)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{competitor.competitor_name}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getCompetitorTypeColor(competitor.competitor_type)}>
                        {competitor.competitor_type?.replace('_', ' ')}
                      </Badge>
                      <Badge className={getRelationshipColor(competitor.relationship_status)}>
                        {competitor.relationship_status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(competitor)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this competitor? This action cannot be undone.')) {
                          deleteCompetitorMutation.mutate(competitor.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {competitor.typical_pricing_strategy && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <span className="capitalize">{competitor.typical_pricing_strategy} pricing</span>
                  </div>
                )}
                
                {competitor.win_rate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-slate-400" />
                    <span>{competitor.win_rate}% Win Rate</span>
                  </div>
                )}

                {competitor.strengths && competitor.strengths.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                      <TrendingUp className="w-3 h-3" />
                      <span className="font-semibold">Strengths</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {competitor.strengths.slice(0, 3).map((strength, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-green-50">
                          {strength}
                        </Badge>
                      ))}
                      {competitor.strengths.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{competitor.strengths.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {competitor.weaknesses && competitor.weaknesses.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs text-red-600 mb-2">
                      <TrendingDown className="w-3 h-3" />
                      <span className="font-semibold">Weaknesses</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {competitor.weaknesses.slice(0, 2).map((weakness, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-red-50">
                          {weakness}
                        </Badge>
                      ))}
                      {competitor.weaknesses.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{competitor.weaknesses.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { 
        setShowDialog(open); 
        if (!open) { 
          setEditingCompetitor(null); 
          resetForm(); 
        } 
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCompetitor ? 'Edit Competitor' : 'Add New Competitor'}</DialogTitle>
            <DialogDescription>
              Track competitive intelligence and market positioning
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="analysis">SWOT Analysis</TabsTrigger>
              <TabsTrigger value="intel">Intelligence</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Competitor Name *</label>
                <Input
                  value={competitorData.competitor_name}
                  onChange={(e) => setCompetitorData({ ...competitorData, competitor_name: e.target.value })}
                  placeholder="Company name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <Select
                    value={competitorData.competitor_type}
                    onValueChange={(value) => setCompetitorData({ ...competitorData, competitor_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prime_contractor">Prime Contractor</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      <SelectItem value="teaming_partner">Teaming Partner</SelectItem>
                      <SelectItem value="incumbent">Incumbent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Relationship</label>
                  <Select
                    value={competitorData.relationship_status}
                    onValueChange={(value) => setCompetitorData({ ...competitorData, relationship_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="competitor">Competitor</SelectItem>
                      <SelectItem value="potential_teaming_partner">Potential Teaming Partner</SelectItem>
                      <SelectItem value="past_partner">Past Partner</SelectItem>
                      <SelectItem value="avoided">Avoided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">NAICS Codes (comma-separated)</label>
                <Input
                  value={competitorData.naics_codes?.join(', ') || ''}
                  onChange={(e) => handleArrayInput('naics_codes', e.target.value)}
                  placeholder="541512, 541519, 541611"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Certifications (comma-separated)</label>
                <Input
                  value={competitorData.certifications?.join(', ') || ''}
                  onChange={(e) => handleArrayInput('certifications', e.target.value)}
                  placeholder="8(a), SDVOSB, HUBZone"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Pricing Strategy</label>
                  <Select
                    value={competitorData.typical_pricing_strategy}
                    onValueChange={(value) => setCompetitorData({ ...competitorData, typical_pricing_strategy: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low_cost">Low Cost</SelectItem>
                      <SelectItem value="competitive">Competitive</SelectItem>
                      <SelectItem value="value_based">Value Based</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Win Rate (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={competitorData.win_rate || ''}
                    onChange={(e) => setCompetitorData({ ...competitorData, win_rate: parseFloat(e.target.value) })}
                    placeholder="65"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-green-700">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Strengths (comma-separated)
                </label>
                <Textarea
                  value={competitorData.strengths?.join(', ') || ''}
                  onChange={(e) => handleArrayInput('strengths', e.target.value)}
                  placeholder="Strong past performance, Incumbent advantage, Large team"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-red-700">
                  <TrendingDown className="w-4 h-4 inline mr-1" />
                  Weaknesses (comma-separated)
                </label>
                <Textarea
                  value={competitorData.weaknesses?.join(', ') || ''}
                  onChange={(e) => handleArrayInput('weaknesses', e.target.value)}
                  placeholder="Higher pricing, Limited experience with AI, Weak quality ratings"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="intel" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Competitive Intelligence Notes</label>
                <Textarea
                  value={competitorData.competitive_intelligence_notes}
                  onChange={(e) => setCompetitorData({ ...competitorData, competitive_intelligence_notes: e.target.value })}
                  placeholder="Recent wins, key personnel changes, market positioning, strategic direction..."
                  rows={10}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createCompetitorMutation.isPending}>
              {createCompetitorMutation.isPending ? 'Saving...' : (editingCompetitor ? 'Update Competitor' : 'Add Competitor')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Competitor Detail Dialog */}
      <Dialog open={!!viewingCompetitor} onOpenChange={(open) => !open && setViewingCompetitor(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingCompetitor && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-2xl">{viewingCompetitor.competitor_name}</DialogTitle>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        handleEdit(viewingCompetitor);
                        setViewingCompetitor(null);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge className={getCompetitorTypeColor(viewingCompetitor.competitor_type)}>
                    {viewingCompetitor.competitor_type?.replace('_', ' ')}
                  </Badge>
                  <Badge className={getRelationshipColor(viewingCompetitor.relationship_status)}>
                    {viewingCompetitor.relationship_status?.replace('_', ' ')}
                  </Badge>
                  {viewingCompetitor.typical_pricing_strategy && (
                    <Badge variant="outline" className="capitalize">
                      <DollarSign className="w-3 h-3 mr-1" />
                      {viewingCompetitor.typical_pricing_strategy}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Quick Stats */}
                {viewingCompetitor.win_rate && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-900">Win Rate</span>
                        <span className="text-2xl font-bold text-blue-600">
                          {viewingCompetitor.win_rate}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* NAICS & Certifications */}
                {(viewingCompetitor.naics_codes?.length > 0 || viewingCompetitor.certifications?.length > 0) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {viewingCompetitor.naics_codes?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          NAICS Codes
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {viewingCompetitor.naics_codes.map((code, idx) => (
                            <Badge key={idx} variant="outline">{code}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewingCompetitor.certifications?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Certifications
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {viewingCompetitor.certifications.map((cert, idx) => (
                            <Badge key={idx} variant="outline" className="bg-purple-50">{cert}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SWOT Analysis */}
                <div className="grid md:grid-cols-2 gap-4">
                  {viewingCompetitor.strengths?.length > 0 && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-green-900">
                          <TrendingUp className="w-4 h-4" />
                          Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {viewingCompetitor.strengths.map((strength, idx) => (
                            <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                              <span className="text-green-600 mt-1">•</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {viewingCompetitor.weaknesses?.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-red-900">
                          <TrendingDown className="w-4 h-4" />
                          Weaknesses
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {viewingCompetitor.weaknesses.map((weakness, idx) => (
                            <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                              <span className="text-red-600 mt-1">•</span>
                              <span>{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Intelligence Notes */}
                {viewingCompetitor.competitive_intelligence_notes && (
                  <Card className="border-indigo-200 bg-indigo-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-indigo-900">
                        <Target className="w-4 h-4" />
                        Competitive Intelligence
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-indigo-900 whitespace-pre-wrap">
                        {viewingCompetitor.competitive_intelligence_notes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Last Updated */}
                {viewingCompetitor.last_updated && (
                  <div className="text-xs text-slate-500 text-center pt-4 border-t">
                    Last updated: {new Date(viewingCompetitor.last_updated).toLocaleDateString()}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}