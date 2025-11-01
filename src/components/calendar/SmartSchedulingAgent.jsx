import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot, Send, Loader2, CheckCircle, Sparkles, Calendar, Users, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export default function SmartSchedulingAgent({ organization, user, trigger }) {
  const [showDialog, setShowDialog] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize conversation when dialog opens
  useEffect(() => {
    if (showDialog && !conversationId) {
      initConversation();
    }
  }, [showDialog]);

  const initConversation = async () => {
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: "calendar_scheduling_agent",
        metadata: {
          name: "Smart Scheduling Session",
          organization_id: organization.id,
          user_email: user.email
        }
      });
      
      setConversationId(conversation.id);
      setMessages(conversation.messages || []);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      
      // Check if agent is done processing
      const lastMessage = data.messages[data.messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        setIsProcessing(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!input.trim() || !conversationId || isProcessing) return;

    const userMessage = input;
    setInput("");
    setIsProcessing(true);

    try {
      const conversation = await base44.agents.getConversation(conversationId);
      
      await base44.agents.addMessage(conversation, {
        role: "user",
        content: userMessage
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const examplePrompts = [
    "Schedule a 1-hour strategy session for our NASA proposal next week, avoiding Monday mornings",
    "Book the War Room for Thursday afternoon and invite the core team",
    "Find the best time this week for a review meeting with Sarah and Mike",
    "Reschedule all my Friday meetings to next week due to an emergency",
    "Block 2 hours of focus time every morning next week"
  ];

  return (
    <>
      {trigger ? (
        React.cloneElement(trigger, {
          onClick: () => setShowDialog(true)
        })
      ) : (
        <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
          <Bot className="w-4 h-4 mr-2" />
          AI Scheduling Agent
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setConversationId(null);
          setMessages([]);
          setInput("");
        }
      }}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600" />
              AI Scheduling Agent
              <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                Beta
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {messages.length === 0 && (
            <div className="space-y-4">
              <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-none">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Bot className="w-8 h-8 text-indigo-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-2">Welcome to your AI Scheduling Agent!</h4>
                      <p className="text-sm text-slate-700 mb-3">
                        I can autonomously manage your calendar with natural language. Just tell me what you need, and I'll handle the details.
                      </p>
                      <div className="text-xs text-slate-600">
                        <strong>I can:</strong> Schedule meetings • Check availability • Book resources • Coordinate teams • Optimize schedules • Handle recurring events
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h5 className="text-sm font-semibold text-slate-700 mb-2">Try these examples:</h5>
                <div className="space-y-2">
                  {examplePrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-indigo-50"
                      onClick={() => {
                        setInput(prompt);
                        setTimeout(() => handleSendMessage(), 100);
                      }}
                    >
                      <span className="text-sm text-slate-700">{prompt}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.map((message, index) => (
                <div key={index} className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}>
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[80%] rounded-lg px-4 py-3",
                    message.role === 'user' 
                      ? "bg-indigo-600 text-white" 
                      : "bg-slate-100 text-slate-900"
                  )}>
                    {message.role === 'user' ? (
                      <p className="text-sm">{message.content}</p>
                    ) : (
                      <ReactMarkdown className="text-sm prose prose-sm max-w-none">
                        {message.content}
                      </ReactMarkdown>
                    )}
                    
                    {message.tool_calls?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.tool_calls.map((toolCall, idx) => (
                          <div key={idx} className="text-xs bg-white rounded p-2 border">
                            <div className="flex items-center gap-2 mb-1">
                              {toolCall.name?.includes('CalendarEvent') && <Calendar className="w-3 h-3 text-blue-600" />}
                              {toolCall.name?.includes('Resource') && <Package className="w-3 h-3 text-cyan-600" />}
                              {toolCall.name?.includes('User') && <Users className="w-3 h-3 text-purple-600" />}
                              <span className="font-semibold text-slate-700">
                                {toolCall.name?.split('.').pop() || 'Action'}
                              </span>
                              {toolCall.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-600" />}
                            </div>
                            {toolCall.results && (
                              <div className="text-slate-600 mt-1">
                                {typeof toolCall.results === 'string' 
                                  ? toolCall.results.slice(0, 100)
                                  : JSON.stringify(toolCall.results).slice(0, 100)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                  <div className="bg-slate-100 rounded-lg px-4 py-3">
                    <p className="text-sm text-slate-600">Thinking...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className="border-t pt-4 mt-4">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your scheduling request... (e.g., 'Schedule a team meeting for next Tuesday at 2 PM')"
                className="flex-1 min-h-[60px] resize-none"
                disabled={isProcessing}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isProcessing}
                className="bg-gradient-to-r from-indigo-600 to-purple-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}