
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  Upload,
  CheckCircle2,
  Loader2,
  Send,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientFeedbackForm() {
  const [client, setClient] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false); // New state for super admin mode

  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('client');
  const proposalId = urlParams.get('proposal');
  const superadmin = urlParams.get('superadmin'); // Get superadmin flag from URL
  const pageUrl = urlParams.get('page_url') || window.document.referrer;

  const [formData, setFormData] = useState({
    issue_type: "question",
    priority: "medium",
    title: "",
    description: "",
    screenshot_url: "",
    browser_info: navigator.userAgent,
    page_url: pageUrl
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Super Admin bypass mode
        if (superadmin === 'true') {
          const currentUser = await base44.auth.me();
          if (currentUser && currentUser.role === 'admin' && currentUser.admin_role === 'super_admin') {
            setIsSuperAdminMode(true);

            // Fetch some default client/proposal for preview purposes if no specific ones are provided
            // For example, load the latest one created
            const allClients = await base44.entities.Client.list('-created_date', 1);
            if (allClients.length > 0) {
              setClient(allClients[0]);
            }

            const allProposals = await base44.entities.Proposal.list('-created_date', 1);
            if (allProposals.length > 0) {
              setProposal(allProposals[0]);
            }

            setLoading(false);
            return; // Exit loadData early as we're in superadmin mode
          }
        }

        // Normal flow
        // Get client
        const clients = await base44.entities.Client.filter({ id: clientId });
        if (clients.length > 0) {
          setClient(clients[0]);
        }

        // Get proposal if provided
        if (proposalId) {
          const proposals = await base44.entities.Proposal.filter({ id: proposalId });
          if (proposals.length > 0) {
            setProposal(proposals[0]);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    if (clientId || superadmin === 'true') { // Trigger loading if clientId is present OR superadmin mode is enabled
      loadData();
    } else {
      setLoading(false);
    }
  }, [clientId, proposalId, superadmin]); // Add superadmin to dependencies

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      const feedback = await base44.entities.Feedback.create({
        ...data,
        organization_id: client?.organization_id || "unknown",
        client_id: clientId,
        proposal_id: proposalId || null,
        reporter_email: client?.contact_email || "unknown",
        reporter_name: client?.contact_name || "Unknown Client",
        status: "new"
      });

      // Send email to admins
      const allUsers = await base44.entities.User.list();
      const adminUsers = allUsers.filter(u => u.admin_role && u.admin_role !== '');

      for (const admin of adminUsers) {
        try {
          await base44.integrations.Core.SendEmail({
            from_name: "ProposalIQ.ai Client Feedback",
            to: admin.email,
            subject: `[CLIENT FEEDBACK] ${data.title}`,
            body: `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">New Client Feedback</h1>
    </div>

    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 4px 12px; background: ${
          data.priority === 'critical' ? '#ef4444' :
          data.priority === 'high' ? '#f97316' :
          data.priority === 'medium' ? '#eab308' : '#3b82f6'
        }; color: white; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
          ${data.priority} Priority
        </span>
        <span style="display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #4f46e5; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 8px;">
          ${data.issue_type.replace('_', ' ')}
        </span>
      </div>

      <h2 style="color: #1f2937; font-size: 20px; margin: 20px 0 10px 0;">${data.title}</h2>

      <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #4b5563;"><strong>From Client:</strong> ${client?.contact_name || 'Unknown'} (${client?.contact_email || 'unknown'})</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563;"><strong>Organization:</strong> ${client?.client_organization || 'N/A'}</p>
        ${proposal ? `<p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563;"><strong>Related to:</strong> ${proposal.proposal_name}</p>` : ''}
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563;"><strong>Page:</strong> ${data.page_url}</p>
      </div>

      <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Feedback:</h3>
      <p style="margin: 0 0 20px 0; color: #4b5563;">${data.description}</p>

      ${data.screenshot_url ? `
        <h3 style="color: #1f2937; font-size: 16px; margin: 20px 0 10px 0;">Screenshot:</h3>
        <img src="${data.screenshot_url}" alt="Screenshot" style="max-width: 100%; border-radius: 8px; border: 1px solid #e5e7eb;">
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://app.proposaliq.ai/AdminPortal" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          View in Admin Portal →
        </a>
      </div>

      <p style="font-size: 12px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        Feedback ID: ${feedback.id}
      </p>
    </div>
  </div>
</body>
</html>
            `
          });
        } catch (emailError) {
          console.error(`Error sending email to ${admin.email}:`, emailError);
        }
      }

      return feedback;
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      setFormData({
        issue_type: "question",
        priority: "medium",
        title: "",
        description: "",
        screenshot_url: "",
        browser_info: navigator.userAgent,
        page_url: pageUrl
      });
      setScreenshotFile(null);
      setTimeout(() => setSubmitSuccess(false), 5000);
    },
  });

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingScreenshot(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, screenshot_url: file_url });
      setScreenshotFile(file);
    } catch (error) {
      console.error("Error uploading screenshot:", error);
      alert("Error uploading screenshot. Please try again.");
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      alert("Please fill in the title and description");
      return;
    }
    if (isSuperAdminMode) { // Prevent submission in super admin preview mode
        alert("Submissions are disabled in Super Admin Preview Mode.");
        return;
    }

    submitFeedbackMutation.mutate(formData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const issueTypes = [
    { value: "bug", label: "Bug Report", icon: Bug, color: "red" },
    { value: "feature_request", label: "Feature Request", icon: Lightbulb, color: "blue" },
    { value: "question", label: "Question", icon: HelpCircle, color: "purple" },
    { value: "improvement", label: "Improvement", icon: MessageSquare, color: "green" },
    { value: "other", label: "Other", icon: MessageSquare, color: "slate" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-6">
      {isSuperAdminMode && (
        <div className="max-w-4xl mx-auto mb-4">
          <div className="bg-purple-600 text-white px-4 py-2 rounded-lg text-center text-sm font-semibold">
            🔐 SUPER ADMIN MODE - Feedback Form Preview (submissions disabled in preview)
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to={createPageUrl("ClientPortal") + `?token=${urlParams.get('token') || client?.access_token}`}
            className="inline-flex items-center text-purple-600 hover:text-purple-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-purple-600" />
            Share Your Feedback
          </h1>
          <p className="text-slate-600">
            We value your input! Let us know about bugs, feature ideas, or any questions you have.
          </p>
          {proposal && (
            <Badge className="mt-2 bg-purple-100 text-purple-700">
              Regarding: {proposal.proposal_name}
            </Badge>
          )}
        </div>

        {submitSuccess && (
          <Card className="bg-green-50 border-green-200 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900 mb-1">✓ Feedback Submitted Successfully!</p>
                  <p className="text-sm text-green-800">
                    Thank you! We've received your feedback and will respond soon.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-xl">
          <CardHeader className="border-b">
            <CardTitle>Submit Feedback</CardTitle>
            <CardDescription>
              Help us improve by sharing your thoughts
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Issue Type Selection */}
              <div className="space-y-3">
                <Label>What type of feedback is this? *</Label>
                <div className="grid md:grid-cols-2 gap-3">
                  {issueTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.issue_type === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, issue_type: type.value })}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          isSelected
                            ? `border-${type.color}-500 bg-${type.color}-50`
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-6 h-6 ${isSelected ? `text-${type.color}-600` : 'text-slate-400'}`} />
                          <div>
                            <p className={`font-semibold ${isSelected ? `text-${type.color}-900` : 'text-slate-900'}`}>
                              {type.label}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">Low</Badge>
                        <span className="text-sm text-slate-600">Nice to have</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700">Medium</Badge>
                        <span className="text-sm text-slate-600">Would like addressed</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">High</Badge>
                        <span className="text-sm text-slate-600">Impacting my work</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-red-50 text-red-700">Critical</Badge>
                        <span className="text-sm text-slate-600">Blocking progress</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief summary of your feedback"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Please provide details about your feedback..."
                  rows={5}
                  required
                />
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label>Screenshot (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center bg-slate-50">
                  {screenshotFile ? (
                    <div className="space-y-3">
                      <img
                        src={formData.screenshot_url}
                        alt="Screenshot preview"
                        className="max-h-48 mx-auto rounded border"
                      />
                      <p className="text-sm font-medium text-slate-700">{screenshotFile.name}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setScreenshotFile(null);
                          setFormData({ ...formData, screenshot_url: "" });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                      <input
                        type="file"
                        id="screenshot-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleScreenshotUpload}
                        disabled={uploadingScreenshot || isSuperAdminMode} // Disable upload in super admin mode
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        asChild
                        disabled={uploadingScreenshot || isSuperAdminMode} // Disable upload in super admin mode
                      >
                        <label htmlFor="screenshot-upload" className="cursor-pointer">
                          {uploadingScreenshot ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Screenshot
                            </>
                          )}
                        </label>
                      </Button>
                      <p className="text-xs text-slate-500 mt-2">PNG, JPG, or GIF</p>
                    </>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={submitFeedbackMutation.isPending || !formData.title || !formData.description || isSuperAdminMode} // Disable if in super admin mode
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {submitFeedbackMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
