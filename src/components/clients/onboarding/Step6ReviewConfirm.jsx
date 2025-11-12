import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Building2,
  User,
  Handshake,
  Palette,
  Package,
  Loader2
} from "lucide-react";

export default function Step6ReviewConfirm({ formData, consultingFirm, onBack, onSubmit, isSubmitting }) {
  const selectedResourceCount = formData.initial_resources?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          Review & Confirm
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Please review all information before creating the workspace
        </p>
      </div>

      {/* Organization Profile */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
            Organization Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-500">Organization Name</Label>
              <p className="font-semibold text-slate-900">{formData.organization_name}</p>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Contact Email</Label>
              <p className="font-semibold text-slate-900">{formData.contact_email}</p>
            </div>
            {formData.organization_industry && (
              <div>
                <Label className="text-xs text-slate-500">Industry</Label>
                <p className="font-semibold text-slate-900 capitalize">
                  {formData.organization_industry.replace(/_/g, ' ')}
                </p>
              </div>
            )}
            {formData.organization_size && (
              <div>
                <Label className="text-xs text-slate-500">Organization Size</Label>
                <p className="font-semibold text-slate-900">{formData.organization_size} employees</p>
              </div>
            )}
          </div>

          {formData.market_segments?.length > 0 && (
            <div>
              <Label className="text-xs text-slate-500">Market Segments</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {formData.market_segments.map((seg, idx) => (
                  <Badge key={idx} variant="secondary">{seg}</Badge>
                ))}
              </div>
            </div>
          )}

          {formData.strategic_goals?.length > 0 && (
            <div>
              <Label className="text-xs text-slate-500">Strategic Goals</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {formData.strategic_goals.map((goal, idx) => (
                  <Badge key={idx} className="bg-green-100 text-green-700">{goal}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Preferences */}
      {(formData.preferred_proposal_formats?.length > 0 || formData.typical_review_cycle_duration) && (
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Handshake className="w-5 h-5 text-purple-600" />
              Engagement Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {formData.preferred_proposal_formats?.length > 0 && (
              <div>
                <Label className="text-xs text-slate-500">Preferred Formats</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {formData.preferred_proposal_formats.map((format, idx) => (
                    <Badge key={idx} variant="secondary">{format}</Badge>
                  ))}
                </div>
              </div>
            )}
            {formData.typical_review_cycle_duration && (
              <div>
                <Label className="text-xs text-slate-500">Typical Review Cycle</Label>
                <p className="font-semibold text-slate-900">
                  {formData.typical_review_cycle_duration} days
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Primary Stakeholder */}
      {formData.primary_stakeholder?.member_name && (
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-green-600" />
              Primary Stakeholder
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Name</Label>
                <p className="font-semibold text-slate-900">{formData.primary_stakeholder.member_name}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Email</Label>
                <p className="font-semibold text-slate-900">{formData.primary_stakeholder.member_email}</p>
              </div>
              {formData.primary_stakeholder.member_title && (
                <div>
                  <Label className="text-xs text-slate-500">Title</Label>
                  <p className="font-semibold text-slate-900">{formData.primary_stakeholder.member_title}</p>
                </div>
              )}
              {formData.primary_stakeholder.decision_authority_level && (
                <div>
                  <Label className="text-xs text-slate-500">Decision Authority</Label>
                  <Badge className="capitalize">
                    {formData.primary_stakeholder.decision_authority_level}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Branding */}
      {(formData.custom_branding?.logo_url || formData.custom_branding?.welcome_message) && (
        <Card className="border-2 border-pink-200">
          <CardHeader className="bg-pink-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="w-5 h-5 text-pink-600" />
              Custom Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {formData.custom_branding.logo_url && (
              <div>
                <Label className="text-xs text-slate-500">Logo</Label>
                <img
                  src={formData.custom_branding.logo_url}
                  alt="Logo"
                  className="h-12 mt-1"
                />
              </div>
            )}
            {formData.custom_branding.primary_color && (
              <div>
                <Label className="text-xs text-slate-500">Brand Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: formData.custom_branding.primary_color }}
                  />
                  <span className="font-mono text-sm">{formData.custom_branding.primary_color}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resources */}
      {selectedResourceCount > 0 && (
        <Card className="border-2 border-indigo-200">
          <CardHeader className="bg-indigo-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-indigo-600" />
              Resources to Share
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-700">
              {selectedResourceCount} resource{selectedResourceCount !== 1 ? 's' : ''} will be shared to the new client workspace
            </p>
          </CardContent>
        </Card>
      )}

      {/* Final Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-3">✨ What will be created:</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Client organization workspace with complete data isolation</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Master proposal board with default workflow columns</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Content library with organized folder structure</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Primary stakeholder access and relationship tracking</span>
          </li>
          {selectedResourceCount > 0 && (
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{selectedResourceCount} shared resources ready for use</span>
            </li>
          )}
        </ul>
      </div>

      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline" disabled={isSubmitting}>
          ← Back
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Workspace...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Create Client Workspace
            </>
          )}
        </Button>
      </div>
    </div>
  );
}