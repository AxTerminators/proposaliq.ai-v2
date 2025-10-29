import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Edit, Trash2, Package, Users, Plane, DollarSign } from "lucide-react";

export default function CLINBuilder({ proposalId, organizationId, proposalData }) {
  const queryClient = useQueryClient();
  const [showCLINDialog, setShowCLINDialog] = useState(false);
  const [showLaborDialog, setShowLaborDialog] = useState(false);
  const [showODCDialog, setShowODCDialog] = useState(false);
  const [selectedCLIN, setSelectedCLIN] = useState(null);
  const [activeCLIN, setActiveCLIN] = useState(null);

  const [clinForm, setClinForm] = useState({
    clin_number: "",
    clin_title: "",
    clin_type: "labor",
    period_of_performance: "Base Year",
    fee_percentage: 10.0,
    is_option: false
  });

  const [laborForm, setLaborForm] = useState({
    labor_category_id: "",
    hours: 0,
    hourly_rate: 0
  });

  const [odcForm, setODCForm] = useState({
    odc_category: "materials",
    item_name: "",
    quantity: 1,
    unit_cost: 0
  });

  const { data: clins } = useQuery({
    queryKey: ['clins', proposalId],
    queryFn: () => proposalId ? base44.entities.CLIN.filter({ proposal_id: proposalId }, 'clin_number') : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: laborCategories } = useQuery({
    queryKey: ['labor-categories', organizationId],
    queryFn: () => organizationId ? base44.entities.LaborCategory.filter({ organization_id: organizationId }) : [],
    initialData: [],
    enabled: !!organizationId
  });

  const { data: laborAllocations } = useQuery({
    queryKey: ['labor-allocations', proposalId],
    queryFn: () => proposalId ? base44.entities.LaborAllocation.filter({ proposal_id: proposalId }) : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: odcItems } = useQuery({
    queryKey: ['odc-items', proposalId],
    queryFn: () => proposalId ? base44.entities.ODCItem.filter({ proposal_id: proposalId }) : [],
    initialData: [],
    enabled: !!proposalId
  });

  const createCLINMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.CLIN.create({
        ...data,
        proposal_id: proposalId,
        organization_id: organizationId,
        total_cost: 0,
        total_price: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clins'] });
      setShowCLINDialog(false);
      resetCLINForm();
    }
  });

  const updateCLINMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.CLIN.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clins'] });
      setShowCLINDialog(false);
      setSelectedCLIN(null);
    }
  });

  const deleteCLINMutation = useMutation({
    mutationFn: (id) => base44.entities.CLIN.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clins'] });
    }
  });

  const addLaborAllocationMutation = useMutation({
    mutationFn: async (data) => {
      const category = laborCategories.find(c => c.id === data.labor_category_id);
      await base44.entities.LaborAllocation.create({
        ...data,
        proposal_id: proposalId,
        clin_id: activeCLIN.id,
        labor_category_name: category?.category_name,
        hourly_rate: data.hourly_rate || category?.loaded_hourly_rate,
        total_cost: data.hours * (data.hourly_rate || category?.loaded_hourly_rate),
        fte: data.hours / 2080
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['labor-allocations'] });
      await recalculateCLINTotals(activeCLIN.id);
      setShowLaborDialog(false);
      resetLaborForm();
    }
  });

  const addODCItemMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ODCItem.create({
        ...data,
        proposal_id: proposalId,
        clin_id: activeCLIN.id,
        total_cost: data.quantity * data.unit_cost
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['odc-items'] });
      await recalculateCLINTotals(activeCLIN.id);
      setShowODCDialog(false);
      resetODCForm();
    }
  });

  const deleteLaborMutation = useMutation({
    mutationFn: (id) => base44.entities.LaborAllocation.delete(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['labor-allocations'] });
      if (activeCLIN) {
        await recalculateCLINTotals(activeCLIN.id);
      }
    }
  });

  const deleteODCMutation = useMutation({
    mutationFn: (id) => base44.entities.ODCItem.delete(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['odc-items'] });
      if (activeCLIN) {
        await recalculateCLINTotals(activeCLIN.id);
      }
    }
  });

  const recalculateCLINTotals = async (clinId) => {
    const clinLabor = laborAllocations.filter(l => l.clin_id === clinId);
    const clinODC = odcItems.filter(o => o.clin_id === clinId);

    const laborCost = clinLabor.reduce((sum, l) => sum + (l.total_cost || 0), 0);
    const odcCost = clinODC.reduce((sum, o) => sum + (o.total_cost || 0), 0);
    const totalCost = laborCost + odcCost;

    const clin = clins.find(c => c.id === clinId);
    const feePercentage = clin?.fee_percentage || 10;
    const feeAmount = totalCost * (feePercentage / 100);
    const totalPrice = totalCost + feeAmount;

    await base44.entities.CLIN.update(clinId, {
      labor_cost: laborCost,
      odc_cost: odcCost,
      total_cost: totalCost,
      fee_amount: feeAmount,
      total_price: totalPrice
    });

    queryClient.invalidateQueries({ queryKey: ['clins'] });
  };

  const resetCLINForm = () => {
    setClinForm({
      clin_number: "",
      clin_title: "",
      clin_type: "labor",
      period_of_performance: "Base Year",
      fee_percentage: 10.0,
      is_option: false
    });
    setSelectedCLIN(null);
  };

  const resetLaborForm = () => {
    setLaborForm({
      labor_category_id: "",
      hours: 0,
      hourly_rate: 0
    });
  };

  const resetODCForm = () => {
    setODCForm({
      odc_category: "materials",
      item_name: "",
      quantity: 1,
      unit_cost: 0
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Contract Line Items (CLINs)</h3>
          <p className="text-sm text-slate-600">Build your pricing structure with CLINs, labor, and ODCs</p>
        </div>
        <Button onClick={() => { resetCLINForm(); setShowCLINDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add CLIN
        </Button>
      </div>

      {clins.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No CLINs defined yet</p>
            <Button onClick={() => { resetCLINForm(); setShowCLINDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add First CLIN
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {clins.map((clin) => {
            const clinLabor = laborAllocations.filter(l => l.clin_id === clin.id);
            const clinODC = odcItems.filter(o => o.clin_id === clin.id);

            return (
              <AccordionItem key={clin.id} value={clin.id} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-600">{clin.clin_number}</Badge>
                      <span className="font-semibold">{clin.clin_title}</span>
                      {clin.is_option && (
                        <Badge variant="outline">Option</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Total Price</p>
                        <p className="text-lg font-bold text-green-600">
                          ${clin.total_price?.toLocaleString() || '0'}
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-4 border-t">
                    {/* CLIN Details */}
                    <div className="grid md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-xs text-slate-600">Type</p>
                        <p className="font-medium capitalize">{clin.clin_type?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Period</p>
                        <p className="font-medium">{clin.period_of_performance}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Cost</p>
                        <p className="font-medium">${clin.total_cost?.toLocaleString() || '0'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600">Fee ({clin.fee_percentage}%)</p>
                        <p className="font-medium">${clin.fee_amount?.toLocaleString() || '0'}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setActiveCLIN(clin);
                          resetLaborForm();
                          setShowLaborDialog(true);
                        }}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Add Labor
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setActiveCLIN(clin);
                          resetODCForm();
                          setShowODCDialog(true);
                        }}
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Add ODC
                      </Button>
                      <div className="flex-1"></div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setSelectedCLIN(clin);
                          setClinForm({
                            clin_number: clin.clin_number,
                            clin_title: clin.clin_title,
                            clin_type: clin.clin_type,
                            period_of_performance: clin.period_of_performance,
                            fee_percentage: clin.fee_percentage,
                            is_option: clin.is_option
                          });
                          setShowCLINDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Delete this CLIN and all associated data?')) {
                            deleteCLINMutation.mutate(clin.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>

                    {/* Labor Allocations */}
                    {clinLabor.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Labor Allocations
                        </h4>
                        <div className="space-y-2">
                          {clinLabor.map((labor) => (
                            <div key={labor.id} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                              <div>
                                <p className="font-medium text-sm">{labor.labor_category_name}</p>
                                <p className="text-xs text-slate-600">
                                  {labor.hours} hrs @ ${labor.hourly_rate}/hr • {labor.fte?.toFixed(2)} FTE
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="font-semibold">${labor.total_cost?.toLocaleString()}</p>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('Delete this labor allocation?')) {
                                      deleteLaborMutation.mutate(labor.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ODC Items */}
                    {clinODC.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Other Direct Costs (ODC)
                        </h4>
                        <div className="space-y-2">
                          {clinODC.map((odc) => (
                            <div key={odc.id} className="flex items-center justify-between p-2 bg-amber-50 rounded border">
                              <div>
                                <p className="font-medium text-sm">{odc.item_name}</p>
                                <p className="text-xs text-slate-600 capitalize">
                                  {odc.odc_category?.replace('_', ' ')} • Qty: {odc.quantity} @ ${odc.unit_cost}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="font-semibold">${odc.total_cost?.toLocaleString()}</p>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('Delete this ODC item?')) {
                                      deleteODCMutation.mutate(odc.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* CLIN Dialog */}
      <Dialog open={showCLINDialog} onOpenChange={setShowCLINDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCLIN ? 'Edit' : 'Add'} CLIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CLIN Number *</Label>
                <Input
                  value={clinForm.clin_number}
                  onChange={(e) => setClinForm({...clinForm, clin_number: e.target.value})}
                  placeholder="e.g., 0001"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={clinForm.clin_type}
                  onValueChange={(value) => setClinForm({...clinForm, clin_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labor">Labor</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="odc">ODC</SelectItem>
                    <SelectItem value="fixed_price">Fixed Price</SelectItem>
                    <SelectItem value="time_and_materials">T&M</SelectItem>
                    <SelectItem value="cost_plus">Cost Plus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>CLIN Title *</Label>
              <Input
                value={clinForm.clin_title}
                onChange={(e) => setClinForm({...clinForm, clin_title: e.target.value})}
                placeholder="e.g., Base Year Labor Services"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period of Performance</Label>
                <Input
                  value={clinForm.period_of_performance}
                  onChange={(e) => setClinForm({...clinForm, period_of_performance: e.target.value})}
                  placeholder="e.g., Base Year"
                />
              </div>
              <div className="space-y-2">
                <Label>Fee/Profit (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={clinForm.fee_percentage}
                  onChange={(e) => setClinForm({...clinForm, fee_percentage: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={clinForm.is_option}
                onChange={(e) => setClinForm({...clinForm, is_option: e.target.checked})}
                className="rounded"
              />
              <Label>This is an option period</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCLINDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!clinForm.clin_number || !clinForm.clin_title) {
                alert("Please provide CLIN number and title");
                return;
              }
              if (selectedCLIN) {
                updateCLINMutation.mutate({ id: selectedCLIN.id, data: clinForm });
              } else {
                createCLINMutation.mutate(clinForm);
              }
            }}>
              {selectedCLIN ? 'Update' : 'Create'} CLIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Labor Allocation Dialog */}
      <Dialog open={showLaborDialog} onOpenChange={setShowLaborDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Labor to CLIN {activeCLIN?.clin_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Labor Category *</Label>
              <Select
                value={laborForm.labor_category_id}
                onValueChange={(value) => {
                  const category = laborCategories.find(c => c.id === value);
                  setLaborForm({
                    ...laborForm,
                    labor_category_id: value,
                    hourly_rate: category?.loaded_hourly_rate || 0
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select labor category" />
                </SelectTrigger>
                <SelectContent>
                  {laborCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.category_name} - ${cat.loaded_hourly_rate}/hr
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hours *</Label>
                <Input
                  type="number"
                  value={laborForm.hours}
                  onChange={(e) => setLaborForm({...laborForm, hours: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={laborForm.hourly_rate}
                  onChange={(e) => setLaborForm({...laborForm, hourly_rate: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border">
              <p className="text-sm text-slate-600 mb-1">Total Cost</p>
              <p className="text-2xl font-bold text-blue-600">
                ${(laborForm.hours * laborForm.hourly_rate).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                FTE: {(laborForm.hours / 2080).toFixed(2)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLaborDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!laborForm.labor_category_id || !laborForm.hours) {
                alert("Please select labor category and enter hours");
                return;
              }
              addLaborAllocationMutation.mutate(laborForm);
            }}>
              Add Labor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ODC Item Dialog */}
      <Dialog open={showODCDialog} onOpenChange={setShowODCDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add ODC to CLIN {activeCLIN?.clin_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={odcForm.odc_category}
                onValueChange={(value) => setODCForm({...odcForm, odc_category: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="subcontract">Subcontract</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="facilities">Facilities</SelectItem>
                  <SelectItem value="consultants">Consultants</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Item Name/Description *</Label>
              <Input
                value={odcForm.item_name}
                onChange={(e) => setODCForm({...odcForm, item_name: e.target.value})}
                placeholder="e.g., Travel to customer site"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={odcForm.quantity}
                  onChange={(e) => setODCForm({...odcForm, quantity: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={odcForm.unit_cost}
                  onChange={(e) => setODCForm({...odcForm, unit_cost: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border">
              <p className="text-sm text-slate-600 mb-1">Total Cost</p>
              <p className="text-2xl font-bold text-amber-600">
                ${(odcForm.quantity * odcForm.unit_cost).toLocaleString()}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowODCDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!odcForm.item_name) {
                alert("Please provide item name");
                return;
              }
              addODCItemMutation.mutate(odcForm);
            }}>
              Add ODC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}