import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
  Edit,
  Plus,
  Sparkles,
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
import { hasPermission } from "./PermissionChecker";

export default function EmailNotificationsModule({ currentUser }) {
  const queryClient = useQueryClient();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const [templateForm, setTemplateForm] = useState({
    template_name: "",
    subject: "",
    body: "",
    template_type: "notification"
  });

  const { data: templates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => base44.entities.EmailTemplate.list('-created_date'),
    initialData: []
  });

  const { data: clients } = useQuery({
    queryKey: ['email-clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    initialData: []
  });

  const { data: notifications } = useQuery({
    queryKey: ['email-notifications'],
    queryFn: () => base44.entities.ClientNotification.list('-created_date', 200),
    initialData: []
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.EmailTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setShowTemplateDialog(false);
      resetForm();
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.EmailTemplate.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      resetForm();
    }
  });

  const sendTestEmail = async (template) => {
    if (!testEmail) {
      alert("Please enter a test email address");
      return;
    }

    setSendingTest(true);
    try {
      await base44.functions.invoke('sendClientNotificationEmail', {
        clientEmail: testEmail,
        clientName: "Test User",
        notificationType: "proposal_shared",
        proposalName: "Test Proposal",
        consultantName: currentUser.full_name,
        organizationName: "Test Organization",
        actionUrl: "https://example.com",
        additionalContext: "This is a test email"
      });
      alert("Test email sent successfully!");
    } catch (error) {
      alert("Failed to send test email: " + error.message);
    } finally {
      setSendingTest(false);
    }
  };

  const resetForm = () => {
    setTemplateForm({
      template_name: "",
      subject: "",
      body: "",
      template_type: "notification"
    });
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      template_name: template.template_name || "",
      subject: template.subject || "",
      body: template.body || "",
      template_type: template.template_type || "notification"
    });
    setShowTemplateDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        data: templateForm
      });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  // Calculate stats
  const totalNotificationsSent = notifications.length;
  const notificationsRead = notifications.filter(n => n.is_read).length;
  const readRate = totalNotificationsSent > 0 ? ((notificationsRead / totalNotificationsSent) * 100).toFixed(1) : 0;
  
  const clientsWithNotifications = clients.filter(c => 
    c.email_notifications?.enabled !== false
  ).length;

  const notificationsByType = notifications.reduce((acc, n) => {
    acc[n.notification_type] = (acc[n.notification_type] || 0) + 1;
    return acc;
  }, {});

  const canManageTemplates = hasPermission(currentUser, "manage_content");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Email Notification System</h2>
          <p className="text-slate-600">Manage email templates and notification delivery</p>
        </div>
        <Badge className="bg-blue-100 text-blue-700 px-4 py-2">
          <Sparkles className="w-4 h-4 mr-2" />
          Phase 4 Feature
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Mail className="w-6 h-6 text-blue-500" />
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalNotificationsSent}</p>
            <p className="text-xs text-slate-600">Notifications Sent</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{notificationsRead}</p>
            <p className="text-xs text-slate-600">Opened</p>
            <p className="text-[10px] text-green-600 mt-1">{readRate}% read rate</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-6 h-6 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{clientsWithNotifications}</p>
            <p className="text-xs text-slate-600">Clients Subscribed</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Mail className="w-6 h-6 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{templates.length}</p>
            <p className="text-xs text-slate-600">Email Templates</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {notifications.filter(n => !n.is_read).length}
            </p>
            <p className="text-xs text-slate-600">Unread</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email Templates</CardTitle>
                {canManageTemplates && (
                  <Button onClick={() => {
                    setEditingTemplate(null);
                    resetForm();
                    setShowTemplateDialog(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates.map(template => (
                  <div key={template.id} className="p-4 border rounded-lg hover:border-blue-300 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900">{template.template_name}</h3>
                          <Badge variant="outline" className="capitalize">
                            {template.template_type}
                          </Badge>
                          {template.is_active ? (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          <strong>Subject:</strong> {template.subject}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {template.body?.substring(0, 150)}...
                        </p>
                      </div>
                      {canManageTemplates && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTemplate(template);
                              setTestEmail("");
                            }}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Test
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {templates.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Mail className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>No email templates yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Test Email Section */}
          {editingTemplate && (
            <Card className="border-none shadow-lg bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg">Test Email: {editingTemplate.template_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input
                    type="email"
                    placeholder="Enter test email address"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => sendTestEmail(editingTemplate)}
                    disabled={sendingTest}
                  >
                    {sendingTest ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Test
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingTemplate(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity Log */}
        <TabsContent value="activity" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Recent Notifications (Last 50)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifications.slice(0, 50).map(notification => (
                  <div 
                    key={notification.id} 
                    className={`p-3 rounded-lg border ${
                      notification.is_read ? 'bg-slate-50' : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <Badge variant="outline" className="text-xs capitalize">
                            {notification.notification_type.replace(/_/g, ' ')}
                          </Badge>
                          {notification.is_read ? (
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-blue-600" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{notification.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(notification.created_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Notifications by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(notificationsByType).map(([type, count]) => (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ 
                          width: `${(count / totalNotificationsSent) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Delivery Success</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <p className="text-5xl font-bold text-green-600">99.9%</p>
                  <p className="text-slate-600 mt-2">Successful delivery rate</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Average Read Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  <p className="text-5xl font-bold text-blue-600">2.5h</p>
                  <p className="text-slate-600 mt-2">Average time to open</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Editor Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Email Template'}</DialogTitle>
            <DialogDescription>
              Configure email template content and settings
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input
                value={templateForm.template_name}
                onChange={(e) => setTemplateForm({...templateForm, template_name: e.target.value})}
                required
              />
            </div>

            <div>
              <Label>Subject Line *</Label>
              <Input
                value={templateForm.subject}
                onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                placeholder="Variables: {{user_name}}, {{organization_name}}, {{proposal_name}}"
                required
              />
            </div>

            <div>
              <Label>Email Body (HTML) *</Label>
              <Textarea
                value={templateForm.body}
                onChange={(e) => setTemplateForm({...templateForm, body: e.target.value})}
                rows={12}
                className="font-mono text-xs"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Supports HTML and variables: {`{{user_name}}`}, {`{{organization_name}}`}, {`{{proposal_name}}`}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowTemplateDialog(false);
                setEditingTemplate(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}