import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Sparkles,
  Bot,
  User,
  Loader2,
  FileText,
  Target,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Zap
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Chat() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [organization, setOrganization] = useState(null);
  const [currentProposal, setCurrentProposal] = useState(null);
  const [proposalContext, setProposalContext] = useState(null);
  const messagesEndRef = useRef(null);

  // Check if we were navigated here with a proposalId (from URL params)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const proposalId = urlParams.get('proposalId');
    const contextData = urlParams.get('context');
    
    if (proposalId) {
      loadProposalContext(proposalId);
    }
    
    if (contextData) {
      try {
        setProposalContext(JSON.parse(decodeURIComponent(contextData)));
      } catch (e) {
        console.error("Error parsing context:", e);
      }
    }
  }, []);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) setOrganization(orgs[0]);
      } catch (error) {
        console.error("Error loading org:", error);
      }
    };
    loadOrg();
  }, []);

  const loadProposalContext = async (proposalId) => {
    try {
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      if (proposals.length > 0) {
        const proposal = proposals[0];
        setCurrentProposal(proposal);
        
        // Load additional context
        const [sections, requirements, winThemes] = await Promise.all([
          base44.entities.ProposalSection.filter({ proposal_id: proposalId }),
          base44.entities.ComplianceRequirement.filter({ proposal_id: proposalId }),
          base44.entities.WinTheme.filter({ proposal_id: proposalId })
        ]);
        
        setProposalContext({
          proposal,
          sectionsCount: sections.length,
          requirementsCount: requirements.length,
          winThemesCount: winThemes.length,
          requirements: requirements.slice(0, 10), // Top 10 for context
          winThemes: winThemes.slice(0, 5)
        });
      }
    } catch (error) {
      console.error("Error loading proposal context:", error);
    }
  };

  const { data: chatHistory, isLoading } = useQuery({
    queryKey: ['chat-messages', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ChatMessage.filter(
        { organization_id: organization.id },
        '-created_date',
        50
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const trackTokenUsage = async (tokensUsed, prompt, response, llm) => {
    try {
      const user = await base44.auth.me();
      
      if (organization) {
        await base44.entities.TokenUsage.create({
          organization_id: organization.id,
          user_email: user.email,
          feature_type: "chat",
          tokens_used: tokensUsed,
          llm_provider: llm,
          prompt: prompt?.substring(0, 500),
          response_preview: response?.substring(0, 200),
          cost_estimate: (tokensUsed / 1000000) * 0.5
        });

        const subs = await base44.entities.Subscription.filter({ organization_id: organization.id }, '-created_date', 1);
        if (subs.length > 0) {
          await base44.entities.Subscription.update(subs[0].id, {
            token_credits_used: (subs[0].token_credits_used || 0) + tokensUsed
          });
        }
      }
    } catch (error) {
      console.error("Error tracking token usage:", error);
    }
  };

  const sendMutation = useMutation({
    mutationFn: async (userMessage) => {
      let contextualPrompt = `You are an expert AI assistant for ProposalIQ.ai, a comprehensive proposal writing platform. You help users with:

1. **Proposal Best Practices** - Writing tips, strategy, compliance, win themes
2. **Platform Navigation** - Finding features, understanding tools
3. **Context-Aware Suggestions** - Based on their current proposal work
4. **Document Summarization** - Simplifying complex solicitation sections
5. **FAR/DFARS Guidance** - Federal acquisition regulations

**Platform Features You Can Help With:**
- Dashboard: Overview of all proposals and pipeline
- Proposals: Create and manage proposals (Kanban, List, Table views)
- ProposalBuilder: 7-phase workflow (Prime Selection → Solicitation → Strategy → Evaluation → Writing → Finalization)
- Past Performance: Add projects, AI extraction from documents, narrative generation, smart recommendations
- Teaming Partners: Manage partners, upload capability statements with AI extraction
- Resources: Store capability statements, boilerplate text, templates
- Pricing: Labor rates, CLIN builder, price-to-win analysis
- Tasks: Task management with Kanban board
- Team: Invite users, assign roles
- Calendar: Track deadlines and milestones
- AI Chat: This assistant (that's you!)
- Discussions: Team collaboration forums
- Export Center: Export proposals in various formats
- Analytics: Win rate, revenue, performance metrics

**User's Organization:** ${organization?.organization_name || 'Not specified'}
`;

      // Add proposal-specific context if available
      if (currentProposal && proposalContext) {
        contextualPrompt += `

**CURRENT PROPOSAL CONTEXT:**
You are currently helping with the proposal: "${currentProposal.proposal_name}"

**Proposal Details:**
- Agency: ${currentProposal.agency_name}
- Project: ${currentProposal.project_title || 'Not specified'}
- Solicitation: ${currentProposal.solicitation_number || 'Not specified'}
- Type: ${currentProposal.project_type}
- Status: ${currentProposal.status}
- Due Date: ${currentProposal.due_date || 'Not specified'}
- Current Phase: ${currentProposal.current_phase || 'Not started'}

**Context Loaded:**
- Proposal Sections: ${proposalContext.sectionsCount}
- Compliance Requirements: ${proposalContext.requirementsCount}
- Win Themes: ${proposalContext.winThemesCount}

${proposalContext.requirements?.length > 0 ? `
**Key Requirements:**
${proposalContext.requirements.slice(0, 5).map(r => `- ${r.requirement_title} (${r.requirement_category})`).join('\n')}
` : ''}

${proposalContext.winThemes?.length > 0 ? `
**Active Win Themes:**
${proposalContext.winThemes.map(wt => `- ${wt.theme_title}: ${wt.theme_statement}`).join('\n')}
` : ''}

**With this context, provide highly specific, actionable advice for THIS proposal.**
`;
      }

      contextualPrompt += `

**User Question:** ${userMessage}

**Instructions:**
- If asked about navigation/features, provide clear step-by-step guidance with page names
- If asked to summarize, be concise but thorough
- If given proposal context, provide specific suggestions (e.g., "For your DHS Cloud Migration proposal, I recommend highlighting past performance in...")
- If asked about best practices, be detailed and actionable
- Use markdown formatting for clarity
- Be conversational and helpful
- If you can suggest using a specific ProposalIQ feature to solve their problem, do so

Provide a helpful, detailed response:`;

      const subs = await base44.entities.Subscription.filter({ organization_id: organization?.id }, '-created_date', 1);
      const preferredLLM = subs.length > 0 ? subs[0].preferred_llm : 'gemini';

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: contextualPrompt,
        add_context_from_internet: false
      });

      await trackTokenUsage(3000, contextualPrompt, aiResponse, preferredLLM);

      return await base44.entities.ChatMessage.create({
        organization_id: organization?.id,
        message: userMessage,
        response: aiResponse,
        context_files: proposalContext ? [currentProposal.id] : []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      setMessage("");
      scrollToBottom();
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (question) => {
    setMessage(question);
    sendMutation.mutate(question);
  };

  const quickQuestions = currentProposal ? [
    {
      icon: Target,
      label: "Recommend Past Performance",
      question: `Based on my current proposal "${currentProposal.proposal_name}" for ${currentProposal.agency_name}, what past performance examples should I include and why?`
    },
    {
      icon: Lightbulb,
      label: "Win Theme Suggestions",
      question: `Suggest 3-5 powerful win themes for my ${currentProposal.project_type} proposal to ${currentProposal.agency_name}. Project: ${currentProposal.project_title}`
    },
    {
      icon: FileText,
      label: "Section Outline",
      question: `Create a detailed outline for the Technical Approach section of my ${currentProposal.project_type} proposal. Include key points to address.`
    },
    {
      icon: Zap,
      label: "Compliance Checklist",
      question: `What are the most critical compliance items I should verify before submitting this proposal?`
    }
  ] : [
    {
      icon: BookOpen,
      label: "Proposal Best Practices",
      question: "What are the top 5 best practices for writing winning government proposals?"
    },
    {
      icon: HelpCircle,
      label: "How to Start",
      question: "I'm new to ProposalIQ.ai. Walk me through how to create my first proposal step-by-step."
    },
    {
      icon: Target,
      label: "Win Theme Strategy",
      question: "Explain what win themes are and how to develop them effectively for a proposal."
    },
    {
      icon: FileText,
      label: "FAR Guidance",
      question: "What are the most important FAR clauses I should be aware of when responding to federal RFPs?"
    }
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="p-6 border-b bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">AI Proposal Assistant</h1>
                <p className="text-sm text-slate-600">
                  {currentProposal 
                    ? `Helping with: ${currentProposal.proposal_name}`
                    : "Ask me about proposals, platform features, or best practices"
                  }
                </p>
              </div>
            </div>
            {currentProposal && (
              <Badge className="bg-green-100 text-green-700">
                <Target className="w-3 h-3 mr-1" />
                Context-Aware
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {chatHistory.length === 0 && !isLoading && (
            <>
              <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Welcome to Your AI Proposal Assistant</h3>
                  <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                    I'm here to help with proposal writing, platform navigation, compliance, strategy, and more. 
                    {currentProposal && " I can see you're working on a proposal, so I can give you specific advice!"}
                  </p>
                  
                  <Tabs defaultValue="questions" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                      <TabsTrigger value="questions">Quick Questions</TabsTrigger>
                      <TabsTrigger value="capabilities">What I Can Do</TabsTrigger>
                    </TabsList>

                    <TabsContent value="questions" className="space-y-3">
                      <div className="grid md:grid-cols-2 gap-3">
                        {quickQuestions.map((q, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-start text-left hover:bg-indigo-50 hover:border-indigo-300"
                            onClick={() => handleQuickQuestion(q.question)}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <q.icon className="w-4 h-4 text-indigo-600" />
                              <span className="font-semibold text-sm">{q.label}</span>
                            </div>
                            <span className="text-xs text-slate-500 line-clamp-2">{q.question}</span>
                          </Button>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="capabilities" className="space-y-3">
                      <div className="grid md:grid-cols-2 gap-4 text-left">
                        <Alert className="bg-white">
                          <Lightbulb className="w-4 h-4 text-amber-600" />
                          <AlertDescription>
                            <p className="font-semibold text-slate-900 mb-1">Proposal Best Practices</p>
                            <p className="text-xs text-slate-600">
                              Get expert advice on writing, strategy, compliance, win themes, and more
                            </p>
                          </AlertDescription>
                        </Alert>

                        <Alert className="bg-white">
                          <HelpCircle className="w-4 h-4 text-blue-600" />
                          <AlertDescription>
                            <p className="font-semibold text-slate-900 mb-1">Platform Navigation</p>
                            <p className="text-xs text-slate-600">
                              Find features, understand tools, and learn how to use the platform effectively
                            </p>
                          </AlertDescription>
                        </Alert>

                        <Alert className="bg-white">
                          <Target className="w-4 h-4 text-green-600" />
                          <AlertDescription>
                            <p className="font-semibold text-slate-900 mb-1">Context-Aware Suggestions</p>
                            <p className="text-xs text-slate-600">
                              Get specific recommendations based on your current proposal and requirements
                            </p>
                          </AlertDescription>
                        </Alert>

                        <Alert className="bg-white">
                          <FileText className="w-4 h-4 text-purple-600" />
                          <AlertDescription>
                            <p className="font-semibold text-slate-900 mb-1">Document Summarization</p>
                            <p className="text-xs text-slate-600">
                              Paste complex text and I'll summarize it or explain key points
                            </p>
                          </AlertDescription>
                        </Alert>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {currentProposal && (
                <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                  <Target className="w-4 h-4 text-green-600" />
                  <AlertDescription>
                    <p className="font-semibold text-green-900 mb-1">I can see your proposal context!</p>
                    <p className="text-sm text-green-800">
                      I have access to "{currentProposal.proposal_name}" details, so I can provide specific, actionable advice 
                      for your {currentProposal.agency_name} proposal. Just ask!
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {chatHistory.slice().reverse().map((chat, idx) => (
            <div key={chat.id || idx} className="space-y-4">
              <div className="flex gap-3 justify-end">
                <Card className="max-w-2xl bg-blue-600 text-white border-none shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <p className="flex-1 whitespace-pre-wrap">{chat.message}</p>
                      <User className="w-5 h-5 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <Card className="max-w-3xl flex-1 border-none shadow-md">
                  <CardContent className="p-4">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{chat.response}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}

          {sendMutation.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
              <Card className="max-w-3xl flex-1 border-none shadow-md">
                <CardContent className="p-4">
                  <p className="text-slate-500">Thinking...</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t bg-white p-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={currentProposal 
                ? `Ask me anything about "${currentProposal.proposal_name}" or proposal best practices...`
                : "Ask me anything about proposals, platform features, or best practices..."
              }
              className="min-h-[60px] resize-none"
              disabled={sendMutation.isPending}
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-6"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            💡 Tip: You can paste solicitation sections, ask for navigation help, or request proposal-specific advice
          </p>
        </div>
      </div>
    </div>
  );
}