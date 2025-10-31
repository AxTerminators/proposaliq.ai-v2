import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain,
  Send,
  Loader2,
  Sparkles,
  Lightbulb,
  Target,
  CheckCircle2,
  FileText,
  Zap,
  X,
  Minimize2,
  Maximize2,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';

export default function ProposalAssistant({ proposal, currentPhase, onClose, isMinimized, onToggleMinimize }) {
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadContextualSuggestions();
  }, [currentPhase, proposal]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadContextualSuggestions = () => {
    const phaseSuggestions = {
      phase1: [
        { icon: Target, text: "Help me choose between prime or sub role", action: "prime_or_sub" },
        { icon: Lightbulb, text: "Suggest teaming partners for this opportunity", action: "teaming_partners" },
        { icon: FileText, text: "What should I know about this agency?", action: "agency_info" }
      ],
      phase2: [
        { icon: FileText, text: "Analyze my solicitation documents", action: "analyze_docs" },
        { icon: CheckCircle2, text: "Extract key requirements", action: "extract_requirements" },
        { icon: Target, text: "What are the evaluation criteria?", action: "evaluation_criteria" }
      ],
      phase3: [
        { icon: Sparkles, text: "Generate a project summary", action: "project_summary" },
        { icon: CheckCircle2, text: "Check for compliance gaps", action: "compliance_check" },
        { icon: Target, text: "Identify hidden requirements", action: "hidden_requirements" }
      ],
      phase4: [
        { icon: Brain, text: "Evaluate our win probability", action: "win_probability" },
        { icon: Target, text: "Analyze competitive position", action: "competitive_analysis" },
        { icon: Lightbulb, text: "What are our strengths?", action: "identify_strengths" }
      ],
      phase5: [
        { icon: Zap, text: "Generate win themes", action: "generate_win_themes" },
        { icon: Sparkles, text: "Create a strategy summary", action: "strategy_summary" },
        { icon: Target, text: "How do we ghost competitors?", action: "ghosting_strategy" }
      ],
      phase6: [
        { icon: FileText, text: "Generate section content", action: "generate_section" },
        { icon: CheckCircle2, text: "Review section for compliance", action: "review_section" },
        { icon: Sparkles, text: "Improve writing quality", action: "improve_writing" }
      ],
      phase7: [
        { icon: CheckCircle2, text: "Check submission readiness", action: "submission_readiness" },
        { icon: Target, text: "Final compliance review", action: "final_compliance" },
        { icon: Lightbulb, text: "What am I missing?", action: "final_checklist" }
      ]
    };

    setSuggestions(phaseSuggestions[currentPhase] || []);
  };

  const handleSuggestionClick = async (suggestion) => {
    const questionMap = {
      prime_or_sub: "Should I pursue this as a prime contractor or subcontractor? What are the pros and cons?",
      teaming_partners: "What types of teaming partners should I look for in this opportunity?",
      agency_info: `Tell me about ${proposal?.agency_name || 'this agency'} and what they typically look for in proposals.`,
      analyze_docs: "Analyze my solicitation documents and tell me the key points I need to focus on.",
      extract_requirements: "Extract all the key requirements from the solicitation documents.",
      evaluation_criteria: "What are the evaluation criteria and how should I address them?",
      project_summary: "Generate a comprehensive project summary based on the solicitation.",
      compliance_check: "Check for any compliance gaps in my current proposal approach.",
      hidden_requirements: "Are there any hidden or implied requirements I should be aware of?",
      win_probability: "Based on the information provided, what is our estimated win probability?",
      competitive_analysis: "Analyze our competitive position for this opportunity.",
      identify_strengths: "What are our key strengths for this opportunity?",
      generate_win_themes: "Generate 3-5 compelling win themes for this proposal.",
      strategy_summary: "Create a high-level strategy summary for this proposal.",
      ghosting_strategy: "How can we position ourselves to ghost competitors?",
      generate_section: "Help me generate content for the current section.",
      review_section: "Review this section for compliance and quality.",
      improve_writing: "How can I improve the writing quality of this section?",
      submission_readiness: "Is my proposal ready for submission? What's missing?",
      final_compliance: "Perform a final compliance check before submission.",
      final_checklist: "What am I missing before final submission?"
    };

    const question = questionMap[suggestion.action];
    if (question) {
      await handleSendMessage(question);
    }
  };

  const handleSendMessage = async (messageText = message) => {
    if (!messageText.trim()) return;

    const userMessage = { role: "user", content: messageText };
    setConversation(prev => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      // Gather context
      const context = await gatherProposalContext();

      const prompt = `You are a proposal writing expert assistant helping with a government proposal.

**Current Context:**
- Phase: ${currentPhase}
- Proposal: ${proposal?.proposal_name || 'New Proposal'}
- Agency: ${proposal?.agency_name || 'Not specified'}
- Due Date: ${proposal?.due_date || 'Not set'}
- Status: ${proposal?.status || 'draft'}

**Proposal Data:**
${context}

**User Question:**
${messageText}

**Instructions:**
1. Be concise and actionable
2. Provide specific recommendations
3. Reference proposal data when relevant
4. Use bullet points for clarity
5. If you don't have enough information, ask clarifying questions

Provide your response:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const assistantMessage = { role: "assistant", content: response };
      setConversation(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = { 
        role: "assistant", 
        content: "I encountered an error. Please try again or rephrase your question." 
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const gatherProposalContext = async () => {
    try {
      if (!proposal?.id) return "No proposal context available yet.";

      const [sections, complianceReqs, winThemes, resources] = await Promise.all([
        base44.entities.ProposalSection.filter({ proposal_id: proposal.id }),
        base44.entities.ComplianceRequirement.filter({ proposal_id: proposal.id }),
        base44.entities.WinTheme.filter({ proposal_id: proposal.id }),
        base44.entities.ProposalResource.filter({ organization_id: proposal.organization_id })
      ]);

      let contextString = "";

      if (sections.length > 0) {
        contextString += `\n**Sections (${sections.length}):**\n`;
        sections.slice(0, 5).forEach(s => {
          contextString += `- ${s.section_name} (${s.status || 'draft'})\n`;
        });
      }

      if (complianceReqs.length > 0) {
        contextString += `\n**Compliance Requirements (${complianceReqs.length}):**\n`;
        const compliant = complianceReqs.filter(r => r.compliance_status === 'compliant').length;
        contextString += `- ${compliant} compliant, ${complianceReqs.length - compliant} pending\n`;
      }

      if (winThemes.length > 0) {
        contextString += `\n**Win Themes (${winThemes.length}):**\n`;
        winThemes.slice(0, 3).forEach(w => {
          contextString += `- ${w.theme_title}\n`;
        });
      }

      if (resources.length > 0) {
        contextString += `\n**Available Resources:** ${resources.length} documents\n`;
      }

      return contextString || "Proposal is in early stages.";

    } catch (error) {
      console.error("Error gathering context:", error);
      return "Unable to gather full proposal context.";
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggleMinimize}
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l shadow-2xl flex flex-col z-40">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Assistant</h3>
              <p className="text-xs text-white/80">Here to help with your proposal</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleMinimize}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Suggestions */}
      {suggestions.length > 0 && conversation.length === 0 && (
        <div className="p-4 border-b bg-slate-50">
          <p className="text-xs font-semibold text-slate-600 mb-3">Quick Actions</p>
          <div className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="w-full justify-start text-left h-auto py-2"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <suggestion.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-xs">{suggestion.text}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Hi! I'm your AI assistant</h4>
            <p className="text-sm text-slate-600 mb-4">
              I'm here to help you build a winning proposal. Try one of the quick actions above or ask me anything!
            </p>
          </div>
        )}

        {conversation.map((msg, idx) => (
          <div
            key={idx}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-indigo-600" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-900"
              )}
            >
              {msg.role === "assistant" ? (
                <ReactMarkdown className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="bg-slate-100 rounded-lg px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Input
            placeholder="Ask me anything..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
            disabled={loading}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={loading || !message.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}