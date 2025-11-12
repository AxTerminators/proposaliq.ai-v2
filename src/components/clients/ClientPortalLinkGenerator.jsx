import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  Send,
  Loader2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

/**
 * Client Portal Link Generator
 * Generate secure access links for clients
 */
export default function ClientPortalLinkGenerator({ clientOrganization, trigger }) {
  const [showDialog, setShowDialog] = useState(false);
  const [expirationDays, setExpirationDays] = useState('90');
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateClientPortalLink', {
        client_organization_id: clientOrganization.id,
        expiration_days: parseInt(expirationDays)
      });

      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedLink(data);
      toast.success('Portal link generated!');
    },
    onError: (error) => {
      toast.error('Failed to generate link: ' + error.message);
    }
  });

  const handleCopyLink = async () => {
    if (!generatedLink?.portal_url) return;

    try {
      await navigator.clipboard.writeText(generatedLink.portal_url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleSendEmail = async () => {
    if (!generatedLink) return;

    try {
      await base44.integrations.Core.SendEmail({
        to: clientOrganization.contact_email,
        subject: `Secure Access to Your Proposal Portal - ${clientOrganization.organization_name}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Your Proposal Portal Access</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Hello ${clientOrganization.contact_name || 'there'},
              </p>
              
              <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                Your consultant has shared a secure portal where you can review proposals, provide feedback, and download documents.
              </p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Secure Access Link:</p>
                <a href="${generatedLink.portal_url}" 
                   style="color: #3b82f6; font-weight: bold; word-break: break-all;">
                  ${generatedLink.portal_url}
                </a>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="font-size: 14px; color: #92400e; margin: 0;">
                  <strong>⏰ Expires:</strong> ${moment(generatedLink.expires_at).format('MMMM D, YYYY')}
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${generatedLink.portal_url}" 
                   style="background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Access Your Portal →
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                  This link is secure and unique to you. Please do not share it with others.
                </p>
              </div>
            </div>
          </div>
        `
      });

      toast.success('Email sent to ' + clientOrganization.contact_email);
    } catch (error) {
      toast.error('Failed to send email: ' + error.message);
    }
  };

  const handleOpen = () => {
    setShowDialog(true);
    setGeneratedLink(null);
    setCopied(false);
  };

  return (
    <>
      {trigger ? (
        React.cloneElement(trigger, { onClick: handleOpen })
      ) : (
        <Button onClick={handleOpen} variant="outline">
          <LinkIcon className="w-4 h-4 mr-2" />
          Generate Portal Link
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-600" />
              Generate Client Portal Link
            </DialogTitle>
            <DialogDescription>
              Create a secure access link for {clientOrganization.organization_name}
            </DialogDescription>
          </DialogHeader>

          {generatedLink ? (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="font-semibold text-green-900">Link Generated Successfully!</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-green-800">Secure Portal URL</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={generatedLink.portal_url}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={handleCopyLink}
                        className={cn(
                          "flex-shrink-0",
                          copied ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
                        )}
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-green-800 font-medium">Expires</p>
                      <p className="text-green-700">
                        {moment(generatedLink.expires_at).format('MMM D, YYYY')}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-800 font-medium">Valid For</p>
                      <p className="text-green-700">
                        {moment(generatedLink.expires_at).diff(moment(), 'days')} days
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSendEmail}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Email to Client
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(generatedLink.portal_url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div>
                <Label>Link Expiration</Label>
                <Select value={expirationDays} onValueChange={setExpirationDays}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days (Recommended)</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  ℹ️ This will generate a secure, unique link that allows 
                  {' '}<strong>{clientOrganization.organization_name}</strong> to access 
                  their proposal portal without logging in.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setGeneratedLink(null);
                setCopied(false);
              }}
            >
              Close
            </Button>
            {!generatedLink && (
              <Button
                onClick={() => generateLinkMutation.mutate()}
                disabled={generateLinkMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generateLinkMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Generate Link
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}