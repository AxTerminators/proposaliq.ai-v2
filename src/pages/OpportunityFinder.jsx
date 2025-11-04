
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
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
  Brain,    // New icon
  Target,   // New icon
  Loader2,  // New icon
  CheckCircle, // New icon
  AlertCircle, // New icon
  Zap,      // New icon
  Award,    // New icon
  BarChart3 // New icon
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils"; // New import
import moment from "moment"; // New import

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
  const [aiAnalyzing, setAiAnalyzing] = useState(false); // New state
  const [error, setError] = useState(null); // New state

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

  const { data: pastPerformance = [] } = useQuery({ // New query
    queryKey: ['past-performance-for-matching', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.PastPerformance.filter({ organization_id: organization.id }, '-end_date', 20);
    },
    enabled: !!organization?.id,
    initialData: []
  });

  const { data: capabilities = [] } = useQuery({ // New query
    queryKey: ['capabilities-for-matching', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalResource.filter({ 
        organization_id: organization.id,
        resource_type: { $in: ['capability_statement', 'boilerplate_text'] }
      }, '-created_date', 50);
    },
    enabled: !!organization?.id,
    initialData: []
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
        current_phase: "phase1",
        ai_opportunity_analysis: opp.ai_analysis || null // Store AI analysis with proposal
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

  const runAIOpportunityMatching = async () => { // New function
    if (!organization) {
      alert("No organization found. Please ensure your organization profile is set up.");
      return;
    }

    if (opportunities.length === 0) {
      alert("No opportunities to analyze. Please run the SAM.gov search first to populate opportunities.");
      return;
    }

    setAiAnalyzing(true);
    setError(null);

    try {
      // Build comprehensive capability profile
      const orgCapabilities = {
        name: organization.organization_name,
        naics: {
          primary: organization.primary_naics,
          secondary: organization.secondary_naics || []
        },
        certifications: organization.certifications || [],
        past_performance: pastPerformance.map(pp => ({
          project: pp.project_name,
          client: pp.client_name,
          agency: pp.client_agency,
          services: pp.services_provided || [],
          technologies: pp.technologies_used || [],
          contract_value: pp.contract_value,
          outcome_quality: pp.outcomes?.quality_score,
          naics: pp.naics_codes || []
        })),
        capabilities: capabilities.map(cap => ({
          type: cap.resource_type,
          content: cap.boilerplate_content?.slice(0, 500) || cap.title,
          category: cap.content_category
        }))
      };

      const opportunitiesToAnalyze = opportunities.filter(o => !o.ai_analysis || (new Date() - new Date(o.ai_analysis.analyzed_date)) / (1000 * 60 * 60 * 24) > 7) // Analyze new or old (older than 7 days)
                                                 .slice(0, 10); // Limit to 10 for demonstration/cost

      if (opportunitiesToAnalyze.length === 0) {
        alert("All recent opportunities have been analyzed by AI. Try searching SAM.gov for new ones.");
        setAiAnalyzing(false);
        return;
      }

      let analyzedCount = 0;
      // Analyze each opportunity with AI
      for (const opp of opportunitiesToAnalyze) {
        const analysisPrompt = `You are an expert in government contracting and opportunity qualification. Perform deep semantic analysis to determine how well this organization matches this opportunity.

**ORGANIZATION PROFILE:**
Name: ${orgCapabilities.name}
Primary NAICS: ${orgCapabilities.naics.primary}
Secondary NAICS: ${orgCapabilities.naics.secondary.join(', ')}
Certifications: ${orgCapabilities.certifications.join(', ')}

**PAST PERFORMANCE (${orgCapabilities.past_performance.length} projects):**
${orgCapabilities.past_performance.slice(0, 5).map(pp => `
- ${pp.project} for ${pp.client} ${pp.agency ? `(${pp.agency})` : ''}
  Services: ${pp.services.join(', ')}
  Technologies: ${pp.technologies.join(', ')}
  Value: $${(pp.contract_value / 1000000).toFixed(1)}M
  Quality: ${pp.outcome_quality}/5
`).join('\n')}

**CORE CAPABILITIES:**
${orgCapabilities.capabilities.slice(0, 10).map(cap => `- ${cap.category}: ${cap.content.slice(0, 200)}...`).join('\n')}

**OPPORTUNITY TO ANALYZE:**
Title: ${opp.title}
Agency: ${opp.department} - ${opp.sub_agency}
NAICS: ${opp.naics_code} (${opp.naics_description})
Contract Type: ${opp.contract_type}
Set-Aside: ${opp.set_aside}
Value: ${opp.estimated_value ? `$${(opp.estimated_value.min / 1000000).toFixed(1)}M - $${(opp.estimated_value.max / 1000000).toFixed(1)}M` : 'N/A'}
Due: ${opp.response_deadline ? moment(opp.response_deadline).format('MMM D, YYYY') : 'N/A'} (${moment(opp.response_deadline).diff(moment(), 'days')} days)

**REQUIREMENTS:**
${opp.description}

**KEYWORDS:** ${opp.keywords?.join(', ') || 'N/A'}

**YOUR TASK - DEEP SEMANTIC MATCHING:**

Analyze the semantic match between organization capabilities and opportunity requirements. Provide a structured JSON response following the schema. Ensure all numeric scores are between 0 and 100.

Provide comprehensive, honest assessment. Focus on specific reasons and actionable insights.`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: analysisPrompt,
          response_json_schema: {
            type: "object",
            properties: {
              overall_match_score: { type: "number", minimum: 0, maximum: 100 },
              win_probability: { type: "number", minimum: 0, maximum: 100 },
              capability_alignment: {
                type: "object",
                properties: {
                  technical_fit: { type: "number", minimum: 0, maximum: 100 },
                  past_performance_relevance: { type: "number", minimum: 0, maximum: 100 },
                  certification_match: { type: "number", minimum: 0, maximum: 100 },
                  size_appropriateness: { type: "number", minimum: 0, maximum: 100 }
                }
              },
              match_strengths: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    strength: { type: "string" },
                    evidence: { type: "string" },
                    impact: { type: "string", enum: ["high", "medium", "low"] }
                  },
                  required: ["strength", "evidence", "impact"]
                }
              },
              match_weaknesses: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    weakness: { type: "string" },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    mitigation: { type: "string" }
                  },
                  required: ["weakness", "severity", "mitigation"]
                }
              },
              relevant_past_performance: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    project_name: { type: "string" },
                    relevance_explanation: { type: "string" },
                    similarity_score: { type: "number", minimum: 0, maximum: 100 }
                  },
                  required: ["project_name", "relevance_explanation", "similarity_score"]
                }
              },
              competitive_landscape: {
                type: "object",
                properties: {
                  likely_competitors: { type: "array", items: { type: "string" } },
                  our_competitive_advantage: { type: "array", items: { type: "string" } },
                  our_competitive_disadvantage: { type: "array", items: { type: "string" } },
                  incumbent_risk: { type: "string", enum: ["low", "medium", "high", "unknown"] }
                },
                required: ["likely_competitors", "our_competitive_advantage", "incumbent_risk"]
              },
              risk_assessment: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    risk_type: { type: "string", enum: ["technical", "financial", "timeline", "certification", "past_performance", "competition", "other"] },
                    risk_description: { type: "string" },
                    risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                    mitigation_strategy: { type: "string" }
                  },
                  required: ["risk_type", "risk_description", "risk_level", "mitigation_strategy"]
                }
              },
              strategic_recommendation: {
                type: "object",
                properties: {
                  bid_decision: { type: "string", enum: ["strong_bid", "bid", "consider", "pass"] },
                  rationale: { type: "string" },
                  recommended_strategy: { type: "string" },
                  teaming_recommendation: { type: "string" },
                  positioning_approach: { type: "string" }
                },
                required: ["bid_decision", "rationale", "recommended_strategy"]
              },
              key_requirements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    requirement: { type: "string" },
                    can_meet: { type: "boolean" },
                    explanation: { type: "string" }
                  },
                  required: ["requirement", "can_meet"]
                }
              },
              estimated_pursuit_cost: {
                type: "object",
                properties: {
                  low: { type: "number" },
                  high: { type: "number" },
                  effort_level: { type: "string", enum: ["low", "medium", "high", "very_high"] }
                },
                required: ["low", "high", "effort_level"]
              },
              confidence_in_analysis: { type: "number", minimum: 0, maximum: 100 }
            },
            required: ["overall_match_score", "win_probability", "capability_alignment", "match_strengths", "strategic_recommendation"]
          }
        });

        // Update opportunity with AI analysis
        await base44.entities.SAMOpportunity.update(opp.id, {
          match_score: result.overall_match_score,
          match_reasons: result.match_strengths?.map(s => s.strength) || [],
          ai_analysis: {
            win_probability: result.win_probability,
            capability_alignment: result.capability_alignment,
            match_strengths: result.match_strengths,
            match_weaknesses: result.match_weaknesses,
            relevant_past_performance: result.relevant_past_performance,
            competitive_landscape: result.competitive_landscape,
            risk_assessment: result.risk_assessment,
            strategic_recommendation: result.strategic_recommendation,
            key_requirements: result.key_requirements,
            estimated_pursuit_cost: result.estimated_pursuit_cost,
            confidence_in_analysis: result.confidence_in_analysis,
            analyzed_date: new Date().toISOString()
          }
        });
        analyzedCount++;
      }

      queryClient.invalidateQueries({ queryKey: ['sam-opportunities'] });
      alert(`✓ AI matching complete! Analyzed ${analyzedCount} opportunities with semantic similarity.`);

    } catch (err) {
      console.error("Error running AI matching:", err);
      setError(new Error("Failed to run AI matching. Please check the console for details."));
    } finally {
      setAiAnalyzing(false);
    }
  };

  const simulateSAMSearch = async () => {
    setIsSearching(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

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
          description: "The Defense Health Agency requires comprehensive IT support services including help desk, systems administration, network management, cybersecurity monitoring, and cloud infrastructure support for a 12-month base period with four 12-month option periods. Services must include 24/7 help desk coverage, tier 1-3 technical support, system administration for Windows and Linux environments, network monitoring and troubleshooting, cybersecurity incident response, cloud migration support for AWS GovCloud, and documentation maintenance. Contractor must have current DoD IL5 authorization and ability to obtain Secret clearances for key personnel.",
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
          keywords: ["IT support", "help desk", "systems administration", "cybersecurity", "AWS", "cloud", "DoD"],
          status: "new"
        },
        {
          notice_id: "GSA12325Q0045",
          solicitation_number: "GSA12325Q0045",
          title: "Cloud Migration and Modernization Services",
          department: "General Services Administration",
          sub_agency: "Federal Acquisition Service",
          office: "GSA Region 12",
          notice_type: "Combined Synopsis/Solicitation",
          contract_type: "Fixed Price",
          naics_code: "541511",
          naics_description: "Custom Computer Programming Services",
          set_aside: "8(a)",
          description: "GSA seeks qualified contractors to provide cloud migration services for legacy applications to AWS GovCloud and Azure Government. Project includes assessment and discovery of current environment (200+ applications), migration planning, application modernization using containers and microservices, data migration, security implementation meeting FedRAMP requirements, training for government staff, and 6 months of post-migration support. Contractor must demonstrate experience with federal cloud migrations, FedRAMP compliance, and modern DevSecOps practices.",
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
          keywords: ["cloud", "AWS", "Azure", "migration", "GovCloud", "FedRAMP", "modernization", "microservices"],
          status: "new"
        },
        {
          notice_id: "DHS24Q0789",
          solicitation_number: "DHS24Q0789",
          title: "Cybersecurity Assessment and Continuous Monitoring Services",
          department: "Department of Homeland Security",
          sub_agency: "Cybersecurity and Infrastructure Security Agency",
          office: "CISA Contracting",
          notice_type: "Solicitation",
          contract_type: "Time and Materials",
          naics_code: "541512",
          naics_description: "Computer Systems Design Services",
          set_aside: "SDVOSB",
          description: "CISA requires comprehensive cybersecurity assessment and continuous monitoring services for critical infrastructure protection. Scope includes vulnerability assessments, penetration testing, security control validation, continuous monitoring dashboard development, threat intelligence integration, incident response planning, and compliance auditing for NIST 800-53 and RMF requirements. Team must include certified professionals (CISSP, CEH, GIAC) with federal experience.",
          posted_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          response_deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
          place_of_performance: {
            city: "Arlington",
            state: "VA",
            country: "USA"
          },
          estimated_value: {
            min: 3000000,
            max: 7000000
          },
          keywords: ["cybersecurity", "assessment", "monitoring", "NIST", "RMF", "penetration testing", "vulnerability"],
          status: "new"
        }
      ];

      // Save opportunities
      for (const opp of sampleOpps) {
        const existing = await base44.entities.SAMOpportunity.filter({
          notice_id: opp.notice_id,
          organization_id: organization.id
        });

        if (existing.length === 0) {
          await base44.entities.SAMOpportunity.create({
            ...opp,
            organization_id: organization.id,
            match_score: 0, // Will be calculated by AI
            match_reasons: [],
            ai_analysis: null // Initially null, will be populated by AI
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['sam-opportunities'] });
      alert(`✓ Found ${sampleOpps.length} new opportunities! Run AI matching to analyze fit.`);
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

  // Sort by match score
  const sortedOpps = [...filteredOpps].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  const savedOpps = sortedOpps.filter(o => o.status === 'saved' || o.status === 'tracking');
  const newOpps = sortedOpps.filter(o => o.status === 'new');
  const convertedOpps = sortedOpps.filter(o => o.status === 'proposal_created');
  const strongMatches = sortedOpps.filter(o => o.match_score >= 70);
  const aiAnalyzedOpps = sortedOpps.filter(o => o.ai_analysis);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">AI-Powered Opportunity Finder</CardTitle>
                <CardDescription>Semantic matching between your capabilities and SAM.gov opportunities</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={runAIOpportunityMatching}
                disabled={aiAnalyzing || opportunities.length === 0}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {aiAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    AI Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 mr-2" />
                    AI Match Analysis
                  </>
                )}
              </Button>
              <Button 
                onClick={simulateSAMSearch}
                disabled={isSearching}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
            </div>
          </div>
        </CardHeader>
      </Card>

      {opportunities.length === 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            No opportunities loaded. Click "Search SAM.gov" to find opportunities, then run AI Match Analysis for intelligent scoring.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <Globe className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-3xl font-bold text-blue-600">{opportunities.length}</div>
            <div className="text-sm text-blue-900">Total Opportunities</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-3xl font-bold text-green-600">{strongMatches.length}</div>
            <div className="text-sm text-green-900">Strong Matches (70%+)</div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4 text-center">
            <Brain className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-3xl font-bold text-purple-600">{aiAnalyzedOpps.length}</div>
            <div className="text-sm text-purple-900">AI Analyzed</div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <Bookmark className="w-6 h-6 mx-auto mb-2 text-amber-600" />
            <div className="text-3xl font-bold text-amber-600">{savedOpps.length}</div>
            <div className="text-sm text-amber-900">Saved</div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-4 text-center">
            <Award className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
            <div className="text-3xl font-bold text-indigo-600">{convertedOpps.length}</div>
            <div className="text-sm text-indigo-900">Converted to Proposals</div>
          </CardContent>
        </Card>
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
          <TabsTrigger value="all">All ({sortedOpps.length})</TabsTrigger>
          <TabsTrigger value="strong">
            <Target className="w-4 h-4 mr-2" />
            Strong Match ({strongMatches.length})
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
                opportunities={sortedOpps} 
                onImport={handleImportOpportunity}
                onSave={saveOpportunityMutation.mutate}
              />
            </TabsContent>

            <TabsContent value="strong">
              <OpportunityGrid 
                opportunities={strongMatches} 
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

      {/* Import Dialog - Enhanced with AI Analysis */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                      {selectedOpp.response_deadline ? moment(selectedOpp.response_deadline).format('MMM D, YYYY') : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">NAICS:</span>{" "}
                    <span className="font-medium">{selectedOpp.naics_code}</span>
                  </div>
                </div>
              </div>

              {selectedOpp.ai_analysis && (
                <Card className="border-2 border-purple-300 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      AI Strategic Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-3xl font-bold text-purple-600">
                          {selectedOpp.ai_analysis.win_probability}%
                        </div>
                        <div className="text-xs text-slate-600">Win Probability</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <Badge className={cn(
                          "text-white text-base px-4 py-2",
                          selectedOpp.ai_analysis.strategic_recommendation?.bid_decision === 'strong_bid' && 'bg-green-600',
                          selectedOpp.ai_analysis.strategic_recommendation?.bid_decision === 'bid' && 'bg-blue-600',
                          selectedOpp.ai_analysis.strategic_recommendation?.bid_decision === 'consider' && 'bg-yellow-600',
                          selectedOpp.ai_analysis.strategic_recommendation?.bid_decision === 'pass' && 'bg-red-600'
                        )}>
                          {selectedOpp.ai_analysis.strategic_recommendation?.bid_decision?.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        <div className="text-xs text-slate-600 mt-1">Recommendation</div>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-sm text-slate-700">
                        <strong>Strategy:</strong> {selectedOpp.ai_analysis.strategic_recommendation?.recommended_strategy}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900 mb-2">
                  <strong>This will create a new proposal with:</strong>
                </p>
                <ul className="text-sm text-green-800 space-y-1 ml-5 list-disc">
                  <li>Pre-filled solicitation details</li>
                  <li>Agency and contact information</li>
                  <li>Due date and timeline</li>
                  {selectedOpp.ai_analysis && <li>AI strategic assessment and recommendations</li>}
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
  const [expandedOpp, setExpandedOpp] = useState(null);

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

  return (
    <div className="space-y-4">
      {opportunities.map((opp) => {
        const isExpanded = expandedOpp === opp.id;
        const hasAIAnalysis = opp.ai_analysis && opp.ai_analysis.strategic_recommendation;

        return (
          <Card key={opp.id} className={cn(
            "border-2 hover:shadow-xl transition-all",
            opp.match_score >= 80 && "border-green-500 bg-green-50/50",
            opp.match_score >= 70 && opp.match_score < 80 && "border-blue-500 bg-blue-50/50",
            opp.match_score >= 50 && opp.match_score < 70 && "border-amber-500 bg-amber-50/50",
            opp.match_score < 50 && opp.match_score > 0 && "border-slate-300 bg-slate-50/50",
            opp.match_score === 0 && !hasAIAnalysis && "border-slate-200" // Default for unanalyzed
          )}>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <CardTitle className="text-lg flex-1">{opp.title}</CardTitle>
                    {opp.match_score > 0 && (
                      <div className="text-right flex-shrink-0">
                        <div className={cn(
                          "text-3xl font-bold",
                          opp.match_score >= 80 && "text-green-600",
                          opp.match_score >= 70 && opp.match_score < 80 && "text-blue-600",
                          opp.match_score >= 50 && opp.match_score < 70 && "text-amber-600",
                          opp.match_score < 50 && "text-slate-600"
                        )}>
                          {opp.match_score}%
                        </div>
                        <div className="text-xs text-slate-600">Match Score</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{opp.notice_type}</Badge>
                    <Badge variant="secondary">{opp.contract_type}</Badge>
                    {opp.set_aside && opp.set_aside !== "None" && (
                      <Badge className="bg-purple-100 text-purple-700">{opp.set_aside}</Badge>
                    )}
                    {opp.match_score >= 70 && (
                      <Badge className="bg-green-600 text-white">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Strong Match
                      </Badge>
                    )}
                    {hasAIAnalysis && (
                      <Badge className="bg-indigo-600 text-white">
                        <Brain className="w-3 h-3 mr-1" />
                        AI Analyzed
                      </Badge>
                    )}
                    {hasAIAnalysis && opp.ai_analysis?.win_probability >= 60 && (
                      <Badge className="bg-blue-600 text-white">
                        <BarChart3 className="w-3 h-3 mr-1"/>
                        {opp.ai_analysis.win_probability}% Win Probability
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 space-y-4">
              {/* Basic Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{opp.solicitation_number}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Globe className="w-4 h-4" />
                  {opp.department} {opp.sub_agency && `- ${opp.sub_agency}`}
                </div>
                {opp.response_deadline && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4" />
                    Due: {moment(opp.response_deadline).format('MMM D, YYYY')} 
                    <Badge variant="outline" className="text-xs">
                      {moment(opp.response_deadline).diff(moment(), 'days')} days
                    </Badge>
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

              {/* Match Reasons */}
              {opp.match_reasons && opp.match_reasons.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs font-semibold text-green-900 mb-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Why This Matches:
                  </p>
                  <ul className="text-xs text-green-800 space-y-1">
                    {opp.match_reasons.slice(0, 3).map((reason, idx) => (
                      <li key={idx}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Analysis Preview */}
              {hasAIAnalysis && !isExpanded && (
                <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-indigo-600" />
                      <span className="font-semibold text-indigo-900">AI Strategic Assessment</span>
                    </div>
                    <Badge className={cn(
                      "text-white",
                      opp.ai_analysis.strategic_recommendation.bid_decision === 'strong_bid' && 'bg-green-600',
                      opp.ai_analysis.strategic_recommendation.bid_decision === 'bid' && 'bg-blue-600',
                      opp.ai_analysis.strategic_recommendation.bid_decision === 'consider' && 'bg-yellow-600',
                      opp.ai_analysis.strategic_recommendation.bid_decision === 'pass' && 'bg-red-600'
                    )}>
                      {opp.ai_analysis.strategic_recommendation.bid_decision.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-indigo-800 mb-2">
                    {opp.ai_analysis.strategic_recommendation.rationale?.slice(0, 150)}...
                  </p>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedOpp(isExpanded ? null : opp.id)}
                    className="text-indigo-600"
                  >
                    View Full Analysis →
                  </Button>
                </div>
              )}

              {/* Expanded AI Analysis */}
              {hasAIAnalysis && isExpanded && (
                <div className="space-y-4 border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Complete AI Analysis
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedOpp(null)}
                    >
                      Collapse
                    </Button>
                  </div>

                  {/* Capability Scores */}
                  {opp.ai_analysis.capability_alignment && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-3">Capability Alignment</h5>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(opp.ai_analysis.capability_alignment).map(([key, value]) => (
                          <div key={key} className="p-3 bg-white rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
                              <span className="font-bold text-slate-900">{value}%</span>
                            </div>
                            <Progress value={value} className="h-2" indicatorColor={
                              value >= 80 ? "bg-green-500" : 
                              value >= 60 ? "bg-blue-500" : 
                              value >= 40 ? "bg-amber-500" : "bg-red-500"
                            } />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Match Strengths */}
                  {opp.ai_analysis.match_strengths?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-green-900 mb-2">Match Strengths</h5>
                      <div className="space-y-2">
                        {opp.ai_analysis.match_strengths.map((strength, idx) => (
                          <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Badge className={cn(
                                "text-white capitalize",
                                strength.impact === 'high' && 'bg-green-600',
                                strength.impact === 'medium' && 'bg-blue-600',
                                strength.impact === 'low' && 'bg-slate-600'
                              )}>{strength.impact}</Badge>
                              <div className="flex-1">
                                <div className="font-semibold text-green-900 text-sm">{strength.strength}</div>
                                <div className="text-xs text-green-800">{strength.evidence}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Match Weaknesses */}
                  {opp.ai_analysis.match_weaknesses?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-red-900 mb-2">Challenges & Mitigations</h5>
                      <div className="space-y-2">
                        {opp.ai_analysis.match_weaknesses.map((weakness, idx) => (
                          <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2 mb-2">
                              <Badge className={cn(
                                "text-white capitalize",
                                weakness.severity === 'critical' && 'bg-red-600',
                                weakness.severity === 'high' && 'bg-orange-600',
                                weakness.severity === 'medium' && 'bg-yellow-600',
                                weakness.severity === 'low' && 'bg-blue-600'
                              )}>{weakness.severity}</Badge>
                              <div className="flex-1">
                                <div className="font-semibold text-red-900 text-sm">{weakness.weakness}</div>
                              </div>
                            </div>
                            <div className="text-xs text-green-800 bg-green-50 p-2 rounded border border-green-200">
                              <strong>Mitigation:</strong> {weakness.mitigation}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Relevant Past Performance */}
                  {opp.ai_analysis.relevant_past_performance?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-2">Relevant Past Performance</h5>
                      <div className="space-y-2">
                        {opp.ai_analysis.relevant_past_performance.slice(0, 3).map((pp, idx) => (
                          <div key={idx} className="p-3 bg-white border rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-900 text-sm">{pp.project_name}</span>
                              <Badge className="bg-blue-600 text-white">{pp.similarity_score}% similar</Badge>
                            </div>
                            <p className="text-xs text-slate-600">{pp.relevance_explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strategic Recommendation */}
                  <div className="p-4 bg-white border-2 border-indigo-300 rounded-lg">
                    <h5 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Strategic Recommendation
                    </h5>
                    <div className="space-y-2 text-sm">
                      <p className="text-slate-700">
                        <strong>Rationale:</strong> {opp.ai_analysis.strategic_recommendation.rationale}
                      </p>
                      <p className="text-slate-700">
                        <strong>Strategy:</strong> {opp.ai_analysis.strategic_recommendation.recommended_strategy}
                      </p>
                      {opp.ai_analysis.strategic_recommendation.teaming_recommendation && (
                        <p className="text-slate-700">
                          <strong>Teaming:</strong> {opp.ai_analysis.strategic_recommendation.teaming_recommendation}
                        </p>
                      )}
                      {opp.ai_analysis.strategic_recommendation.positioning_approach && (
                        <p className="text-slate-700">
                          <strong>Positioning:</strong> {opp.ai_analysis.strategic_recommendation.positioning_approach}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {opp.description && (
                <p className="text-sm text-slate-600 line-clamp-3">{opp.description}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                {hasAIAnalysis && !isExpanded && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setExpandedOpp(opp.id)}
                    className="border-indigo-200 text-indigo-700"
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    View AI Analysis
                  </Button>
                )}
                
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
        );
      })}
    </div>
  );
}
