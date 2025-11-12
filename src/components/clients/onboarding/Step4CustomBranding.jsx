import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Palette, Upload, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function Step4CustomBranding({ formData, setFormData, onNext, onBack }) {
  const [isUploading, setIsUploading] = React.useState(false);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setFormData({
        ...formData,
        custom_branding: {
          ...formData.custom_branding,
          logo_url: file_url
        }
      });

      toast.success('Logo uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload logo: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Palette className="w-6 h-6 text-pink-600" />
          Custom Branding (Optional)
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Personalize the client's portal experience
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Client Logo</Label>
          <div className="mt-2 space-y-3">
            {formData.custom_branding?.logo_url && (
              <div className="p-4 bg-slate-50 rounded-lg border flex items-center gap-3">
                <img
                  src={formData.custom_branding.logo_url}
                  alt="Logo preview"
                  className="h-16 w-auto object-contain"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({
                    ...formData,
                    custom_branding: {
                      ...formData.custom_branding,
                      logo_url: ''
                    }
                  })}
                >
                  Remove
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isUploading}
                className="flex-1"
              />
              {isUploading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </div>
          </div>
        </div>

        <div>
          <Label>Primary Brand Color</Label>
          <div className="flex gap-2 mt-2">
            <Input
              type="color"
              value={formData.custom_branding?.primary_color || "#3B82F6"}
              onChange={(e) => setFormData({
                ...formData,
                custom_branding: {
                  ...formData.custom_branding,
                  primary_color: e.target.value
                }
              })}
              className="w-20"
            />
            <Input
              value={formData.custom_branding?.primary_color || "#3B82F6"}
              onChange={(e) => setFormData({
                ...formData,
                custom_branding: {
                  ...formData.custom_branding,
                  primary_color: e.target.value
                }
              })}
              placeholder="#3B82F6"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            This color will be used for accents in the client portal
          </p>
        </div>

        <div>
          <Label>Welcome Message</Label>
          <Textarea
            value={formData.custom_branding?.welcome_message || ""}
            onChange={(e) => setFormData({
              ...formData,
              custom_branding: {
                ...formData.custom_branding,
                welcome_message: e.target.value
              }
            })}
            placeholder="Welcome to your secure proposal workspace. We're excited to collaborate with you..."
            rows={4}
          />
          <p className="text-xs text-slate-500 mt-1">
            Personalized greeting shown when client accesses their portal
          </p>
        </div>

        {/* Preview */}
        <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border-2 border-blue-200">
          <p className="text-sm font-semibold text-slate-700 mb-3">Portal Preview:</p>
          <div
            className="bg-white rounded-lg shadow-lg p-6"
            style={{
              borderTop: `4px solid ${formData.custom_branding?.primary_color || '#3B82F6'}`
            }}
          >
            {formData.custom_branding?.logo_url && (
              <img
                src={formData.custom_branding.logo_url}
                alt="Logo"
                className="h-12 mb-4"
              />
            )}
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Welcome to {formData.organization_name || 'Your Organization'}
            </h3>
            <p className="text-sm text-slate-600">
              {formData.custom_branding?.welcome_message || 'Your personalized welcome message will appear here'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700">
          Next: Resource Pre-Population →
        </Button>
      </div>
    </div>
  );
}