import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  Plus,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

/**
 * Client Billing Manager
 * Track billable items and generate invoices per client
 */
export default function ClientBillingManager({ consultingFirm, clientOrganization }) {
  const queryClient = useQueryClient();
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    billing_period_start: moment().startOf('month').format('YYYY-MM-DD'),
    billing_period_end: moment().endOf('month').format('YYYY-MM-DD'),
    line_items: [],
    notes: ''
  });

  // Fetch relationship for billing model
  const { data: relationship } = useQuery({
    queryKey: ['client-relationship-billing', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return null;
      const rels = await base44.entities.OrganizationRelationship.filter({
        client_organization_id: clientOrganization.id
      });
      return rels.length > 0 ? rels[0] : null;
    },
    enabled: !!clientOrganization?.id,
  });

  // Fetch proposals for billing period
  const { data: periodProposals = [] } = useQuery({
    queryKey: ['billing-proposals', clientOrganization?.id, invoiceData.billing_period_start],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      
      const proposals = await base44.entities.Proposal.filter({
        organization_id: clientOrganization.id
      });

      // Filter by date range
      return proposals.filter(p =>
        moment(p.created_date).isBetween(
          invoiceData.billing_period_start,
          invoiceData.billing_period_end,
          null,
          '[]'
        )
      );
    },
    enabled: !!clientOrganization?.id && !!invoiceData.billing_period_start,
  });

  const handleGenerateInvoice = () => {
    // Auto-populate line items based on billing model
    const lineItems = [];

    if (relationship?.billing_model === 'per_proposal') {
      periodProposals.forEach(p => {
        lineItems.push({
          description: `Proposal: ${p.proposal_name}`,
          quantity: 1,
          rate: 5000, // Default rate
          amount: 5000
        });
      });
    } else if (relationship?.billing_model === 'monthly_retainer') {
      lineItems.push({
        description: 'Monthly Retainer - Proposal Management Services',
        quantity: 1,
        rate: 10000,
        amount: 10000
      });
    }

    setInvoiceData({
      ...invoiceData,
      line_items: lineItems
    });
    setShowInvoiceDialog(true);
  };

  const calculateTotal = () => {
    return invoiceData.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const addLineItem = () => {
    setInvoiceData({
      ...invoiceData,
      line_items: [
        ...invoiceData.line_items,
        { description: '', quantity: 1, rate: 0, amount: 0 }
      ]
    });
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...invoiceData.line_items];
    updated[index][field] = value;
    
    // Recalculate amount
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = (updated[index].quantity || 0) * (updated[index].rate || 0);
    }
    
    setInvoiceData({ ...invoiceData, line_items: updated });
  };

  const removeLineItem = (index) => {
    setInvoiceData({
      ...invoiceData,
      line_items: invoiceData.line_items.filter((_, i) => i !== index)
    });
  };

  const handleDownloadInvoice = () => {
    toast.success('Invoice download feature coming soon!');
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Billing & Invoicing
            </CardTitle>
            <Button
              onClick={handleGenerateInvoice}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-1">Billing Model</p>
              <p className="font-semibold text-blue-900 capitalize">
                {relationship?.billing_model?.replace('_', ' ') || 'Not Set'}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-800 mb-1">This Month</p>
              <p className="font-semibold text-purple-900">
                {periodProposals.length} proposal{periodProposals.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 mb-1">Total Contract Value</p>
              <p className="font-semibold text-green-900">
                ${(periodProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0) / 1000).toFixed(0)}K
              </p>
            </div>
          </div>

          {relationship?.custom_billing_notes && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border">
              <p className="text-xs text-slate-500 mb-1">Billing Notes</p>
              <p className="text-sm text-slate-700">{relationship.custom_billing_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Generate Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Billing Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Billing Period Start</Label>
                <Input
                  type="date"
                  value={invoiceData.billing_period_start}
                  onChange={(e) => setInvoiceData({
                    ...invoiceData,
                    billing_period_start: e.target.value
                  })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Billing Period End</Label>
                <Input
                  type="date"
                  value={invoiceData.billing_period_end}
                  onChange={(e) => setInvoiceData({
                    ...invoiceData,
                    billing_period_end: e.target.value
                  })}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Line Items</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {invoiceData.line_items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, 'quantity', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => updateLineItem(idx, 'rate', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Amount"
                        value={item.amount}
                        readOnly
                        className="bg-slate-50"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(idx)}
                        className="text-red-600"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}

                {invoiceData.line_items.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No line items yet. Click "Add Item" to get started.
                  </p>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-lg font-bold">
                <span className="text-slate-900">Total Amount</span>
                <span className="text-green-700">
                  ${calculateTotal().toLocaleString()}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Invoice Notes (Optional)</Label>
              <Textarea
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                placeholder="Payment terms, special instructions, etc."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDownloadInvoice}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}