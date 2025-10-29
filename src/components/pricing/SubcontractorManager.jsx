import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Edit, Trash2, Users, DollarSign, TrendingUp, FileText } from "lucide-react";

export default function SubcontractorManager({ proposalId, organizationId }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [subForm, setSubForm] = useState({
    subcontractor_name: "",
    scope_of_work: "",
    total_subcontractor_cost: 0,
    prime_markup_percentage: 10.0,
    negotiation_status: "initial_quote",
    notes: ""
  });

  const { data: subcontractors } = useQuery({
    queryKey: ['subcontractor-pricing', proposalId],
    queryFn: () => proposalId ? base44.entities.SubcontractorPricing.filter({ proposal_id: proposalId }) : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: teamingPartners } = useQuery({
    queryKey: ['teaming-partners', organizationId],
    queryFn: () => organizationId ? base44.entities.TeamingPartner.filter({ organization_id: organizationId }) : [],
    initialData: [],
    enabled: !!organizationId
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const markupAmount = data.total_subcontractor_cost * (data.prime_markup_percentage / 100);
      const totalPrice = data.total_subcontractor_cost + markupAmount;

      await base44.entities.SubcontractorPricing.create({
        ...data,
        proposal_id: proposalId,
        organization_id: organizationId,
        prime_markup_amount: markupAmount,
        total_price_to_government: totalPrice
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-pricing'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const markupAmount = data.total_subcontractor_cost * (data.prime_markup_percentage / 100);
      const totalPrice = data.total_subcontractor_cost + markupAmount;

      await base44.entities.SubcontractorPricing.update(id, {
        ...data,
        prime_markup_amount: markupAmount,
        total_price_to_government: totalPrice
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-pricing'] });
      setShowDialog(false);
      setSelectedSub(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SubcontractorPricing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractor-pricing'] });
    }
  });

  const resetForm = () => {
    setSubForm({
      subcontractor_name: "",
      scope_of_work: "",
      total_subcontractor_cost: 0,
      prime_markup_percentage: 10.0,
      negotiation_status: "initial_quote",
      notes: ""
    });
    setSelectedSub(null);
  };

  const handleEdit = (sub) => {
    setSelectedSub(sub);
    setSubForm({
      subcontractor_name: sub.subcontractor_name,
      scope_of_work: sub.scope_of_work || "",
      total_subcontractor_cost: sub.total_subcontractor_cost,
      prime_markup_percentage: sub.prime_markup_percentage,
      negotiation_status: sub.negotiation_status,
      notes: sub.notes || ""
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!subForm.subcontractor_name || !subForm.total_subcontractor_cost) {
      alert("Please provide subcontractor name and cost");
      return;
    }

    if (selectedSub) {
      updateMutation.mutate({ id: selectedSub.id, data: subForm });
    } else {
      createMutation.mutate(subForm);
    }
  };

  const totalSubCost = subcontractors.reduce((sum, sub) => sum + (sub.total_subcontractor_cost || 0), 0);
  const totalSubPrice = subcontractors.reduce((sum, sub) => sum + (sub.total_price_to_government || 0), 0);
  const totalMarkup = totalSubPrice - totalSubCost;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Subcontractor Pricing</h3>
          <p className="text-sm text-slate-600">Manage subcontractor quotes and prime markup</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Subcontractor
        </Button>
      </div>

      {/* Summary Cards */}
      {subcontractors.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-slate-600 mb-1">Total Sub Cost</p>
              <p className="text-2xl font-bold text-blue-600">
                ${totalSubCost.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-slate-600 mb-1">Prime Markup</p>
              <p className="text-2xl font-bold text-purple-600">
                ${totalMarkup.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-slate-600 mb-1">Total to Gov</p>
              <p className="text-2xl font-bold text-green-600">
                ${totalSubPrice.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subcontractor List */}
      {subcontractors.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No subcontractors added yet</p>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Subcontractor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {subcontractors.map((sub) => (
            <Card key={sub.id} className="border-slate-200 hover:border-blue-300 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-slate-900">{sub.subcontractor_name}</h4>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {sub.negotiation_status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {sub.scope_of_work && (
                      <p className="text-sm text-slate-600 mb-3">{sub.scope_of_work}</p>
                    )}

                    <div className="grid md:grid-cols-4 gap-4 p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-xs text-slate-600">Sub Cost</p>
                        <p className="text-lg font-semibold text-blue-600">
                          ${sub.total_subcontractor_cost?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Markup %</p>
                        <p className="text-lg font-semibold text-purple-600">
                          {sub.prime_markup_percentage}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Markup $</p>
                        <p className="text-lg font-semibold text-purple-600">
                          ${sub.prime_markup_amount?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Total Price</p>
                        <p className="text-lg font-semibold text-green-600">
                          ${sub.total_price_to_government?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {sub.notes && (
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                        <p className="text-amber-900"><strong>Notes:</strong> {sub.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(sub)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this subcontractor?')) {
                          deleteMutation.mutate(sub.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSub ? 'Edit' : 'Add'} Subcontractor Pricing
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subcontractor Name *</Label>
              {teamingPartners.length > 0 ? (
                <Select
                  value={subForm.subcontractor_name}
                  onValueChange={(value) => {
                    const partner = teamingPartners.find(p => p.partner_name === value);
                    setSubForm({
                      ...subForm,
                      subcontractor_name: value,
                      subcontractor_id: partner?.id
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select from partners or enter new" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamingPartners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.partner_name}>
                        {partner.partner_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={subForm.subcontractor_name}
                  onChange={(e) => setSubForm({...subForm, subcontractor_name: e.target.value})}
                  placeholder="Enter subcontractor name"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Scope of Work</Label>
              <Textarea
                value={subForm.scope_of_work}
                onChange={(e) => setSubForm({...subForm, scope_of_work: e.target.value})}
                placeholder="What work is the subcontractor performing?"
                className="h-20"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subcontractor Cost ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={subForm.total_subcontractor_cost}
                  onChange={(e) => setSubForm({...subForm, total_subcontractor_cost: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="space-y-2">
                <Label>Prime Markup (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={subForm.prime_markup_percentage}
                  onChange={(e) => setSubForm({...subForm, prime_markup_percentage: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Negotiation Status</Label>
              <Select
                value={subForm.negotiation_status}
                onValueChange={(value) => setSubForm({...subForm, negotiation_status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial_quote">Initial Quote</SelectItem>
                  <SelectItem value="negotiating">Negotiating</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calculation Preview */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Subcontractor Cost:</span>
                    <span className="font-semibold">${subForm.total_subcontractor_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Prime Markup ({subForm.prime_markup_percentage}%):</span>
                    <span className="font-semibold text-purple-600">
                      ${(subForm.total_subcontractor_cost * subForm.prime_markup_percentage / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold text-slate-900">Total Price to Government:</span>
                    <span className="text-xl font-bold text-green-600">
                      ${(subForm.total_subcontractor_cost * (1 + subForm.prime_markup_percentage / 100)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={subForm.notes}
                onChange={(e) => setSubForm({...subForm, notes: e.target.value})}
                placeholder="Additional notes about this subcontractor..."
                className="h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>
              {selectedSub ? 'Update' : 'Add'} Subcontractor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}