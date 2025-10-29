import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Calculator, TrendingUp } from "lucide-react";

export default function LaborRateManager({ organizationId, proposalId }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRate, setSelectedRate] = useState(null);
  const [formData, setFormData] = useState({
    category_name: "",
    labor_level: "mid",
    base_hourly_rate: 0,
    fringe_rate: 35.5,
    overhead_rate: 45.0,
    ga_rate: 10.0,
    escalation_rate: 3.0
  });

  const { data: laborCategories } = useQuery({
    queryKey: ['labor-categories', organizationId],
    queryFn: () => organizationId ? base44.entities.LaborCategory.filter({ organization_id: organizationId }, 'category_name') : [],
    initialData: [],
    enabled: !!organizationId
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const loadedRate = calculateLoadedRate(data);
      await base44.entities.LaborCategory.create({
        ...data,
        organization_id: organizationId,
        loaded_hourly_rate: loadedRate,
        annual_salary_equivalent: data.base_hourly_rate * 2080
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-categories'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const loadedRate = calculateLoadedRate(data);
      await base44.entities.LaborCategory.update(id, {
        ...data,
        loaded_hourly_rate: loadedRate,
        annual_salary_equivalent: data.base_hourly_rate * 2080
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-categories'] });
      setShowDialog(false);
      setSelectedRate(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LaborCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-categories'] });
    }
  });

  const calculateLoadedRate = (data) => {
    const base = parseFloat(data.base_hourly_rate) || 0;
    const fringe = parseFloat(data.fringe_rate) || 0;
    const overhead = parseFloat(data.overhead_rate) || 0;
    const ga = parseFloat(data.ga_rate) || 0;

    // Standard calculation: Base * (1 + Fringe/100) * (1 + OH/100) * (1 + G&A/100)
    const withFringe = base * (1 + fringe / 100);
    const withOverhead = withFringe * (1 + overhead / 100);
    const withGA = withOverhead * (1 + ga / 100);

    return parseFloat(withGA.toFixed(2));
  };

  const resetForm = () => {
    setFormData({
      category_name: "",
      labor_level: "mid",
      base_hourly_rate: 0,
      fringe_rate: 35.5,
      overhead_rate: 45.0,
      ga_rate: 10.0,
      escalation_rate: 3.0
    });
    setSelectedRate(null);
  };

  const handleEdit = (rate) => {
    setSelectedRate(rate);
    setFormData({
      category_name: rate.category_name,
      labor_level: rate.labor_level,
      base_hourly_rate: rate.base_hourly_rate,
      fringe_rate: rate.fringe_rate,
      overhead_rate: rate.overhead_rate,
      ga_rate: rate.ga_rate,
      escalation_rate: rate.escalation_rate || 3.0
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.category_name || !formData.base_hourly_rate) {
      alert("Please provide category name and base rate");
      return;
    }

    if (selectedRate) {
      updateMutation.mutate({ id: selectedRate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const currentLoadedRate = calculateLoadedRate(formData);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Labor Categories & Rates</h3>
          <p className="text-sm text-slate-600">Define labor categories with fully burdened rates</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Labor Category
        </Button>
      </div>

      {laborCategories.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <Calculator className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No labor categories defined yet</p>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Labor Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {laborCategories.map((rate) => (
            <Card key={rate.id} className="border-slate-200 hover:border-blue-300 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{rate.category_name}</CardTitle>
                    <Badge variant="secondary" className="mt-1 capitalize">
                      {rate.labor_level}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(rate)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Delete this labor category?')) {
                          deleteMutation.mutate(rate.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Base Rate</p>
                    <p className="text-lg font-semibold text-slate-900">
                      ${rate.base_hourly_rate?.toFixed(2)}/hr
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Loaded Rate</p>
                    <p className="text-lg font-bold text-green-600">
                      ${rate.loaded_hourly_rate?.toFixed(2)}/hr
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-blue-50 rounded">
                    <p className="text-slate-600">Fringe</p>
                    <p className="font-semibold text-blue-700">{rate.fringe_rate}%</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded">
                    <p className="text-slate-600">OH</p>
                    <p className="font-semibold text-purple-700">{rate.overhead_rate}%</p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded">
                    <p className="text-slate-600">G&A</p>
                    <p className="font-semibold text-amber-700">{rate.ga_rate}%</p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 pt-2 border-t">
                  Annual: ${rate.annual_salary_equivalent?.toLocaleString()} • 
                  {rate.escalation_rate && ` Escalation: ${rate.escalation_rate}%`}
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
              {selectedRate ? 'Edit Labor Category' : 'Add Labor Category'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category Name *</Label>
                <Input
                  value={formData.category_name}
                  onChange={(e) => setFormData({...formData, category_name: e.target.value})}
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>

              <div className="space-y-2">
                <Label>Level</Label>
                <Select
                  value={formData.labor_level}
                  onValueChange={(value) => setFormData({...formData, labor_level: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Mid-Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">Rate Calculation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Base Hourly Rate * ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.base_hourly_rate}
                    onChange={(e) => setFormData({...formData, base_hourly_rate: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Fringe (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.fringe_rate}
                      onChange={(e) => setFormData({...formData, fringe_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overhead (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.overhead_rate}
                      onChange={(e) => setFormData({...formData, overhead_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>G&A (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.ga_rate}
                      onChange={(e) => setFormData({...formData, ga_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border-2 border-green-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Fully Loaded Hourly Rate</p>
                      <p className="text-3xl font-bold text-green-600">
                        ${currentLoadedRate.toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-green-300" />
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Annual Equivalent: ${(currentLoadedRate * 2080).toLocaleString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Annual Escalation Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.escalation_rate}
                    onChange={(e) => setFormData({...formData, escalation_rate: parseFloat(e.target.value) || 0})}
                    placeholder="e.g., 3.0"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {selectedRate ? 'Update' : 'Create'} Labor Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}