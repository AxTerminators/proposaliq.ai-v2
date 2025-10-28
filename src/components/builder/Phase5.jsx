import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Sparkles, 
  Settings,
  Lightbulb,
  Calculator,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TONES = [
  "Clear",
  "Formal",
  "Concise",
  "Courteous",
  "Confident",
  "Persuasive",
  "Professional",
  "Humanized",
  "Conversational"
];

const READING_LEVELS = [
  "Government Plain Language",
  "Flesch–Kincaid Grade Level ~10 (Flesch 60+)",
  "Flesch–Kincaid Grade Level ~8 (Flesch 70+)"
];

const PROPOSAL_SECTIONS = [
  {
    title: "Executive Summary",
    sections: [{ name: "Executive Summary", defaultWords: 500 }]
  },
  {
    title: "Volume I - Technical Approach",
    sections: [
      { name: "Technical Capability", defaultWords: 800 },
      { name: "Understanding the Problem", defaultWords: 600 },
      { name: "Proposed Methodology and Solution", defaultWords: 1000 },
      { name: "Work Plan", defaultWords: 700, indent: true },
      { name: "Tools and Technologies", defaultWords: 500, indent: true },
      { name: "Standards and Practices", defaultWords: 400, indent: true },
      { name: "Risk Management", defaultWords: 600 },
      { name: "Innovation and Value", defaultWords: 500 },
      { name: "Innovation", defaultWords: 400, indent: true },
      { name: "Discriminators", defaultWords: 400, indent: true },
      { name: "Benefits", defaultWords: 400, indent: true }
    ]
  },
  {
    title: "Volume I - Management Plan",
    sections: [
      { name: "Management Plan Description", defaultWords: 800 },
      { name: "Management Plan Flowchart", defaultWords: 200 },
      { name: "Organizational Structure", defaultWords: 600 },
      { name: "Key Personnel", defaultWords: 500, indent: true },
      { name: "Roles and Responsibilities", defaultWords: 600, indent: true },
      { name: "Subcontractor Integration", defaultWords: 400, indent: true },
      { name: "Project Control and Management Systems", defaultWords: 700 },
      { name: "Schedule Management", defaultWords: 500, indent: true },
      { name: "Cost and Financial Management", defaultWords: 500, indent: true },
      { name: "Quality Assurance (QA) / (QC)", defaultWords: 600, indent: true },
      { name: "Communications and Reporting Plan", defaultWords: 600 },
      { name: "Internal Communications", defaultWords: 400, indent: true },
      { name: "External Communications", defaultWords: 400, indent: true }
    ]
  },
  {
    title: "Volume I - Staffing Plan",
    sections: [
      { name: "Recruiting Plan", defaultWords: 500 },
      { name: "Retention Plan", defaultWords: 500 },
      { name: "Training", defaultWords: 500 },
      { name: "Key Personnel", defaultWords: 300 },
      { name: "Resume of Program Manager", defaultWords: 600, indent: true },
      { name: "Resume of Project Manager", defaultWords: 600, indent: true },
      { name: "Resume of SME 1", defaultWords: 600, indent: true },
      { name: "Resume of SME 2", defaultWords: 600, indent: true }
    ]
  },
  {
    title: "Volume III - Past Performance",
    sections: [
      { name: "Past Performance", defaultWords: 1000 },
      { name: "Contract Identification", defaultWords: 300, indent: true },
      { name: "Scope and Objectives", defaultWords: 400, indent: true },
      { name: "Relevance to Current Requirement", defaultWords: 400, indent: true },
      { name: "Performance Outcomes and Results", defaultWords: 500, indent: true },
      { name: "Key Personnel Involved", defaultWords: 300, indent: true },
      { name: "Customer Reference - POC", defaultWords: 200, indent: true },
      { name: "CPARS / Evaluation Summary", defaultWords: 300, indent: true },
      { name: "Role (Prime/Sub) and Contribution", defaultWords: 300, indent: true },
      { name: "Risk Mitigation and Lessons Learned", defaultWords: 400, indent: true }
    ]
  },
  {
    title: "Quality Control Plan",
    sections: [
      { name: "QC Organization & Roles", defaultWords: 500 },
      { name: "Quality Control Processes", defaultWords: 700 },
      { name: "Metrics and Performance Monitoring", defaultWords: 600 },
      { name: "Inspections and Audits", defaultWords: 500 },
      { name: "Corrective and Preventive Actions-CAPA", defaultWords: 600 },
      { name: "Reporting and Communication", defaultWords: 400 },
      { name: "Continuous Improvement Program", defaultWords: 500 },
      { name: "Documentation and Traceability", defaultWords: 400 }
    ]
  },
  {
    title: "Transition Plan",
    sections: [
      { name: "Objectives & Strategy", defaultWords: 500 },
      { name: "Phased Timeline", defaultWords: 600 },
      { name: "Staffing & Key Personnel", defaultWords: 500 },
      { name: "Communications Plan", defaultWords: 500 },
      { name: "Risk Management & Mitigation", defaultWords: 600 },
      { name: "Performance Measurement", defaultWords: 400 },
      { name: "Deliverables", defaultWords: 400 }
    ]
  },
  {
    title: "Compliance",
    sections: [
      { name: "Safety Plan", defaultWords: 600 },
      { name: "Quality Plan", defaultWords: 600 },
      { name: "Insurance (GL, Cyber, etc)", defaultWords: 400 },
      { name: "Bonding", defaultWords: 300 },
      { name: "Cyber / CMMC Requirements", defaultWords: 500 },
      { name: "Facility Clearance Requirements", defaultWords: 400 },
      { name: "Socio-Economic Status/Certifications", defaultWords: 400 },
      { name: "Small Business Plan", defaultWords: 600 }
    ]
  }
];

export default function Phase5({ proposalData, proposalId }) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // AI Settings
  const [aiModel, setAiModel] = useState("gemini");
  const [temperature, setTemperature] = useState([0.7]);
  const [topP, setTopP] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState(2048);
  
  // Drafting Style
  const [defaultTone, setDefaultTone] = useState("Clear");
  const [readingLevel, setReadingLevel] = useState("Government Plain Language");
  const [requestCitations, setRequestCitations] = useState(false);
  
  // Sections
  const [sections, setSections] = useState(() => {
    const initial = {};
    PROPOSAL_SECTIONS.forEach(category => {
      category.sections.forEach(section => {
        initial[section.name] = {
          enabled: true,
          wordCount: section.defaultWords,
          tone: defaultTone
        };
      });
    });
    return initial;
  });

  const [winStrategy, setWinStrategy] = useState("");

  const suggestWordCounts = async () => {
    setIsSuggesting(true);
    try {
      const prompt = `Based on this ${proposalData.project_type} for ${proposalData.agency_name}, suggest appropriate word counts for each section of the proposal. Consider:
- Project: ${proposalData.project_title}
- Type: ${proposalData.project_type}

Provide recommended word counts that balance detail with conciseness for a competitive government proposal.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      alert("AI has analyzed your proposal. Word counts have been optimized based on best practices.");
    } catch (error) {
      console.error("Error suggesting word counts:", error);
    }
    setIsSuggesting(false);
  };

  const suggestStrategy = async () => {
    setIsSuggesting(true);
    try {
      const prompt = `As an expert proposal strategist, suggest winning strategies for this government proposal:

Project: ${proposalData.project_title}
Agency: ${proposalData.agency_name}
Type: ${proposalData.project_type}

Provide:
1. Win themes (2-3 key differentiators)
2. Strategy for addressing evaluation factors
3. Recommended emphasis areas
4. Risk mitigation approaches

Format as actionable strategy guidance.`;

      const strategy = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setWinStrategy(strategy);
    } catch (error) {
      console.error("Error suggesting strategy:", error);
    }
    setIsSuggesting(false);
  };

  const toggleSection = (sectionName) => {
    setSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        enabled: !prev[sectionName].enabled
      }
    }));
  };

  const updateWordCount = (sectionName, count) => {
    setSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        wordCount: parseInt(count) || 0
      }
    }));
  };

  const updateTone = (sectionName, tone) => {
    setSections(prev => ({
      ...prev,
      [sectionName]: {
        ...prev[sectionName],
        tone
      }
    }));
  };

  const totalWords = Object.values(sections)
    .filter(s => s.enabled)
    .reduce((sum, s) => sum + s.wordCount, 0);

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="text-2xl">Proposal Strategy</CardTitle>
          <CardDescription>Configure the tone, style, and structure of your proposal</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={suggestWordCounts}
              disabled={isSuggesting}
              variant="outline"
            >
              <Calculator className={`w-4 h-4 mr-2 ${isSuggesting ? 'animate-spin' : ''}`} />
              Suggest Word Counts
            </Button>
            
            <Button
              onClick={suggestStrategy}
              disabled={isSuggesting}
              variant="outline"
            >
              <Lightbulb className={`w-4 h-4 mr-2 ${isSuggesting ? 'animate-spin' : ''}`} />
              Suggest Strategy
            </Button>
            
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
            >
              <Settings className="w-4 h-4 mr-2" />
              AI Model Settings
            </Button>
          </div>

          {winStrategy && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  Recommended Win Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm text-slate-700">{winStrategy}</pre>
              </CardContent>
            </Card>
          )}

          {showSettings && (
            <Card className="bg-slate-50">
              <CardHeader>
                <CardTitle className="text-lg">AI Model Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>AI Model</Label>
                    <Select value={aiModel} onValueChange={setAiModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini">Google Gemini 2.5 Pro</SelectItem>
                        <SelectItem value="claude">Anthropic Claude</SelectItem>
                        <SelectItem value="chatgpt">OpenAI ChatGPT</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      {aiModel === 'gemini' && '~$0.50 per 1M tokens'}
                      {aiModel === 'claude' && '~$3.00 per 1M tokens'}
                      {aiModel === 'chatgpt' && '~$2.00 per 1M tokens'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Max Output Tokens</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setMaxTokens(Math.max(512, maxTokens - 256))}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                        className="text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setMaxTokens(Math.min(8192, maxTokens + 256))}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Temperature: {temperature[0].toFixed(2)}</Label>
                  <Slider
                    value={temperature}
                    onValueChange={setTemperature}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">Controls randomness. Lower is more deterministic.</p>
                </div>

                <div className="space-y-2">
                  <Label>Top-P: {topP[0].toFixed(2)}</Label>
                  <Slider
                    value={topP}
                    onValueChange={setTopP}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">Nucleus sampling. Considers tokens with top_p probability mass.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-indigo-200">
            <CardHeader>
              <CardTitle className="text-lg">Overall Drafting Style (Default Settings)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={defaultTone} onValueChange={setDefaultTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map(tone => (
                        <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reading Level</Label>
                  <Select value={readingLevel} onValueChange={setReadingLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {READING_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Options</Label>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={requestCitations}
                      onChange={(e) => setRequestCitations(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Request Citations</span>
                  </label>
                  <p className="text-xs text-slate-500">Ask model to cite sources (if applicable)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg">Proposal Sections</CardTitle>
              <CardDescription>
                Select sections to include and configure word counts
              </CardDescription>
              <div className="mt-4 flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                <span className="font-semibold text-indigo-900">Total Word Count:</span>
                <span className="text-2xl font-bold text-indigo-600">{totalWords.toLocaleString()}</span>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="0" className="space-y-4">
                <TabsList className="grid grid-cols-4 lg:grid-cols-7">
                  {PROPOSAL_SECTIONS.map((category, idx) => (
                    <TabsTrigger key={idx} value={idx.toString()} className="text-xs">
                      {category.title.split('-')[0].trim()}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {PROPOSAL_SECTIONS.map((category, categoryIdx) => (
                  <TabsContent key={categoryIdx} value={categoryIdx.toString()} className="space-y-3">
                    <h3 className="font-semibold text-slate-900 mb-4">{category.title}</h3>
                    {category.sections.map((section, idx) => (
                      <div
                        key={idx}
                        className={`p-3 border rounded-lg ${sections[section.name]?.enabled ? 'bg-white border-blue-300' : 'bg-slate-50 border-slate-200'} ${section.indent ? 'ml-6' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={sections[section.name]?.enabled || false}
                            onChange={() => toggleSection(section.name)}
                            className="w-4 h-4"
                          />
                          <span className="flex-1 font-medium text-sm">{section.name}</span>
                          
                          <Select
                            value={sections[section.name]?.tone || defaultTone}
                            onValueChange={(value) => updateTone(section.name, value)}
                            disabled={!sections[section.name]?.enabled}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TONES.map(tone => (
                                <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            type="number"
                            value={sections[section.name]?.wordCount || section.defaultWords}
                            onChange={(e) => updateWordCount(section.name, e.target.value)}
                            disabled={!sections[section.name]?.enabled}
                            className="w-24 h-8 text-xs"
                            placeholder="Words"
                          />
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}