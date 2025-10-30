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
  Zap
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
import moment from "moment";

export default function OnboardingEmailModule() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Onboarding Email Management</h2>
          <p className="text-slate-600">Manage sequential email onboarding for new users</p>
        </div>
        <Button onClick={handleBulkSendWelcomeEmails} disabled={sendingEmail} className="bg-blue-600 hover:bg-blue-700">
          <Zap className="w-4 h-4 mr-2" />
          {sendingEmail ? "Sending..." : "Bulk Send Welcome Emails"}
        </Button>
      </div>

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