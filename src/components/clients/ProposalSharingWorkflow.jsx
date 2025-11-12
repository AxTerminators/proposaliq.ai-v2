import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Share2,
  Send,
  Eye,
  EyeOff,
  Mail,
  CheckCircle2,
  Loader2,
  FileText,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Proposal Sharing Workflow
 * Streamlined flow to share proposals with clients and send notifications
 */
export default function ProposalSharingWorkflow({ proposal, clientOrganization, trigger }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [shareConfig, setShareConfig] = useState({
    enable_client_view: true,
    send_notification: true,
    include_documents: true,
    custom_message: ''
  });
  const [isSharing, setIsSharing] = useState(false);

  // Fetch documents for this proposal
  const { data: documents = [] } = useQuery({
    queryKey: ['proposal-docs-share', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.SolicitationDocument.filter({
        proposal_id: proposal.id,
        organization_id: proposal.organization_id
      });
    },
    enabled: !!proposal?.id && showDialog,
  });

  const handleShare = async () => {
    if (!proposal || !clientOrganization) {
      toast.error('Missing required data');
      return;
    }

    setIsSharing(true);

    try {
      // Step 1: Enable client view on proposal
      if (shareConfig.enable_client_view) {
        await base44.entities.Proposal.update(proposal.id, {
          client_view_enabled: true,
          shared_with_client_ids: [
            ...(proposal.shared_with_client_ids || []),
            clientOrganization.id
          ]
        });
      }

      // Step 2: Share selected documents
      if (shareConfig.include_documents && documents.length > 0) {
        for (const doc of documents) {
          await base44.entities.SolicitationDocument.update(doc.id, {
            shared_with_client: true,
            client_can_download: true
          });
        }
      }

      // Step 3: Send notification email
      if (shareConfig.send_notification) {
        // Generate portal link
        const linkResponse = await base44.functions.invoke('generateClientPortalLink', {
          client_organization_id: clientOrganization.id,
          expiration_days: 90
        });

        if (linkResponse.data.success) {
          const portalUrl = linkResponse.data.portal_url;

          await base44.integrations.Core.SendEmail({
            to: clientOrganization.contact_email,
            subject: `New Proposal Shared: ${proposal.proposal_name}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">📄 New Proposal Shared</h1>
                </div>
                
                <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
                  <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                    Hello ${clientOrganization.contact_name || 'there'},
                  </p>
                  
                  <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                    A new proposal has been shared with you for review:
                  </p>

                  <div style="background: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
                    <h2 style="margin: 0 0 10px 0; color: #1e293b; font-size: 20px;">
                      ${proposal.proposal_name}
                    </h2>
                    ${proposal.project_title ? `
                      <p style="color: #64748b; margin: 0; font-size: 14px;">
                        ${proposal.project_title}
                      </p>
                    ` : ''}
                    ${proposal.due_date ? `
                      <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">
                        📅 Due: ${moment(proposal.due_date).format('MMMM D, YYYY')}
                      </p>
                    ` : ''}
                  </div>

                  ${shareConfig.custom_message ? `
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
                      <p style="color: #1e40af; margin: 0; font-size: 14px; white-space: pre-wrap;">
                        ${shareConfig.custom_message}
                      </p>
                    </div>
                  ` : ''}

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${portalUrl}" 
                       style="background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                      View Proposal →
                    </a>
                  </div>

                  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #374151; margin: 0 0 10px 0; font-size: 14px;">
                      <strong>What you can do:</strong>
                    </p>
                    <ul style="color: #64748b; font-size: 14px; margin: 0; padding-left: 20px;">
                      <li>Review all proposal sections</li>
                      <li>Add comments and questions</li>
                      <li>Download supporting documents</li>
                      <li>Provide feedback directly to your consultant</li>
                    </ul>
                  </div>

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                      This is a secure portal. Your access link is unique and private.
                    </p>
                  </div>
                </div>
              </div>
            `
          });
        }
      }

      // Step 4: Create notification record
      await base44.entities.ClientNotification.create({
        client_id: clientOrganization.id,
        proposal_id: proposal.id,
        notification_type: 'proposal_shared',
        title: `New Proposal: ${proposal.proposal_name}`,
        message: `Your consultant has shared a new proposal for your review`,
        action_url: `/ClientPortalView?token=...`,
        from_consultant_email: proposal.created_by,
        priority: 'high'
      });

      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] });

      toast.success(`✅ Proposal shared with ${clientOrganization.organization_name}!`);
      setShowDialog(false);

    } catch (error) {
      console.error('Error sharing proposal:', error);
      toast.error('Failed to share proposal: ' + error.message);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      {trigger ? (
        React.cloneElement(trigger, { onClick: () => setShowDialog(true) })
      ) : (
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Share2 className="w-4 h-4 mr-2" />
          Share with Client
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-600" />
              Share Proposal with Client
            </DialogTitle>
            <DialogDescription>
              Configure how to share "{proposal?.proposal_name}" with {clientOrganization?.organization_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Proposal Summary */}
            <Card className="bg-slate-50 border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {proposal?.proposal_name}
                    </p>
                    {proposal?.project_title && (
                      <p className="text-sm text-slate-600 mt-1">
                        {proposal.project_title}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Share Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable_view"
                  checked={shareConfig.enable_client_view}
                  onCheckedChange={(checked) => setShareConfig({
                    ...shareConfig,
                    enable_client_view: checked
                  })}
                />
                <Label htmlFor="enable_view" className="cursor-pointer flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  Enable client portal access
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send_email"
                  checked={shareConfig.send_notification}
                  onCheckedChange={(checked) => setShareConfig({
                    ...shareConfig,
                    send_notification: checked
                  })}
                />
                <Label htmlFor="send_email" className="cursor-pointer flex items-center gap-2">
                  <Mail className="w-4 h-4 text-green-600" />
                  Send email notification to {clientOrganization?.contact_email}
                </Label>
              </div>

              {documents.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_docs"
                    checked={shareConfig.include_documents}
                    onCheckedChange={(checked) => setShareConfig({
                      ...shareConfig,
                      include_documents: checked
                    })}
                  />
                  <Label htmlFor="include_docs" className="cursor-pointer flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Share {documents.length} document{documents.length !== 1 ? 's' : ''}
                  </Label>
                </div>
              )}
            </div>

            {/* Custom Message */}
            <div>
              <Label>Custom Message (Optional)</Label>
              <Textarea
                value={shareConfig.custom_message}
                onChange={(e) => setShareConfig({
                  ...shareConfig,
                  custom_message: e.target.value
                })}
                placeholder="Add a personal note to your client..."
                rows={4}
                className="mt-2"
              />
            </div>

            {/* Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-semibold mb-2">
                What will happen:
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                {shareConfig.enable_client_view && (
                  <li>✓ Client can view proposal in secure portal</li>
                )}
                {shareConfig.send_notification && (
                  <li>✓ Email sent to {clientOrganization?.contact_email}</li>
                )}
                {shareConfig.include_documents && documents.length > 0 && (
                  <li>✓ {documents.length} document{documents.length !== 1 ? 's' : ''} available for download</li>
                )}
                <li>✓ Client can add comments and feedback</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSharing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={isSharing || !shareConfig.enable_client_view}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSharing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Share Proposal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}