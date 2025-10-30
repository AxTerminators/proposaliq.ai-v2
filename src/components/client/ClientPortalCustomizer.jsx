import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Image as ImageIcon,
  Type,
  Eye,
  Save,
  Upload,
  Sparkles,
  CheckCircle2,
  Mail,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientPortalCustomizer({ client, onUpdate }) {
  const queryClient = useQueryClient();
  const [customBranding, setCustomBranding] = useState(client?.custom_branding || {
    logo_url: "",
    primary_color: "#2563eb",
    company_name: "",
    welcome_message: "",
    custom_css: ""
  });

  const [emailPreferences, setEmailPreferences] = useState(client?.email_notifications || {
    enabled: true,
    proposal_shared: true,
    status_changes: true,
    new_comments: true,
    documents_uploaded: true,
    deadline_reminders: true
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const updateClientMutation = useMutation({
    mutationFn: async (updates) => {
      return await base44.entities.Client.update(client.id, updates);
    },
    onSuccess: (updatedClient) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      if (onUpdate) onUpdate(updatedClient);
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCustomBranding({ ...customBranding, logo_url: file_url });
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveBranding = async () => {
    await updateClientMutation.mutateAsync({
      custom_branding: customBranding
    });
  };

  const handleSaveEmailPreferences = async () => {
    await updateClientMutation.mutateAsync({
      email_notifications: emailPreferences
    });
  };

  const sampleColors = [
    { name: "Blue", value: "#2563eb" },
    { name: "Purple", value: "#7c3aed" },
    { name: "Green", value: "#10b981" },
    { name: "Red", value: "#ef4444" },
    { name: "Orange", value: "#f97316" },
    { name: "Pink", value: "#ec4899" },
    { name: "Indigo", value: "#4f46e5" },
    { name: "Teal", value: "#14b8a6" }
  ];

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Client Portal Customization
            </CardTitle>
            <CardDescription>
              Customize the portal experience for {client.contact_name || client.client_name}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? "Edit Mode" : "Preview"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {previewMode ? (
          <PortalPreview branding={customBranding} client={client} />
        ) : (
          <Tabs defaultValue="branding" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="branding">
                <Sparkles className="w-4 h-4 mr-2" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="content">
                <Type className="w-4 h-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-6 mt-6">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  {customBranding.logo_url && (
                    <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-slate-50 p-4">
                      <img
                        src={customBranding.logo_url}
                        alt="Company Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      asChild
                      variant="outline"
                      disabled={uploadingLogo}
                    >
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        {uploadingLogo ? (
                          <>Uploading...</>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            {customBranding.logo_url ? "Change Logo" : "Upload Logo"}
                          </>
                        )}
                      </label>
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">
                      Recommended: PNG or SVG, max 500KB
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary Color */}
              <div className="space-y-3">
                <Label>Primary Brand Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={customBranding.primary_color}
                    onChange={(e) => setCustomBranding({ ...customBranding, primary_color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customBranding.primary_color}
                    onChange={(e) => setCustomBranding({ ...customBranding, primary_color: e.target.value })}
                    placeholder="#2563eb"
                    className="flex-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sampleColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setCustomBranding({ ...customBranding, primary_color: color.value })}
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 transition-all hover:scale-110",
                        customBranding.primary_color === color.value ? "border-slate-900 ring-2 ring-slate-900" : "border-slate-200"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Company Name */}
              <div className="space-y-3">
                <Label>Company Name (Portal Display)</Label>
                <Input
                  value={customBranding.company_name}
                  onChange={(e) => setCustomBranding({ ...customBranding, company_name: e.target.value })}
                  placeholder={client.client_organization || "Your Company Name"}
                />
                <p className="text-xs text-slate-500">
                  Defaults to client organization name if empty
                </p>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveBranding}
                disabled={updateClientMutation.isPending}
                className="w-full"
              >
                {updateClientMutation.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Branding Settings
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-6 mt-6">
              {/* Welcome Message */}
              <div className="space-y-3">
                <Label>Welcome Message</Label>
                <Textarea
                  value={customBranding.welcome_message}
                  onChange={(e) => setCustomBranding({ ...customBranding, welcome_message: e.target.value })}
                  placeholder="Welcome! We're excited to work with you on these proposals..."
                  rows={4}
                />
                <p className="text-xs text-slate-500">
                  This message appears at the top of the client portal
                </p>
              </div>

              {/* Custom CSS */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  Custom CSS
                  <Badge variant="secondary" className="text-xs">Advanced</Badge>
                </Label>
                <Textarea
                  value={customBranding.custom_css}
                  onChange={(e) => setCustomBranding({ ...customBranding, custom_css: e.target.value })}
                  placeholder=".client-portal { background: linear-gradient(...); }"
                  rows={6}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-slate-500">
                  Advanced: Add custom CSS to style the portal
                </p>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveBranding}
                disabled={updateClientMutation.isPending}
                className="w-full"
              >
                {updateClientMutation.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Content Settings
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="font-medium text-slate-900">Email Notifications</p>
                      <p className="text-xs text-slate-600">Send emails for important updates</p>
                    </div>
                  </div>
                  <Switch
                    checked={emailPreferences.enabled}
                    onCheckedChange={(checked) => setEmailPreferences({ ...emailPreferences, enabled: checked })}
                  />
                </div>

                {emailPreferences.enabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Proposal Shared</p>
                        <p className="text-xs text-slate-600">When a new proposal is shared</p>
                      </div>
                      <Switch
                        checked={emailPreferences.proposal_shared}
                        onCheckedChange={(checked) => setEmailPreferences({ ...emailPreferences, proposal_shared: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Status Changes</p>
                        <p className="text-xs text-slate-600">When proposal status updates</p>
                      </div>
                      <Switch
                        checked={emailPreferences.status_changes}
                        onCheckedChange={(checked) => setEmailPreferences({ ...emailPreferences, status_changes: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">New Comments</p>
                        <p className="text-xs text-slate-600">When consultant replies to feedback</p>
                      </div>
                      <Switch
                        checked={emailPreferences.new_comments}
                        onCheckedChange={(checked) => setEmailPreferences({ ...emailPreferences, new_comments: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Documents Uploaded</p>
                        <p className="text-xs text-slate-600">When new documents are shared</p>
                      </div>
                      <Switch
                        checked={emailPreferences.documents_uploaded}
                        onCheckedChange={(checked) => setEmailPreferences({ ...emailPreferences, documents_uploaded: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Deadline Reminders</p>
                        <p className="text-xs text-slate-600">Reminders for upcoming deadlines</p>
                      </div>
                      <Switch
                        checked={emailPreferences.deadline_reminders}
                        onCheckedChange={(checked) => setEmailPreferences({ ...emailPreferences, deadline_reminders: checked })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveEmailPreferences}
                disabled={updateClientMutation.isPending}
                className="w-full"
              >
                {updateClientMutation.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Notification Settings
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// Portal Preview Component
function PortalPreview({ branding, client }) {
  const primaryColor = branding.primary_color || "#2563eb";

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header Preview */}
        <div
          className="p-6"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
          }}
        >
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-2xl font-bold">
                Welcome, {client.contact_name || client.client_name}
              </h2>
              <p className="text-sm opacity-90 mt-1">
                {branding.company_name || client.client_organization}
              </p>
            </div>
            {branding.logo_url && (
              <img
                src={branding.logo_url}
                alt="Logo"
                className="h-12 object-contain bg-white/10 backdrop-blur rounded px-2"
              />
            )}
          </div>
          {branding.welcome_message && (
            <div className="mt-4 p-3 bg-white/20 backdrop-blur rounded text-sm">
              {branding.welcome_message}
            </div>
          )}
        </div>

        {/* Content Preview */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Proposals", value: "5", icon: "📄" },
              { label: "Needs Review", value: "2", icon: "👁️" },
              { label: "Accepted", value: "3", icon: "✅" }
            ].map((stat, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-lg text-center">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold" style={{ color: primaryColor }}>
                  {stat.value}
                </div>
                <div className="text-xs text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full" style={{ backgroundColor: primaryColor }} />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded text-white text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                View Details
              </button>
              <button className="px-4 py-2 rounded bg-slate-100 text-sm">
                Download
              </button>
            </div>
          </div>
        </div>

        {/* Custom CSS Note */}
        {branding.custom_css && (
          <div className="p-4 bg-amber-50 border-t border-amber-200">
            <p className="text-xs text-amber-800">
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              Custom CSS will be applied to the live portal
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-sm text-slate-600 mt-4">
        Preview of how the portal will look with these settings
      </p>
    </div>
  );
}