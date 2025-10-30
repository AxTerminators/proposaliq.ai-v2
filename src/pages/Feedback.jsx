import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageSquare, 
  Bug, 
  Lightbulb, 
  HelpCircle,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Feedback() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  const [formData, setFormData] = useState({
    issue_type: "bug",
    priority: "medium",
    title: "",
    description: "",
    steps_to_reproduce: "",
    expected_behavior: "",
    actual_behavior: "",
    screenshot_url: "",
    browser_info: "",
    page_url: ""
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }

        // Auto-capture browser and page info
        const browserInfo = `${navigator.userAgent}`;
        const pageUrl = window.location.href;

        setFormData(prev => ({
          ...prev,
          browser_info: browserInfo,
          page_url: pageUrl
        }));
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      const feedback = await base44.entities.Feedback.create({
        ...data,
        organization_id: organization?.id || "unknown",
        reporter_email: user.email,
        reporter_name: user.full_name,
        status: "new"
      });

      // Send email notification to admin
      await base44.integrations.Core.SendEmail({
        from_name: "ProposalIQ.ai Feedback System",
        to: user.email, // In production, this should be your support email
        subject: `[${data.issue_type.toUpperCase()}] ${data.title}`,
        body: `
New feedback submitted from ProposalIQ.ai:

Type: ${data.issue_type}
Priority: ${data.priority}
Title: ${data.title}

Description:
${data.description}

${data.steps_to_reproduce ? `Steps to Reproduce:\n${data.steps_to_reproduce}\n\n` : ''}
${data.expected_behavior ? `Expected Behavior:\n${data.expected_behavior}\n\n` : ''}
${data.actual_behavior ? `Actual Behavior:\n${data.actual_behavior}\n\n` : ''}

Reported by: ${user.full_name} (${user.email})
Organization: ${organization?.organization_name || 'N/A'}
Page URL: ${data.page_url}
Browser: ${data.browser_info}
${data.screenshot_url ? `Screenshot: ${data.screenshot_url}` : ''}

Feedback ID: ${feedback.id}
        `
      });

      return feedback;
    },
    onSuccess: () => {
      setSubmitSuccess(true);
      setFormData({
        issue_type: "bug",
        priority: "medium",
        title: "",
        description: "",
        steps_to_reproduce: "",
        expected_behavior: "",
        actual_behavior: "",
        screenshot_url: "",
        browser_info: formData.browser_info,
        page_url: formData.page_url
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

    setIsSubmitting(true);
    try {
      await submitFeedbackMutation.mutateAsync(formData);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Error submitting feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const issueTypes = [
    { value: "bug", label: "Bug Report", icon: Bug, color: "red" },
    { value: "feature_request", label: "Feature Request", icon: Lightbulb, color: "blue" },
    { value: "question", label: "Question", icon: HelpCircle, color: "purple" },
    { value: "improvement", label: "Improvement", icon: MessageSquare, color: "green" },
    { value: "other", label: "Other", icon: MessageSquare, color: "slate" }
  ];

  const selectedIssueType = issueTypes.find(t => t.value === formData.issue_type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            Feedback & Bug Reports
          </h1>
          <p className="text-slate-600">
            Help us improve ProposalIQ.ai by reporting bugs, requesting features, or asking questions
          </p>
        </div>

        {submitSuccess && (
          <Alert className="bg-green-50 border-green-200 mb-6">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription>
              <p className="font-semibold text-green-900 mb-1">✓ Feedback Submitted Successfully!</p>
              <p className="text-sm text-green-800">
                Thank you for your feedback. Our team will review it and get back to you if needed.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-xl">
          <CardHeader className="border-b">
            <CardTitle>Submit Feedback</CardTitle>
            <CardDescription>
              Please provide as much detail as possible to help us address your feedback
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
                        <span className="text-sm text-slate-600">Minor issue, cosmetic</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700">Medium</Badge>
                        <span className="text-sm text-slate-600">Affects some functionality</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">High</Badge>
                        <span className="text-sm text-slate-600">Blocking work significantly</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-red-50 text-red-700">Critical</Badge>
                        <span className="text-sm text-slate-600">App is broken/unusable</span>
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
                  placeholder="Brief summary of the issue or request"
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
                  placeholder="Provide detailed information about the issue or your request"
                  rows={5}
                  required
                />
              </div>

              {/* Bug-specific fields */}
              {formData.issue_type === "bug" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="steps">Steps to Reproduce</Label>
                    <Textarea
                      id="steps"
                      value={formData.steps_to_reproduce}
                      onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
                      placeholder="1. Go to...\n2. Click on...\n3. See error..."
                      rows={4}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expected">Expected Behavior</Label>
                      <Textarea
                        id="expected"
                        value={formData.expected_behavior}
                        onChange={(e) => setFormData({ ...formData, expected_behavior: e.target.value })}
                        placeholder="What should have happened?"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="actual">Actual Behavior</Label>
                      <Textarea
                        id="actual"
                        value={formData.actual_behavior}
                        onChange={(e) => setFormData({ ...formData, actual_behavior: e.target.value })}
                        placeholder="What actually happened?"
                        rows={3}
                      />
                    </div>
                  </div>
                </>
              )}

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
                        disabled={uploadingScreenshot}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        asChild
                        disabled={uploadingScreenshot}
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

              {/* System Information (Read-only) */}
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription>
                  <p className="font-semibold text-blue-900 mb-2">System Information (Auto-captured)</p>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p><strong>Page URL:</strong> {formData.page_url}</p>
                    <p><strong>Browser:</strong> {formData.browser_info.substring(0, 100)}...</p>
                    <p><strong>User:</strong> {user?.full_name} ({user?.email})</p>
                    <p><strong>Organization:</strong> {organization?.organization_name || 'N/A'}</p>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.title || !formData.description}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
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

        {/* Additional Help */}
        <Alert className="mt-6">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <p className="font-semibold text-slate-900 mb-1">Need Urgent Help?</p>
            <p className="text-sm text-slate-700">
              For critical issues or urgent support, please contact us directly at{" "}
              <a href="mailto:support@proposaliq.ai" className="text-blue-600 hover:underline">
                support@proposaliq.ai
              </a>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}