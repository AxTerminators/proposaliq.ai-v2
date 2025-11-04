
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Search, 
  Globe, 
  Bookmark,
  TrendingUp,
  Calendar,
  DollarSign,
  MapPin,
  FileText,
  Sparkles,
  Plus,
  ExternalLink,
  Filter,
  RefreshCw,
  Loader2 // NEW IMPORT
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils"; // Assuming this utility function is available

export default function OpportunityFinder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    naics: "all",
    setAside: "all",
    agency: "all",
    noticeType: "all"
  });
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [runningAIMatch, setRunningAIMatch] = useState(false); // NEW STATE

  useEffect(() => {
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
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['sam-opportunities', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.SAMOpportunity.filter({ organization_id: organization.id }, '-posted_date');
    },
    initialData: [],
    enabled: !!organization?.id
  });

  const saveOpportunityMutation = useMutation({
    mutationFn: async (opp) => {
      await base44.entities.SAMOpportunity.update(opp.id, { status: 'saved' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sam-opportunities'] });
    }
  });

  const createProposalFromOppMutation = useMutation({
    mutationFn: async ({ opp, proposalName }) => {
      const proposal = await base44.entities.Proposal.create({
        proposal_name: proposalName,
        organization_id: organization.id,
        prime_contractor_id: organization.id,
        prime_contractor_name: organization.organization_name,
        project_type: opp.contract_type === "Fixed Price" ? "RFP" : "RFQ",
        solicitation_number: opp.solicitation_number,
        agency_name: opp.department,
        project_title: opp.title,
        due_date: opp.response_deadline ? new Date(opp.response_deadline).toISOString().split('T')[0] : null,
        status: "evaluating",
        current_phase: "phase1"
      });

      await base44.entities.SAMOpportunity.update(opp.id, {
        status: 'proposal_created',
        proposal_id: proposal.id
      });

      return proposal;
    },
    onSuccess: (proposal) => {
      queryClient.invalidateQueries({ queryKey: ['sam-opportunities'] });
      setShowImportDialog(false);
      navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`));
    }
  });

  const runSemanticMatching = async () => {
    if (!organization || opportunities.length === 0) {
      alert("No opportunities to analyze. Search SAM.gov first!");
      return;
    }

    setRunningAIMatch(true);

    try {
      // Build organization capability profile
      const orgProfile = {
        name: organization.organization_name,
        primary_naics: organization.primary_naics,
        secondary_naics: organization.secondary_naics || [],
        certifications: organization.certifications || [],
        capabilities: organization.core_capabilities || [], 
        differentiators: organization.differentiators || []
      };

      // Analyze each opportunity with semantic matching
      // Limiting to first 20 for demonstration, can be adjusted for production
      for (const opp of opportunities.slice(0, 20)) {
        const matchingPrompt = `You are an expert in government contracting and opportunity analysis. Use semantic similarity and pattern matching to analyze if this opportunity is a good fit.

**YOUR ORGANIZATION PROFILE:**
- Name: ${orgProfile.name}
- Primary NAICS: ${orgProfile.primary_naics}
- Secondary NAICS: ${orgProfile.secondary_naics.join(', ') || 'None'}
- Certifications: ${orgProfile.certifications.join(', ') || 'None'}
- Core Capabilities: ${orgProfile.capabilities.join(', ') || 'Not specified'}
- Differentiators: ${orgProfile.differentiators.join(', ') || 'Not specified'}

**OPPORTUNITY TO ANALYZE:**
- Title: ${opp.title}
- Agency: ${opp.department} - ${opp.sub_agency || ''}
- NAICS: ${opp.naics_code} - ${opp.naics_description}
- Set-Aside: ${opp.set_aside || 'None'}
- Contract Type: ${opp.contract_type}
- Estimated Value: ${opp.estimated_value ? `$${(opp.estimated_value.min / 1000000).toFixed(1)}M - $${(opp.estimated_value.max / 1000000).toFixed(1)}M` : 'Not specified'}
- Description: ${opp.description || 'No description'}
- Keywords: ${opp.keywords?.join(', ') || 'None'}

**SEMANTIC MATCHING ANALYSIS:**

1. **Match Score (0-100)**: Calculate comprehensive fit score considering:
   - NAICS code alignment
   - Capability semantic similarity
   - Certification requirements match
   - Contract type experience
   - Value range appropriateness
   - Agency relationship history

2. **Match Reasons**: Specific reasons why this is/isn't a good fit

3. **Competitive Positioning**: Your likely competitive position

4. **Win Probability**: Estimated probability of winning if you bid

5. **Strategic Fit**: Strategic value beyond just winning

6. **Concerns**: Potential challenges or concerns

7. **Bid/No-Bid Recommendation**: Should you pursue this?

Provide data-driven, actionable intelligence.`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: matchingPrompt,
          response_json_schema: {
            type: "object",
            properties: {
              match_score: { type: "number", minimum: 0, maximum: 100 },
              match_reasons: {
                type: "array",
                items: { type: "string" }
              },
              competitive_positioning: {
                type: "string",
                enum: ["strong_contender", "viable_competitor", "underdog", "long_shot"]
              },
              win_probability: {
                type: "number",
                minimum: 0,
                maximum: 100
              },
              strategic_fit: {
                type: "object",
                properties: {
                  fit_level: { type: "string", enum: ["excellent", "good", "fair", "poor"] },
                  strategic_value: { type: "string" },
                  capability_development_opportunity: { type: "boolean" }
                }
              },
              concerns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    concern_type: { type: "string", enum: ["capability_gap", "certification", "size_mismatch", "pricing", "competition", "requirements"] },
                    description: { type: "string" },
                    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                    mitigation: { type: "string" }
                  }
                }
              },
              bid_recommendation: {
                type: "object",
                properties: {
                  recommendation: { type: "string", enum: ["strong_bid", "bid", "watch", "no_bid"] },
                  reasoning: { type: "string" },
                  conditions: { type: "array", items: { type: "string" } }
                }
              },
              required_capabilities: {
                type: "array",
                items: { type: "string" }
              },
              teaming_recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    gap: { type: "string" },
                    recommended_partner_type: { type: "string" }
                  }
                }
              }
            },
            required: ["match_score", "match_reasons", "win_probability", "bid_recommendation"]
          }
        });

        // Update opportunity with AI analysis
        await base44.entities.SAMOpportunity.update(opp.id, {
          match_score: result.match_score,
          match_reasons: result.match_reasons || [],
          ai_analysis: {
            competitive_positioning: result.competitive_positioning,
            win_probability: result.win_probability,
            strategic_fit: result.strategic_fit,
            concerns: result.concerns || [],
            bid_recommendation: result.bid_recommendation,
            required_capabilities: result.required_capabilities || [],
            teaming_recommendations: result.teaming_recommendations || [],
            analyzed_date: new Date().toISOString()
          }
        });
      }

      queryClient.invalidateQueries({ queryKey: ['sam-opportunities'] });
      alert("✓ AI semantic matching complete! Opportunities ranked by fit.");

    } catch (error) {
      console.error("Error running AI matching:", error);
      alert("Error running AI matching: " + error.message);
    } finally {
      setRunningAIMatch(false);
    }
  };

  const simulateSAMSearch = async () => {
    setIsSearching(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // This would normally call SAM.gov API
      // For now, we'll create sample opportunities
      const sampleOpps = [
        {
          notice_id: "DHA30425R0002",
          solicitation_number: "DHA30425R0002",
          title: "IT Support Services for Defense Health Agency",
          department: "Department of Defense",
          sub_agency: "Defense Health Agency",
          office: "DHA Contracting Office",
          notice_type: "Solicitation",
          contract_type: "Time and Materials",
          naics_code: "541512",
          naics_description: "Computer Systems Design Services",
          set_aside: "Total Small Business",
          description: "The Defense Health Agency requires comprehensive IT support services including help desk, systems administration, and network management for a 12-month base period with four 12-month option periods.",
          posted_date: new Date().toISOString().split('T')[0],
          response_deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          place_of_performance: {
            city: "Falls Church",
            state: "VA",
            country: "USA"
          },
          estimated_value: {
            min: 5000000,
            max: 10000000
          },
          keywords: ["IT support", "help desk", "systems administration", "cybersecurity"],
          status: "new"
        },
        {
          notice_id: "GSA12325Q0045",
          solicitation_number: "GSA12325Q0045",
          title: "Cloud Migration Services",
          department: "General Services Administration",
          sub_agency: "Federal Acquisition Service",
          office: "GSA Region 12",
          notice_type: "Combined Synopsis/Solicitation",
          contract_type: "Fixed Price",
          naics_code: "541511",
          naics_description: "Custom Computer Programming Services",
          set_aside: "8(a)",
          description: "GSA seeks qualified contractors to provide cloud migration services for legacy applications to AWS GovCloud. Services include assessment, planning, migration, and post-migration support.",
          posted_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          response_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          place_of_performance: {
            city: "Washington",
            state: "DC",
            country: "USA"
          },
          estimated_value: {
            min: 2000000,
            max: 5000000
          },
          keywords: ["cloud", "AWS", "migration", "GovCloud"],
          status: "new"
        }
      ];

      // Calculate match scores based on org NAICS (This is the original basic match logic)
      const oppsWithScores = sampleOpps.map(opp => {
        let matchScore = 50; // Base score
        const matchReasons = [];

        if (organization.primary_naics === opp.naics_code) {
          matchScore += 30;
          matchReasons.push("Primary NAICS match");
        } else if (organization.secondary_naics?.includes(opp.naics_code)) {
          matchScore += 20;
          matchReasons.push("Secondary NAICS match");
        }

        if (organization.certifications?.includes(opp.set_aside)) {
          matchScore += 20;
          matchReasons.push(`${opp.set_aside} certified`);
        }

        return {
          ...opp,
          organization_id: organization.id,
          match_score: Math.min(matchScore, 100),
          match_reasons: matchReasons
        };
      });

      // Save to database
      for (const opp of oppsWithScores) {
        const existing = await base44.entities.SAMOpportunity.filter({
          notice_id: opp.notice_id,
          organization_id: organization.id
        });

        if (existing.length === 0) {
          await base44.entities.SAMOpportunity.create(opp);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['sam-opportunities'] });
      alert(`✓ Found ${oppsWithScores.length} new opportunities!`);
    } catch (error) {
      console.error("Error searching:", error);
      alert("Error searching SAM.gov");
    }
    setIsSearching(false);
  };

  const handleImportOpportunity = (opp) => {
    setSelectedOpp(opp);
    setShowImportDialog(true);
  };

  const handleCreateProposal = () => {
    if (!selectedOpp) return;
    
    const proposalName = `${selectedOpp.department} - ${selectedOpp.title.substring(0, 50)}`;
    createProposalFromOppMutation.mutate({ opp: selectedOpp, proposalName });
  };

  const filteredOpps = opportunities.filter(opp => {
    const matchesSearch = !searchQuery || 
      opp.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.solicitation_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesNAICS = filters.naics === "all" || opp.naics_code === filters.naics;
    const matchesSetAside = filters.setAside === "all" || opp.set_aside === filters.setAside;
    const matchesAgency = filters.agency === "all" || opp.department === filters.agency;
    const matchesType = filters.noticeType === "all" || opp.notice_type === filters.noticeType;

    return matchesSearch && matchesNAICS && matchesSetAside && matchesAgency && matchesType;
  });

  const savedOpps = filteredOpps.filter(o => o.status === 'saved' || o.status === 'tracking');
  const newOpps = filteredOpps.filter(o => o.status === 'new');
  const convertedOpps = filteredOpps.filter(o => o.status === 'proposal_created');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Globe className="w-8 h-8 text-blue-600" />
            AI Opportunity Finder
          </h1>
          <p className="text-slate-600">Find and match opportunities using semantic AI analysis</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={simulateSAMSearch}
            disabled={isSearching}
            variant="outline"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Search SAM.gov
              </>
            )}
          </Button>
          <Button
            onClick={runSemanticMatching}
            disabled={runningAIMatch || opportunities.length === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {runningAIMatch ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                AI Matching...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Run AI Semantic Match
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search opportunities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={filters.agency} onValueChange={(value) => setFilters({...filters, agency: value})}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Agency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agencies</SelectItem>
                  <SelectItem value="Department of Defense">DoD</SelectItem>
                  <SelectItem value="General Services Administration">GSA</SelectItem>
                  <SelectItem value="Department of Homeland Security">DHS</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.setAside} onValueChange={(value) => setFilters({...filters, setAside: value})}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Set-Aside" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Set-Asides</SelectItem>
                  <SelectItem value="None">Full & Open</SelectItem>
                  <SelectItem value="8(a)">8(a)</SelectItem>
                  <SelectItem value="HUBZone">HUBZone</SelectItem>
                  <SelectItem value="SDVOSB">SDVOSB</SelectItem>
                  <SelectItem value="Total Small Business">Small Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Opportunity Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">
            All ({filteredOpps.length})
          </TabsTrigger>
          <TabsTrigger value="new">
            <Sparkles className="w-4 h-4 mr-2" />
            New ({newOpps.length})
          </TabsTrigger>
          <TabsTrigger value="saved">
            <Bookmark className="w-4 h-4 mr-2" />
            Saved ({savedOpps.length})
          </TabsTrigger>
          <TabsTrigger value="converted">
            <FileText className="w-4 h-4 mr-2" />
            Converted ({convertedOpps.length})
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
          </div>
        ) : (
          <>
            <TabsContent value="all">
              <OpportunityGrid 
                opportunities={filteredOpps} 
                onImport={handleImportOpportunity}
                onSave={saveOpportunityMutation.mutate}
              />
            </TabsContent>

            <TabsContent value="new">
              <OpportunityGrid 
                opportunities={newOpps} 
                onImport={handleImportOpportunity}
                onSave={saveOpportunityMutation.mutate}
              />
            </TabsContent>

            <TabsContent value="saved">
              <OpportunityGrid 
                opportunities={savedOpps} 
                onImport={handleImportOpportunity}
                onSave={saveOpportunityMutation.mutate}
              />
            </TabsContent>

            <TabsContent value="converted">
              <OpportunityGrid 
                opportunities={convertedOpps} 
                onImport={handleImportOpportunity}
                onSave={saveOpportunityMutation.mutate}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Proposal from Opportunity</DialogTitle>
          </DialogHeader>
          {selectedOpp && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">{selectedOpp.title}</h3>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-600">Solicitation:</span>{" "}
                    <span className="font-medium">{selectedOpp.solicitation_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Agency:</span>{" "}
                    <span className="font-medium">{selectedOpp.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Due Date:</span>{" "}
                    <span className="font-medium">
                      {selectedOpp.response_deadline ? new Date(selectedOpp.response_deadline).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">NAICS:</span>{" "}
                    <span className="font-medium">{selectedOpp.naics_code}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900 mb-2">
                  <strong>This will create a new proposal with:</strong>
                </p>
                <ul className="text-sm text-green-800 space-y-1 ml-5 list-disc">
                  <li>Pre-filled solicitation details</li>
                  <li>Agency and contact information</li>
                  <li>Due date and timeline</li>
                  <li>Link back to this opportunity</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateProposal}>
              <Plus className="w-4 h-4 mr-2" />
              Create Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OpportunityGrid({ opportunities, onImport, onSave }) {
  if (opportunities.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-12 text-center">
          <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-2">No opportunities found</p>
          <p className="text-sm text-slate-500">Try adjusting your filters or search SAM.gov for new opportunities</p>
        </CardContent>
      </Card>
    );
  }

  // Sort by AI analysis win probability (highest first), then by basic match score
  const sortedOpps = [...opportunities].sort((a, b) => {
    const aiWinProbA = a.ai_analysis?.win_probability || 0;
    const aiWinProbB = b.ai_analysis?.win_probability || 0;
    const scoreA = a.match_score || 0;
    const scoreB = b.match_score || 0;

    // Primary sort by AI analysis win probability if available
    if (aiWinProbA !== aiWinProbB) {
        return aiWinProbB - aiWinProbA;
    }
    // Secondary sort by basic match score
    return scoreB - scoreA;
  });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {sortedOpps.map((opp) => (
        <Card key={opp.id} className={cn(
          "border-none shadow-lg hover:shadow-xl transition-all",
          opp.ai_analysis?.bid_recommendation?.recommendation === 'strong_bid' && "ring-2 ring-green-500",
          opp.ai_analysis?.bid_recommendation?.recommendation === 'no_bid' && "opacity-75"
        )}>
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg mb-2">{opp.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{opp.notice_type}</Badge>
                  <Badge variant="secondary">{opp.contract_type}</Badge>
                  {opp.set_aside && opp.set_aside !== "None" && (
                    <Badge className="bg-purple-100 text-purple-700">{opp.set_aside}</Badge>
                  )}
                  {opp.match_score >= 70 && (
                    <Badge className="bg-green-100 text-green-700">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {opp.match_score}% Match
                    </Badge>
                  )}
                  {opp.ai_analysis?.win_probability !== undefined && (
                    <Badge className={cn(
                      opp.ai_analysis.win_probability >= 60 ? 'bg-green-600' :
                      opp.ai_analysis.win_probability >= 40 ? 'bg-yellow-600' :
                      'bg-red-600',
                      "text-white"
                    )}>
                      {opp.ai_analysis.win_probability}% Win Prob.
                    </Badge>
                  )}
                  {opp.ai_analysis?.bid_recommendation?.recommendation && (
                    <Badge className={cn(
                      opp.ai_analysis.bid_recommendation.recommendation === 'strong_bid' ? 'bg-green-600' :
                      opp.ai_analysis.bid_recommendation.recommendation === 'bid' ? 'bg-blue-600' :
                      opp.ai_analysis.bid_recommendation.recommendation === 'watch' ? 'bg-yellow-600' :
                      'bg-red-600',
                      "text-white capitalize"
                    )}>
                      {opp.ai_analysis.bid_recommendation.recommendation.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <FileText className="w-4 h-4" />
                <span className="font-medium">{opp.solicitation_number}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Globe className="w-4 h-4" />
                {opp.department}
              </div>
              {opp.response_deadline && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  Due: {new Date(opp.response_deadline).toLocaleDateString()}
                </div>
              )}
              {opp.estimated_value && (
                <div className="flex items-center gap-2 text-slate-600">
                  <DollarSign className="w-4 h-4" />
                  ${(opp.estimated_value.min / 1000000).toFixed(1)}M - ${(opp.estimated_value.max / 1000000).toFixed(1)}M
                </div>
              )}
              {opp.place_of_performance && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4" />
                  {opp.place_of_performance.city}, {opp.place_of_performance.state}
                </div>
              )}
            </div>

            {/* AI Analysis Results */}
            {opp.ai_analysis && (
              <div className="space-y-3">
                {opp.ai_analysis.strategic_fit && (
                  <div className={cn(
                    "p-3 rounded-lg border-2",
                    opp.ai_analysis.strategic_fit.fit_level === 'excellent' ? 'bg-green-50 border-green-200' :
                    opp.ai_analysis.strategic_fit.fit_level === 'good' ? 'bg-blue-50 border-blue-200' :
                    opp.ai_analysis.strategic_fit.fit_level === 'fair' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  )}>
                    <div className="text-xs font-semibold uppercase mb-1">Strategic Fit: {opp.ai_analysis.strategic_fit.fit_level}</div>
                    <p className="text-sm">{opp.ai_analysis.strategic_fit.strategic_value}</p>
                  </div>
                )}

                {opp.ai_analysis.concerns?.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-xs font-semibold text-amber-900 uppercase mb-2">Concerns:</div>
                    <ul className="space-y-1">
                      {opp.ai_analysis.concerns.slice(0, 3).map((concern, i) => (
                        <li key={i} className="text-xs text-amber-800 flex items-start gap-2">
                          <Badge className={cn(
                            concern.severity === 'critical' ? 'bg-red-600' :
                            concern.severity === 'high' ? 'bg-orange-600' :
                            concern.severity === 'medium' ? 'bg-yellow-600' :
                            'bg-blue-600',
                            "text-white text-xs"
                          )}>
                            {concern.severity}
                          </Badge>
                          <span>{concern.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {opp.ai_analysis.bid_recommendation && (
                  <div className="p-3 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                    <div className="text-xs font-semibold text-indigo-900 uppercase mb-1">AI Recommendation</div>
                    <p className="text-sm text-indigo-800">{opp.ai_analysis.bid_recommendation.reasoning}</p>
                  </div>
                )}
              </div>
            )}

            {/* Original match reasons, shown only if no AI analysis is present */}
            {opp.match_reasons && opp.match_reasons.length > 0 && !opp.ai_analysis && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs font-semibold text-green-900 mb-1">Why this matches:</p>
                <ul className="text-xs text-green-800 space-y-1">
                  {opp.match_reasons.map((reason, idx) => (
                    <li key={idx}>• {reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {opp.description && (
              <p className="text-sm text-slate-600 line-clamp-3">{opp.description}</p>
            )}

            <div className="flex gap-2 pt-2">
              {opp.status !== 'proposal_created' && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onSave(opp)}
                    disabled={opp.status === 'saved'}
                  >
                    <Bookmark className="w-4 h-4 mr-1" />
                    {opp.status === 'saved' ? 'Saved' : 'Save'}
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => onImport(opp)}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create Proposal
                  </Button>
                </>
              )}
              {opp.status === 'proposal_created' && (
                <Button 
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Proposal Created
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
