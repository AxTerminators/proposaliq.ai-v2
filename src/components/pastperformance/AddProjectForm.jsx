
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  X,
  Sparkles,
  Loader2,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  Star,
  Users,
  Target,
  Award,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AddProjectForm({ project, organizationId, onClose }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState(project || {
    project_name: "",
    client_name: "",
    client_agency: "",
    client_type: "federal",
    contract_number: "",
    contract_value: "",
    contract_type: "FFP",
    start_date: "",
    end_date: "",
    status: "completed",
    naics_codes: [],
    project_description: "",
    services_provided: [],
    technologies_used: [],
    team_size: "",
    key_personnel: [],
    outcomes: {
      on_time_delivery_pct: 100,
      on_budget_pct: 100,
      uptime_pct: 99.5,
      cost_savings: 0,
      quality_score: 4.5,
      customer_satisfaction: 4.5,
      sla_compliance_pct: 99.5
    },
    cpars_rating: "N/A",
    award_fee_score: "",
    client_poc: {
      name: "",
      title: "",
      email: "",
      phone: "",
      organization: ""
    },
    testimonial: "",
    reference_permission: false,
    awards_received: [],
    challenges_overcome: [],
    innovations: [],
    keywords: [],
    geographic_location: {
      city: "",
      state: "",
      country: "USA"
    },
    prime_or_sub: "prime",
    is_featured: false,
    lessons_learned: ""
  });

  const [tempInput, setTempInput] = useState({
    service: "",
    technology: "",
    naics: "",
    keyword: "",
    award: "",
    challenge: "",
    innovation: ""
  });

  const saveProjectMutation = useMutation({
    mutationFn: async (data) => {
      // Calculate period of performance
      if (data.start_date && data.end_date) {
        const start = new Date(data.start_date);
        const end = new Date(data.end_date);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        data.period_of_performance_months = months;
      }

      // Convert string numbers to actual numbers
      data.contract_value = parseFloat(data.contract_value) || 0;
      data.team_size = parseInt(data.team_size) || 0;
      data.award_fee_score = parseFloat(data.award_fee_score) || null;

      if (project) {
        return base44.entities.PastPerformance.update(project.id, data);
      } else {
        return base44.entities.PastPerformance.create({
          ...data,
          organization_id: organizationId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['past-performance'] });
      alert(project ? "✓ Project updated!" : "✓ Project added!");
      onClose();
    }
  });

  const handleSave = () => {
    if (!formData.project_name || !formData.client_name) {
      alert("Please provide at least a project name and client name");
      return;
    }

    saveProjectMutation.mutate(formData);
  };

  const addToArray = (field, value) => {
    if (value.trim()) {
      setFormData({
        ...formData,
        [field]: [...(formData[field] || []), value.trim()]
      });
      setTempInput({ ...tempInput, [field.replace(/s$/, '')]: "" });
    }
  };

  const removeFromArray = (field, index) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  const generateNarratives = async () => {
    if (!formData.project_name || !formData.project_description) {
      alert("Please provide project name and description first");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `You are an expert government proposal writer. Generate three narrative versions of this past performance project:

**PROJECT:**
Name: ${formData.project_name}
Client: ${formData.client_name}
Value: $${formData.contract_value?.toLocaleString() || 'N/A'}
Description: ${formData.project_description}
Services: ${formData.services_provided?.join(', ') || 'N/A'}
Outcomes: ${JSON.stringify(formData.outcomes)}
CPARS: ${formData.cpars_rating}

**GENERATE THREE VERSIONS:**

1. **Technical (detailed, 300-400 words):** For technical evaluation sections. Include specific technologies, methodologies, challenges overcome, quantifiable results.

2. **Executive (concise, 150-200 words):** For executive summaries. Focus on business value, outcomes, client satisfaction, strategic impact.

3. **Brief (very short, 75-100 words):** For tables or limited space. Hit key highlights only.

Return as JSON:
{
  "technical": "...",
  "executive": "...",
  "brief": "..."
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            technical: { type: "string" },
            executive: { type: "string" },
            brief: { type: "string" }
          }
        }
      });

      setFormData({
        ...formData,
        generated_narratives: result
      });

      alert("✓ Narratives generated! Check the Narratives tab.");
    } catch (error) {
      console.error("Error generating narratives:", error);
      alert("Failed to generate narratives. Please try again.");
    }
    setIsGenerating(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {project ? (
              <>
                <FileText className="w-5 h-5" />
                Edit Project
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add Past Performance Project
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Document your completed projects to showcase in future proposals
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-200px)] pr-4">
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
              <TabsTrigger value="client">Client</TabsTrigger>
              <TabsTrigger value="narratives">Narratives</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input
                    placeholder="e.g., DHS Cloud Migration"
                    value={formData.project_name}
                    onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Client Name *</Label>
                  <Input
                    placeholder="e.g., Department of Homeland Security"
                    value={formData.client_name}
                    onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Client Agency</Label>
                  <Input
                    placeholder="e.g., DHS, DoD, GSA"
                    value={formData.client_agency}
                    onChange={(e) => setFormData({...formData, client_agency: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Client Type</Label>
                  <Select
                    value={formData.client_type}
                    onValueChange={(value) => setFormData({...formData, client_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="federal">Federal</SelectItem>
                      <SelectItem value="state">State</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contract Number</Label>
                  <Input
                    placeholder="e.g., GS-35F-0119Y"
                    value={formData.contract_number}
                    onChange={(e) => setFormData({...formData, contract_number: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contract Value (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      placeholder="5000000"
                      className="pl-10"
                      value={formData.contract_value}
                      onChange={(e) => setFormData({...formData, contract_value: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Contract Type</Label>
                  <Select
                    value={formData.contract_type}
                    onValueChange={(value) => setFormData({...formData, contract_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FFP">Firm Fixed Price (FFP)</SelectItem>
                      <SelectItem value="T&M">Time & Materials (T&M)</SelectItem>
                      <SelectItem value="CPFF">Cost Plus Fixed Fee (CPFF)</SelectItem>
                      <SelectItem value="CPAF">Cost Plus Award Fee (CPAF)</SelectItem>
                      <SelectItem value="IDIQ">IDIQ</SelectItem>
                      <SelectItem value="BPA">BPA</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={formData.prime_or_sub}
                    onValueChange={(value) => setFormData({...formData, prime_or_sub: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prime">Prime Contractor</SelectItem>
                      <SelectItem value="subcontractor">Subcontractor</SelectItem>
                      <SelectItem value="teaming_partner">Teaming Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Team Size</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      placeholder="10"
                      className="pl-10"
                      value={formData.team_size}
                      onChange={(e) => setFormData({...formData, team_size: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-900">Feature This Project</p>
                    <p className="text-xs text-amber-700">Highlight in proposal suggestions</p>
                  </div>
                </div>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({...formData, is_featured: checked})}
                />
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-2">
                <Label>Project Description</Label>
                <Textarea
                  placeholder="Describe the project, scope of work, and key deliverables..."
                  value={formData.project_description}
                  onChange={(e) => setFormData({...formData, project_description: e.target.value})}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Services Provided</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Cloud Migration, Cybersecurity"
                    value={tempInput.service}
                    onChange={(e) => setTempInput({...tempInput, service: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('services_provided', tempInput.service)}
                  />
                  <Button size="sm" onClick={() => addToArray('services_provided', tempInput.service)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.services_provided?.map((service, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {service}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('services_provided', idx)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Technologies Used</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., AWS, Docker, Kubernetes"
                    value={tempInput.technology}
                    onChange={(e) => setTempInput({...tempInput, technology: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('technologies_used', tempInput.technology)}
                  />
                  <Button size="sm" onClick={() => addToArray('technologies_used', tempInput.technology)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.technologies_used?.map((tech, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1">
                      {tech}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('technologies_used', idx)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>NAICS Codes</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 541512"
                    value={tempInput.naics}
                    onChange={(e) => setTempInput({...tempInput, naics: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('naics_codes', tempInput.naics)}
                  />
                  <Button size="sm" onClick={() => addToArray('naics_codes', tempInput.naics)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.naics_codes?.map((code, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {code}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('naics_codes', idx)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Keywords (for searching)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., cybersecurity, agile, DevSecOps"
                    value={tempInput.keyword}
                    onChange={(e) => setTempInput({...tempInput, keyword: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('keywords', tempInput.keyword)}
                  />
                  <Button size="sm" onClick={() => addToArray('keywords', tempInput.keyword)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.keywords?.map((keyword, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1">
                      {keyword}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeFromArray('keywords', idx)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Challenges Overcome</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Legacy system integration"
                    value={tempInput.challenge}
                    onChange={(e) => setTempInput({...tempInput, challenge: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('challenges_overcome', tempInput.challenge)}
                  />
                  <Button size="sm" onClick={() => addToArray('challenges_overcome', tempInput.challenge)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 mt-2">
                  {formData.challenges_overcome?.map((challenge, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                      <span className="text-sm flex-1">{challenge}</span>
                      <X className="w-4 h-4 cursor-pointer text-slate-400 hover:text-red-600" onClick={() => removeFromArray('challenges_overcome', idx)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Innovations / Unique Solutions</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Custom AI-powered automation"
                    value={tempInput.innovation}
                    onChange={(e) => setTempInput({...tempInput, innovation: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('innovations', tempInput.innovation)}
                  />
                  <Button size="sm" onClick={() => addToArray('innovations', tempInput.innovation)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 mt-2">
                  {formData.innovations?.map((innovation, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                      <span className="text-sm flex-1">{innovation}</span>
                      <X className="w-4 h-4 cursor-pointer text-slate-400 hover:text-red-600" onClick={() => removeFromArray('innovations', idx)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lessons Learned</Label>
                <Textarea
                  placeholder="Key takeaways and lessons from this project..."
                  value={formData.lessons_learned}
                  onChange={(e) => setFormData({...formData, lessons_learned: e.target.value})}
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Outcomes Tab */}
            <TabsContent value="outcomes" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>On-Time Delivery %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.outcomes?.on_time_delivery_pct || 100}
                    onChange={(e) => setFormData({
                      ...formData,
                      outcomes: { ...formData.outcomes, on_time_delivery_pct: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>On-Budget %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="150"
                    value={formData.outcomes?.on_budget_pct || 100}
                    onChange={(e) => setFormData({
                      ...formData,
                      outcomes: { ...formData.outcomes, on_budget_pct: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>System Uptime %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.outcomes?.uptime_pct || 99.5}
                    onChange={(e) => setFormData({
                      ...formData,
                      outcomes: { ...formData.outcomes, uptime_pct: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cost Savings Delivered (USD)</Label>
                  <Input
                    type="number"
                    value={formData.outcomes?.cost_savings || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      outcomes: { ...formData.outcomes, cost_savings: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quality Score (0-5)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.outcomes?.quality_score || 4.5}
                    onChange={(e) => setFormData({
                      ...formData,
                      outcomes: { ...formData.outcomes, quality_score: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Customer Satisfaction (0-5)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.outcomes?.customer_satisfaction || 4.5}
                    onChange={(e) => setFormData({
                      ...formData.outcomes,
                      outcomes: { ...formData.outcomes, customer_satisfaction: parseFloat(e.target.value) }
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>SLA Compliance %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.outcomes?.sla_compliance_pct || 99.5}
                    onChange={(e) => setFormData({
                      ...formData.outcomes,
                      outcomes: { ...formData.outcomes, sla_compliance_pct: parseFloat(e.target.value) }
                    })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="space-y-2">
                  <Label>CPARS Rating</Label>
                  <Select
                    value={formData.cpars_rating}
                    onValueChange={(value) => setFormData({...formData, cpars_rating: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N/A">N/A</SelectItem>
                      <SelectItem value="Exceptional">Exceptional</SelectItem>
                      <SelectItem value="Very Good">Very Good</SelectItem>
                      <SelectItem value="Satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="Marginal">Marginal</SelectItem>
                      <SelectItem value="Unsatisfactory">Unsatisfactory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Award Fee Score (if applicable)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="95"
                    value={formData.award_fee_score}
                    onChange={(e) => setFormData({...formData, award_fee_score: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <Label>Awards Received</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., DoD Innovation Award 2023"
                    value={tempInput.award}
                    onChange={(e) => setTempInput({...tempInput, award: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && addToArray('awards_received', tempInput.award)}
                  />
                  <Button size="sm" onClick={() => addToArray('awards_received', tempInput.award)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 mt-2">
                  {formData.awards_received?.map((award, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-200">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span className="text-sm flex-1">{award}</span>
                      <X className="w-4 h-4 cursor-pointer text-slate-400 hover:text-red-600" onClick={() => removeFromArray('awards_received', idx)} />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Client Tab */}
            <TabsContent value="client" className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Client Point of Contact
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="John Smith"
                      value={formData.client_poc?.name || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        client_poc: { ...formData.client_poc, name: e.target.value }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Program Manager"
                      value={formData.client_poc?.title || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        client_poc: { ...formData.client_poc, title: e.target.value }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="john.smith@agency.gov"
                      value={formData.client_poc?.email || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        client_poc: { ...formData.client_poc, email: e.target.value }
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.client_poc?.phone || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        client_poc: { ...formData.client_poc, phone: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Client Testimonial</Label>
                  <Textarea
                    placeholder="Quote from client praising your work..."
                    value={formData.testimonial}
                    onChange={(e) => setFormData({...formData, testimonial: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Reference Permission</p>
                      <p className="text-xs text-green-700">Client can be contacted as reference</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.reference_permission}
                    onCheckedChange={(checked) => setFormData({...formData, reference_permission: checked})}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Narratives Tab */}
            <TabsContent value="narratives" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">AI-Generated Narratives</h3>
                  <p className="text-sm text-slate-600">Three versions optimized for different uses</p>
                </div>
                <Button
                  onClick={generateNarratives}
                  disabled={isGenerating || !formData.project_name}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Narratives
                    </>
                  )}
                </Button>
              </div>

              {formData.generated_narratives ? (
                <div className="space-y-4">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-base">Technical Version (300-400 words)</CardTitle>
                      <CardDescription>For detailed technical evaluation sections</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {formData.generated_narratives.technical}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-base">Executive Version (150-200 words)</CardTitle>
                      <CardDescription>For executive summaries and overviews</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {formData.generated_narratives.executive}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                      <CardTitle className="text-base">Brief Version (75-100 words)</CardTitle>
                      <CardDescription>For tables or space-constrained areas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {formData.generated_narratives.brief}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="mb-2">No narratives generated yet</p>
                  <p className="text-sm">Fill in the project details and click "Generate Narratives"</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saveProjectMutation.isLoading}>
            {saveProjectMutation.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {project ? 'Update' : 'Save'} Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
