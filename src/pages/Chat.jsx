import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hasPermission, logActivity } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Sparkles,
  Bot,
  User,
  Loader2,
  Lock
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Chat() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserData();
  }, []);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['chat-messages', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      
      if (currentUser) {
        await logActivity({
          user: currentUser,
          organizationId: currentOrgId,
          actionType: "view",
          resourceType: "chat",
          resourceId: "chat_page",
          resourceName: "AI Chat",
          details: "Viewed AI chat interface"
        });
      }
      
      return base44.entities.ChatMessage.filter(
        { organization_id: currentOrgId },
        '-created_date',
        50
      );
    },
    initialData: [],
    enabled: !!currentOrgId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage) => {
      if (!currentOrgId) {
        throw new Error("Organization not found");
      }

      if (!hasPermission(currentUser, 'can_access_ai_features')) {
        throw new Error("You don't have permission to use AI features");
      }

      const userMsg = await base44.entities.ChatMessage.create({
        organization_id: currentOrgId,
        user_email: currentUser?.email,
        role: "user",
        content: userMessage
      });

      const proposals = await base44.entities.Proposal.filter({
        organization_id: currentOrgId
      }, '-created_date', 5);
      
      const context = `User is working on these proposals: ${proposals.map(p => p.proposal_name).join(", ")}`;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant helping with government proposal writing. Here's context about the user's work:\n${context}\n\nUser question: ${userMessage}\n\nProvide a helpful, detailed response.`,
      });

      const botMsg = await base44.entities.ChatMessage.create({
        organization_id: currentOrgId,
        user_email: currentUser?.email,
        role: "assistant",
        content: response
      });

      const tokensUsed = (userMessage.length + response.length) * 2;
      
      try {
        await base44.entities.TokenUsage.create({
          organization_id: currentOrgId,
          user_email: currentUser?.email,
          feature_type: "chat",
          tokens_used: tokensUsed,
          llm_provider: "gemini",
          prompt: userMessage?.substring(0, 500),
          response_preview: response?.substring(0, 200),
          cost_estimate: (tokensUsed / 1000000) * 0.5
        });

        const subs = await base44.entities.Subscription.filter({ organization_id: currentOrgId }, '-created_date', 1);
        if (subs.length > 0) {
          await base44.entities.Subscription.update(subs[0].id, {
            token_credits_used: (subs[0].token_credits_used || 0) + tokensUsed
          });
        }
      } catch (error) {
        console.error("Error tracking token usage:", error);
      }

      await logActivity({
        user: currentUser,
        organizationId: currentOrgId,
        actionType: "create",
        resourceType: "chat",
        resourceId: botMsg.id,
        resourceName: "Chat Message",
        details: `Sent chat message: ${userMessage.substring(0, 50)}...`
      });

      return { userMsg, botMsg };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      setMessage("");
    },
    onError: (error) => {
      alert(error.message || "Error sending message");
    }
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sortedMessages = [...messages].reverse();
  const hasAIAccess = currentUser && hasPermission(currentUser, 'can_access_ai_features');

  return (
    <div className="p-6 lg:p-8 h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Assistant</h1>
        <p className="text-slate-600">Get help with your proposals</p>
      </div>

      {!hasAIAccess && (
        <Alert className="border-amber-300 bg-amber-50 mb-4">
          <Lock className="w-4 h-4" />
          <AlertDescription>
            Your role ({currentUser?.user_role || 'viewer'}) does not allow AI chat access. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-none shadow-xl flex-1 flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 text-lg mb-2">No messages yet</p>
                <p className="text-slate-500">Start a conversation with the AI assistant</p>
              </div>
            ) : (
              sortedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-2xl rounded-2xl p-4 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <ReactMarkdown className="prose prose-sm max-w-none">
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                placeholder={hasAIAccess ? "Ask me anything about proposals..." : "AI chat access not available for your role"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 resize-none"
                rows={3}
                disabled={sendMessageMutation.isPending || !hasAIAccess}
              />
              <Button
                onClick={handleSend}
                disabled={sendMessageMutation.isPending || !message.trim() || !hasAIAccess}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : hasAIAccess ? (
                  <Send className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}