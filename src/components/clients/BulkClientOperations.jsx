import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Layers,
  Send,
  Archive,
  Mail,
  Loader2,
  CheckCircle2,
  Building2,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Bulk Client Operations
 * Perform actions on multiple clients at once
 */
export default function BulkClientOperations({ clientOrganizations = [], consultingFirm }) {
  const queryClient = useQueryClient();
  const [selectedClients, setSelectedClients] = useState([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggleClient = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAll = () => {
    setSelectedClients(clientOrganizations.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedClients([]);
  };

  const executeBulkAction = async () => {
    if (!bulkAction || selectedClients.length === 0) {
      toast.error('Please select an action and at least one client');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const total = selectedClients.length;
      let completed = 0;

      for (const clientId of selectedClients) {
        switch (bulkAction) {
          case 'archive':
            await base44.entities.Organization.update(clientId, {
              is_archived: true,
              archived_date: new Date().toISOString()
            });
            break;

          case 'unarchive':
            await base44.entities.Organization.update(clientId, {
              is_archived: false,
              archived_date: null
            });
            break;

          case 'send_portal_links':
            const linkResponse = await base44.functions.invoke('generateClientPortalLink', {
              client_organization_id: clientId,
              expiration_days: 90
            });

            if (linkResponse.data.success) {
              const client = clientOrganizations.find(c => c.id === clientId);
              await base44.integrations.Core.SendEmail({
                to: client.contact_email,
                subject: `Your Secure Proposal Portal Access`,
                body: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Portal Access</h1>
                    </div>
                    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
                      <p style="font-size: 16px; color: #374151;">
                        Hello ${client.contact_name || 'there'},
                      </p>
                      <p style="font-size: 16px; color: #374151; margin: 20px 0;">
                        Access your secure proposal portal:
                      </p>
                      <div style="text-align: center;">
                        <a href="${linkResponse.data.portal_url}" 
                           style="background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                          Access Portal →
                        </a>
                      </div>
                    </div>
                  </div>
                `
              });
            }
            break;
        }

        completed++;
        setProgress((completed / total) * 100);
      }

      queryClient.invalidateQueries({ queryKey: ['client-organizations'] });
      
      toast.success(`✅ Completed ${bulkAction} for ${completed} client${completed !== 1 ? 's' : ''}!`);
      setShowBulkDialog(false);
      setSelectedClients([]);
      setBulkAction('');

    } catch (error) {
      console.error('Error executing bulk action:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <>
      <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Bulk Operations
            </CardTitle>
            <div className="flex gap-2">
              {selectedClients.length === 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectAll}
                  className="text-purple-700 border-purple-300"
                >
                  Select All
                </Button>
              ) : (
                <>
                  <Badge className="bg-purple-600 text-white px-3 py-1">
                    {selectedClients.length} selected
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={deselectAll}
                    className="text-purple-700 border-purple-300"
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowBulkDialog(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Actions
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clientOrganizations.map(client => {
              const isSelected = selectedClients.includes(client.id);
              
              return (
                <div
                  key={client.id}
                  onClick={() => toggleClient(client.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                    isSelected
                      ? "border-purple-500 bg-purple-100"
                      : "border-slate-200 hover:border-purple-300 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <p className="font-medium text-slate-900 text-sm truncate flex-1">
                      {client.organization_name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Bulk Action
            </DialogTitle>
            <DialogDescription>
              Perform action on {selectedClients.length} selected client{selectedClients.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Select Action</Label>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_portal_links">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Send Portal Links
                    </div>
                  </SelectItem>
                  <SelectItem value="archive">
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4" />
                      Archive Clients
                    </div>
                  </SelectItem>
                  <SelectItem value="unarchive">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Unarchive Clients
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Processing...</span>
                  <span className="font-semibold text-slate-900">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={executeBulkAction}
              disabled={!bulkAction || isProcessing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Execute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}