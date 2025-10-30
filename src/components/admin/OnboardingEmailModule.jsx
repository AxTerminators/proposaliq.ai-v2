import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Mail,
  Search,
  Send,
  Eye,
  Edit,
  Clock,
  CheckCircle2,
  Users,
  Zap,
  Bot,
  Play,
  AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import moment from "moment";

export default function OnboardingEmailModule() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState(null);

  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      return base44.entities.EmailTemplate.filter(
        { template_type: 'onboarding' },
        'sequence_order'
      );
    },
    initialData: [],
  });

  const { data: allUsers } = useQuery({
    queryKey: ['all-users-onboarding'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: []
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ userId, templateId }) => {
      const user = allUsers.find(u => u.id === userId);
      const template = emailTemplates.find(t => t.id === templateId);
      
      if (!user || !template) {
        throw new Error("User or template not found");
      }

      // Get organization info if available
      const orgs = await base44.entities.Organization.filter(
        { created_by: user.email },
        '-created_date',
        1
      );
      const organization = orgs.length > 0 ? orgs[0] : null;

      // Replace variables in email body and subject
      let emailBody = template.body;
      let emailSubject = template.subject;
      
      emailBody = emailBody.replace(/\{\{user_name\}\}/g, user.full_name || 'there');
      emailBody = emailBody.replace(/\{\{organization_name\}\}/g, organization?.organization_name || 'your organization');
      
      emailSubject = emailSubject.replace(/\{\{user_name\}\}/g, user.full_name || 'there');
      
      // Send email
      await base44.integrations.Core.SendEmail({
        from_name: template.from_name || "ProposalIQ.ai Team",
        to: user.email,
        subject: emailSubject,
        body: emailBody
      });

      // Update user's onboarding progress
      await base44.entities.User.update(user.id, {
        onboarding_email_step: template.sequence_order,
        last_onboarding_email_date: new Date().toISOString(),
        onboarding_completed: template.sequence_order >= 3
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-onboarding'] });
      alert("Email sent successfully!");
    },
  });

  const runAutomatedSequence = async () => {
    if (!confirm("Run the automated onboarding email sequence? This will send emails to all users who are due for their next onboarding email.")) {
      return;
    }

    setAgentRunning(true);
    setAgentResult(null);

    try {
      const now = new Date();
      let step1Count = 0;
      let step2Count = 0;
      let step3Count = 0;
      const errors = [];

      // Step 1: Welcome emails (users at step 0)
      const step1Users = allUsers.filter(u => !u.onboarding_email_step || u.onboarding_email_step === 0);
      const welcomeTemplate = emailTemplates.find(t => t.sequence_order === 1);
      
      if (welcomeTemplate) {
        for (const user of step1Users) {
          try {
            await sendEmailMutation.mutateAsync({ 
              userId: user.id, 
              templateId: welcomeTemplate.id 
            });
            step1Count++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
          } catch (error) {
            errors.push(`${user.email}: ${error.message}`);
          }
        }
      }

      // Step 2: Getting Started (users at step 1, created 3+ days ago)
      const step2Template = emailTemplates.find(t => t.sequence_order === 2);
      if (step2Template) {
        const step2Users = allUsers.filter(u => {
          if (u.onboarding_email_step !== 1) return false;
          const daysSinceSignup = Math.floor((now - new Date(u.created_date)) / (1000 * 60 * 60 * 24));
          return daysSinceSignup >= 3;
        });

        for (const user of step2Users) {
          try {
            await sendEmailMutation.mutateAsync({ 
              userId: user.id, 
              templateId: step2Template.id 
            });
            step2Count++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            errors.push(`${user.email}: ${error.message}`);
          }
        }
      }

      // Step 3: Explore Features (users at step 2, created 7+ days ago)
      const step3Template = emailTemplates.find(t => t.sequence_order === 3);
      if (step3Template) {
        const step3Users = allUsers.filter(u => {
          if (u.onboarding_email_step !== 2) return false;
          const daysSinceSignup = Math.floor((now - new Date(u.created_date)) / (1000 * 60 * 60 * 24));
          return daysSinceSignup >= 7;
        });

        for (const user of step3Users) {
          try {
            await sendEmailMutation.mutateAsync({ 
              userId: user.id, 
              templateId: step3Template.id 
            });
            step3Count++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            errors.push(`${user.email}: ${error.message}`);
          }
        }
      }

      setAgentResult({
        success: true,
        step1Count,
        step2Count,
        step3Count,
        totalSent: step1Count + step2Count + step3Count,
        errors
      });

      queryClient.invalidateQueries({ queryKey: ['all-users-onboarding'] });
    } catch (error) {
      console.error("Error running automated sequence:", error);
      setAgentResult({
        success: false,
        error: error.message
      });
    } finally {
      setAgentRunning(false);
    }
  };

  const handleViewTemplate = (template) => {
    setSelectedTemplate(template);
    setShowTemplateDialog(true);
  };

  const handleSendEmail = async (userId, templateId) => {
    if (confirm("Send this onboarding email now?")) {
      setSendingEmail(true);
      try {
        await sendEmailMutation.mutateAsync({ userId, templateId });
      } catch (error) {
        console.error("Error sending email:", error);
        alert("Error sending email. Please try again.");
      } finally {
        setSendingEmail(false);
      }
    }
  };

  const handleBulkSendWelcomeEmails = async () => {
    if (!confirm("Send welcome emails to all users who haven't received one yet?")) return;

    setSendingEmail(true);
    const welcomeTemplate = emailTemplates.find(t => t.sequence_order === 1);
    if (!welcomeTemplate) {
      alert("Welcome email template not found!");
      setSendingEmail(false);
      return;
    }

    const usersNeedingWelcome = allUsers.filter(u => !u.onboarding_email_step || u.onboarding_email_step === 0);
    
    for (const user of usersNeedingWelcome) {
      try {
        await sendEmailMutation.mutateAsync({ 
          userId: user.id, 
          templateId: welcomeTemplate.id 
        });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
      } catch (error) {
        console.error(`Error sending to ${user.email}:`, error);
      }
    }

    setSendingEmail(false);
    alert(`Sent welcome emails to ${usersNeedingWelcome.length} users!`);
  };

  const filteredUsers = allUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalUsers: allUsers.length,
    step0: allUsers.filter(u => !u.onboarding_email_step || u.onboarding_email_step === 0).length,
    step1: allUsers.filter(u => u.onboarding_email_step === 1).length,
    step2: allUsers.filter(u => u.onboarding_email_step === 2).length,
    step3: allUsers.filter(u => u.onboarding_email_step === 3).length,
    completed: allUsers.filter(u => u.onboarding_completed).length,
  };

  // Calculate users due for emails
  const now = new Date();
  const dueForStep2 = allUsers.filter(u => {
    if (u.onboarding_email_step !== 1) return false;
    const daysSinceSignup = Math.floor((now - new Date(u.created_date)) / (1000 * 60 * 60 * 24));
    return daysSinceSignup >= 3;
  }).length;

  const dueForStep3 = allUsers.filter(u => {
    if (u.onboarding_email_step !== 2) return false;
    const daysSinceSignup = Math.floor((now - new Date(u.created_date)) / (1000 * 60 * 60 * 24));
    return daysSinceSignup >= 7;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Onboarding Email Management</h2>
          <p className="text-slate-600">Automated sequential email onboarding for new users</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runAutomatedSequence} 
            disabled={agentRunning || sendingEmail}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {agentRunning ? (
              <>
                <Bot className="w-4 h-4 mr-2 animate-pulse" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Automated Sequence
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Agent Result Alert */}
      {agentResult && (
        <Alert className={agentResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
          {agentResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <AlertDescription>
            {agentResult.success ? (
              <div>
                <p className="font-semibold text-green-900 mb-1">Automated Sequence Complete!</p>
                <p className="text-sm text-green-800">
                  Sent {agentResult.totalSent} emails: {agentResult.step1Count} welcome, {agentResult.step2Count} getting started, {agentResult.step3Count} explore features
                </p>
                {agentResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm cursor-pointer">View {agentResult.errors.length} errors</summary>
                    <ul className="text-xs mt-1 space-y-1">
                      {agentResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ) : (
              <div>
                <p className="font-semibold text-red-900 mb-1">Error Running Sequence</p>
                <p className="text-sm text-red-800">{agentResult.error}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Due for Emails Alert */}
      {(stats.step0 > 0 || dueForStep2 > 0 || dueForStep3 > 0) && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription>
            <p className="font-semibold text-blue-900 mb-1">Users Due for Emails</p>
            <p className="text-sm text-blue-800">
              {stats.step0} need welcome email • {dueForStep2} ready for getting started • {dueForStep3} ready for explore features
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="w-8 h-8 text-slate-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-xs text-slate-600">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="w-8 h-8 text-amber-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.step0}</p>
                <p className="text-xs text-slate-600">Not Started</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Mail className="w-8 h-8 text-blue-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.step1}</p>
                <p className="text-xs text-slate-600">Step 1 (Welcome)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Mail className="w-8 h-8 text-indigo-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.step2}</p>
                <p className="text-xs text-slate-600">Step 2 (Guide)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-slate-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">User Progress</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="automation">Automation Info</TabsTrigger>
        </TabsList>

        {/* User Progress Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="p-4 border rounded-lg hover:border-blue-300 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">{user.full_name}</h4>
                          <Badge className={
                            user.onboarding_completed ? "bg-green-100 text-green-700" :
                            (user.onboarding_email_step || 0) === 0 ? "bg-amber-100 text-amber-700" :
                            "bg-blue-100 text-blue-700"
                          }>
                            {user.onboarding_completed ? "Completed" : `Step ${user.onboarding_email_step || 0}/3`}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{user.email}</p>
                        {user.last_onboarding_email_date && (
                          <p className="text-xs text-slate-500 mt-1">
                            Last email: {moment(user.last_onboarding_email_date).fromNow()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {emailTemplates.map((template) => {
                          const userStep = user.onboarding_email_step || 0;
                          const canSend = template.sequence_order === userStep + 1 || template.sequence_order <= userStep;
                          
                          return (
                            <Button
                              key={template.id}
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendEmail(user.id, template.id)}
                              disabled={sendingEmail || !canSend}
                              title={`Send: ${template.template_name}`}
                            >
                              <Send className="w-3 h-3 mr-1" />
                              {template.sequence_order}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid md:grid-cols-3 gap-6">
            {emailTemplates.map((template) => (
              <Card key={template.id} className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-blue-600 text-white">
                      Step {template.sequence_order}
                    </Badge>
                    <Badge variant="outline">
                      Day {template.delay_days}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{template.template_name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Subject:</p>
                      <p className="text-sm font-medium text-slate-900">{template.subject}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTemplate(template)}
                        className="flex-1"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Automation Info Tab */}
        <TabsContent value="automation">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-600" />
                Email Automation System
              </CardTitle>
              <CardDescription>How the automated onboarding sequence works</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">📧 Email Sequence</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Badge className="bg-blue-600 text-white">1</Badge>
                    <div>
                      <p className="font-semibold text-slate-900">Welcome Email</p>
                      <p className="text-sm text-slate-600">Sent immediately to users who haven't received any emails yet</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                    <Badge className="bg-indigo-600 text-white">2</Badge>
                    <div>
                      <p className="font-semibold text-slate-900">Getting Started Guide</p>
                      <p className="text-sm text-slate-600">Sent 3 days after signup to users who completed Step 1</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <Badge className="bg-purple-600 text-white">3</Badge>
                    <div>
                      <p className="font-semibold text-slate-900">Explore Features</p>
                      <p className="text-sm text-slate-600">Sent 7 days after signup to users who completed Step 2</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">🤖 How to Use Automation</h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <p><strong>Manual Trigger:</strong> Click "Run Automated Sequence" to check all users and send emails to those who are due.</p>
                  <p><strong>Smart Detection:</strong> The system automatically calculates who needs emails based on signup date and current progress.</p>
                  <p><strong>Rate Limiting:</strong> Emails are sent with 1-second delays to prevent overwhelming the email service.</p>
                  <p><strong>Progress Tracking:</strong> Each user's progress is tracked in their profile.</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-900 mb-3">⚙️ For Full Automation</h3>
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <p className="text-sm">To enable <strong>fully automatic</strong> email sending (without manual triggers), contact Base44 support to set up a scheduled backend job that runs the onboarding agent daily.</p>
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex justify-center pt-4">
                <Button 
                  onClick={runAutomatedSequence}
                  disabled={agentRunning}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Run Sequence Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Preview Dialog */}
      {selectedTemplate && (
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTemplate.template_name}
                <Badge>Step {selectedTemplate.sequence_order}</Badge>
              </DialogTitle>
              <DialogDescription>
                Sent {selectedTemplate.delay_days} days after signup
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold mb-2">Subject:</p>
                <p className="text-sm bg-slate-50 p-3 rounded">{selectedTemplate.subject}</p>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Email Preview:</p>
                <div 
                  className="border rounded p-4 bg-white"
                  dangerouslySetInnerHTML={{ 
                    __html: selectedTemplate.body
                      .replace(/\{\{user_name\}\}/g, 'John Doe')
                      .replace(/\{\{organization_name\}\}/g, 'Acme Corporation')
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}