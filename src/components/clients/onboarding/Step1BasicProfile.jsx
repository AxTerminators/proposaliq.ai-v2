import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Sparkles, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function Step1BasicProfile({ formData, setFormData, onNext }) {
  const [isAIAssisting, setIsAIAssisting] = React.useState(false);

  const handleAISuggestions = async () => {
    if (!formData.organization_name && !formData.website_url) {
      toast.error('Please enter organization name or website first');
      return;
    }

    setIsAIAssisting(true);
    try {
      const prompt = `Based on the organization "${formData.organization_name || ''}" with website ${formData.website_url || 'not provided'}, suggest:
      1. The most likely industry (choose from: aerospace_defense, healthcare, information_technology, professional_services, construction_engineering, research_development, logistics_supply_chain, education_training, environmental_services, financial_services, manufacturing, telecommunications, other)
      2. 3-5 potential market segments they serve
      3. 3-5 current business challenges they might face
      4. 3-5 strategic goals they might have
      5. 2-4 potential competitors in their landscape
      
      Be specific and realistic.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: !!formData.website_url,
        response_json_schema: {
          type: "object",
          properties: {
            industry: { type: "string" },
            market_segments: { type: "array", items: { type: "string" } },
            current_challenges: { type: "array", items: { type: "string" } },
            strategic_goals: { type: "array", items: { type: "string" } },
            competition_landscape: { type: "array", items: { type: "string" } }
          }
        }
      });

      setFormData({
        ...formData,
        organization_industry: result.industry || formData.organization_industry,
        market_segments: result.market_segments || formData.market_segments,
        current_challenges: result.current_challenges || formData.current_challenges,
        strategic_goals: result.strategic_goals || formData.strategic_goals,
        competition_landscape: result.competition_landscape || formData.competition_landscape
      });

      toast.success('AI suggestions applied! Review and adjust as needed.');
    } catch (error) {
      toast.error('AI assistance failed: ' + error.message);
    } finally {
      setIsAIAssisting(false);
    }
  };

  const addArrayItem = (field, value) => {
    if (!value.trim()) return;
    setFormData({
      ...formData,
      [field]: [...(formData[field] || []), value.trim()]
    });
  };

  const removeArrayItem = (field, index) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  const handleNext = () => {
    if (!formData.organization_name?.trim() || !formData.contact_email?.trim()) {
      toast.error('Organization name and contact email are required');
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Basic & Organizational Profile
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Core information about the client organization
          </p>
        </div>
        <Button
          onClick={handleAISuggestions}
          disabled={isAIAssisting}
          variant="outline"
          className="border-purple-300 hover:bg-purple-50"
        >
          {isAIAssisting ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              AI Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Assist
            </>
          )}
        </Button>
      </div>

      {/* Basic Information */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Organization Name *</Label>
          <Input
            value={formData.organization_name}
            onChange={(e) => setFormData({...formData, organization_name: e.target.value})}
            placeholder="Acme Defense Solutions"
            className={!formData.organization_name && "border-red-300"}
          />
        </div>

        <div>
          <Label>Primary Contact Name</Label>
          <Input
            value={formData.contact_name}
            onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
            placeholder="John Smith"
          />
        </div>

        <div>
          <Label>Contact Email *</Label>
          <Input
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
            placeholder="john.smith@acme.com"
            className={!formData.contact_email && "border-red-300"}
          />
        </div>

        <div>
          <Label>Website</Label>
          <Input
            value={formData.website_url}
            onChange={(e) => setFormData({...formData, website_url: e.target.value})}
            placeholder="https://acmedefense.com"
          />
        </div>

        <div>
          <Label>Address</Label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            placeholder="123 Defense Ave, Arlington, VA"
          />
        </div>

        <div>
          <Label>Industry *</Label>
          <Select
            value={formData.organization_industry}
            onValueChange={(value) => setFormData({...formData, organization_industry: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select industry..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aerospace_defense">Aerospace & Defense</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="information_technology">Information Technology</SelectItem>
              <SelectItem value="professional_services">Professional Services</SelectItem>
              <SelectItem value="construction_engineering">Construction & Engineering</SelectItem>
              <SelectItem value="research_development">Research & Development</SelectItem>
              <SelectItem value="logistics_supply_chain">Logistics & Supply Chain</SelectItem>
              <SelectItem value="education_training">Education & Training</SelectItem>
              <SelectItem value="environmental_services">Environmental Services</SelectItem>
              <SelectItem value="financial_services">Financial Services</SelectItem>
              <SelectItem value="manufacturing">Manufacturing</SelectItem>
              <SelectItem value="telecommunications">Telecommunications</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Organization Size</Label>
          <Select
            value={formData.organization_size}
            onValueChange={(value) => setFormData({...formData, organization_size: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select size..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-10">1-10 employees</SelectItem>
              <SelectItem value="11-50">11-50 employees</SelectItem>
              <SelectItem value="51-200">51-200 employees</SelectItem>
              <SelectItem value="201-500">201-500 employees</SelectItem>
              <SelectItem value="501-1000">501-1,000 employees</SelectItem>
              <SelectItem value="1001-5000">1,001-5,000 employees</SelectItem>
              <SelectItem value="5001+">5,000+ employees</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>UEI</Label>
          <Input
            value={formData.uei}
            onChange={(e) => setFormData({...formData, uei: e.target.value})}
            placeholder="Unique Entity Identifier"
          />
        </div>

        <div>
          <Label>CAGE Code</Label>
          <Input
            value={formData.cage_code}
            onChange={(e) => setFormData({...formData, cage_code: e.target.value})}
            placeholder="1A2B3"
          />
        </div>

        <div>
          <Label>Primary NAICS Code</Label>
          <Input
            value={formData.primary_naics}
            onChange={(e) => setFormData({...formData, primary_naics: e.target.value})}
            placeholder="541330"
          />
        </div>

        <div className="col-span-2">
          <Label>Mission Statement</Label>
          <Textarea
            value={formData.mission_statement}
            onChange={(e) => setFormData({...formData, mission_statement: e.target.value})}
            placeholder="Our mission is to..."
            rows={3}
          />
        </div>
      </div>

      {/* Array Fields */}
      <div className="space-y-4 pt-4 border-t">
        {/* Market Segments */}
        <div>
          <Label>Market Segments</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add market segment..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('market_segments', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.market_segments || []).map((segment, idx) => (
              <Badge key={idx} variant="secondary" className="pl-3 pr-1">
                {segment}
                <button
                  onClick={() => removeArrayItem('market_segments', idx)}
                  className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Current Challenges */}
        <div>
          <Label>Current Challenges</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add challenge..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('current_challenges', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.current_challenges || []).map((challenge, idx) => (
              <Badge key={idx} variant="secondary" className="pl-3 pr-1">
                {challenge}
                <button
                  onClick={() => removeArrayItem('current_challenges', idx)}
                  className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Strategic Goals */}
        <div>
          <Label>Strategic Goals</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add strategic goal..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('strategic_goals', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.strategic_goals || []).map((goal, idx) => (
              <Badge key={idx} variant="secondary" className="pl-3 pr-1">
                {goal}
                <button
                  onClick={() => removeArrayItem('strategic_goals', idx)}
                  className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Competition Landscape */}
        <div>
          <Label>Competition Landscape</Label>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add competitor or competitive factor..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addArrayItem('competition_landscape', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.competition_landscape || []).map((comp, idx) => (
              <Badge key={idx} variant="secondary" className="pl-3 pr-1">
                {comp}
                <button
                  onClick={() => removeArrayItem('competition_landscape', idx)}
                  className="ml-2 hover:bg-slate-300 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
          Next: Engagement Preferences →
        </Button>
      </div>
    </div>
  );
}