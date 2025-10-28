
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
  Loader2
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Chat() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [organization, setOrganization] = useState(null);
  const messagesEndRef = useRef(null);

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

  const { data: chatHistory, isLoading } = useQuery({
    queryKey: ['chat-messages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 50),
    initialData: [],
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
      const prompt = `You are a helpful AI assistant for ProposalIQ.ai, a proposal writing platform. 
The user's organization is: ${organization?.organization_name || 'Not specified'}

User question: ${userMessage}

Provide a helpful, detailed response. You can assist with:
- Proposal writing tips and best practices
- Federal acquisition regulations (FAR)
- Understanding RFPs, RFQs, and other solicitation types
- Business development strategies
- Grant writing
- And general questions about the platform

Be professional, concise, and actionable.`;

      const subs = await base44.entities.Subscription.filter({ organization_id: organization?.id }, '-created_date', 1);
      const preferredLLM = subs.length > 0 ? subs[0].preferred_llm : 'gemini';

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      await trackTokenUsage(3000, prompt, aiResponse, preferredLLM);

      return await base44.entities.ChatMessage.create({
        organization_id: organization?.id,
        message: userMessage,
        response: aiResponse
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

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="p-6 border-b bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">AI Assistant</h1>
              <p className="text-sm text-slate-600">Ask questions about proposals, FAR, or anything else</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {chatHistory.length === 0 && !isLoading && (
            <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Welcome to AI Chat</h3>
                <p className="text-slate-600 mb-6">I'm here to help with proposal writing, FAR regulations, and more</p>
                <div className="grid md:grid-cols-3 gap-3 text-left">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex-col items-start"
                    onClick={() => setMessage("What are the key components of a winning proposal?")}
                  >
                    <span className="font-semibold mb-1">Proposal Tips</span>
                    <span className="text-xs text-slate-500">Get writing advice</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex-col items-start"
                    onClick={() => setMessage("Explain FAR Part 15 about contracting by negotiation")}
                  >
                    <span className="font-semibold mb-1">FAR Questions</span>
                    <span className="text-xs text-slate-500">Understand regulations</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex-col items-start"
                    onClick={() => setMessage("What's the difference between RFP and RFQ?")}
                  >
                    <span className="font-semibold mb-1">Solicitation Types</span>
                    <span className="text-xs text-slate-500">Learn the basics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {chatHistory.slice().reverse().map((chat, idx) => (
            <div key={chat.id || idx} className="space-y-4">
              <div className="flex gap-3 justify-end">
                <Card className="max-w-2xl bg-blue-600 text-white border-none shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <p className="flex-1">{chat.message}</p>
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
              placeholder="Ask me anything about proposals, FAR, or your projects..."
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
        </div>
      </div>
    </div>
  );
}
