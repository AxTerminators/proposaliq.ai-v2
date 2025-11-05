
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Upload, Trash2, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import UniversalAlert from "../components/ui/UniversalAlert";

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function Chat() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [message, setMessage] = useState("");
  const [contextFiles, setContextFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  // Universal Alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "info",
    title: "",
    description: ""
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: chatHistory, isLoading } = useQuery({
    queryKey: ['chat-history', organization?.id, user?.email],
    queryFn: async () => {
      if (!organization?.id || !user?.email) return [];
      return base44.entities.ChatMessage.filter(
        { 
          organization_id: organization.id,
          user_email: user.email 
        },
        'created_date',
        50
      );
    },
    initialData: [],
    enabled: !!organization?.id && !!user?.email,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, contextFiles }) => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: message,
        file_urls: contextFiles.length > 0 ? contextFiles.map(f => f.url) : undefined
      });

      await base44.entities.ChatMessage.create({
        organization_id: organization.id,
        user_email: user.email,
        message: message,
        response: response,
        context_files: contextFiles.map(f => f.url)
      });

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
      setMessage("");
      setContextFiles([]);
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      setAlertConfig({
        type: "error",
        title: "Message Failed",
        description: "Unable to send message. Please try again."
      });
      setShowAlert(true);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setContextFiles([...contextFiles, { name: file.name, url: file_url }]);
    } catch (error) {
      console.error("Error uploading file:", error);
      setAlertConfig({
        type: "error",
        title: "Upload Failed",
        description: "Unable to upload file. Please try again."
      });
      setShowAlert(true);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSend = () => {
    if (message.trim() || contextFiles.length > 0) {
      sendMessageMutation.mutate({ message, contextFiles });
    }
  };

  if (!organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="p-6 border-b bg-white">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          AI Assistant
        </h1>
        <p className="text-slate-600 mt-1">Ask me anything about your proposals</p>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full p-6">
        <ScrollArea className="flex-1 mb-6">
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <Skeleton className="h-24 w-full mb-4" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Start a Conversation</h3>
                <p className="text-slate-600">
                  Ask me questions about proposals, strategies, or upload documents for analysis
                </p>
              </div>
            ) : (
              chatHistory.map((chat, idx) => (
                <div key={idx} className="space-y-4">
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 max-w-[80%]">
                      <p className="text-sm">{chat.message}</p>
                      {chat.context_files && chat.context_files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {chat.context_files.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs opacity-90">
                              <FileText className="w-3 h-3" />
                              <span>Attached file</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl px-4 py-3 max-w-[80%] shadow-md">
                      <ReactMarkdown className="text-sm prose prose-slate max-w-none">
                        {chat.response}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}

            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Card className="border-none shadow-xl">
          <CardContent className="p-4">
            {contextFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {contextFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-900">{file.name}</span>
                    <button
                      onClick={() => setContextFiles(contextFiles.filter((_, i) => i !== idx))}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                />
                <div className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <Upload className={`w-5 h-5 ${uploadingFile ? 'animate-pulse text-blue-600' : 'text-slate-600'}`} />
                </div>
              </label>

              <Textarea
                placeholder="Ask me anything..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={3}
                className="flex-1"
              />

              <Button
                onClick={handleSend}
                disabled={(!message.trim() && contextFiles.length === 0) || sendMessageMutation.isPending}
                className="self-end"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <UniversalAlert
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        type={alertConfig.type}
        title={alertConfig.title}
        description={alertConfig.description}
      />
    </div>
  );
}
