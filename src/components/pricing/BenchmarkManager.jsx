import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Database, TrendingUp, Globe, Edit, Trash2, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BenchmarkManager({ organization }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState(null);
  const [importingFromAI, setImportingFromAI] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    benchmark_type: 'industry_average',
    data_source: 'user_input',
    labor_category: '',
    average_hourly_rate: 0,
    median_hourly_rate: 0,
    naics_code: '',
    agency_name: '',
    contract_type: 'FFP',
    average_fee_percentage: 0,
    sample_size: 1,
    confidence_score: 75
  });

  const { data: benchmarks = [], isLoading } = useQuery({
    queryKey: ['pricing-benchmarks', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.PricingBenchmark.filter(
        { organization_id: organization.id },
        '-last_updated',
        50
      );
    },
    enabled: !!organization?.id
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PricingBenchmark.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-benchmarks'] });
      resetForm();
      setShowAddDialog(false);
      alert('✓ Benchmark added successfully!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PricingBenchmark.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-benchmarks'] });
      resetForm();
      setEditingBenchmark(null);
      setShowAddDialog(false);
      alert('✓ Benchmark updated successfully!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PricingBenchmark.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-benchmarks'] });
      alert('✓ Benchmark deleted successfully!');
    }
  });

  const resetForm = () => {
    setFormData({
      benchmark_type: 'industry_average',
      data_source: 'user_input',
      labor_category: '',
      average_hourly_rate: 0,
      median_hourly_rate: 0,
      naics_code: '',
      agency_name: '',
      contract_type: 'FFP',
      average_fee_percentage: 0,
      sample_size: 1,
      confidence_score: 75
    });
  };

  const handleSubmit = () => {
    const submitData = {
      ...formData,
      organization_id: organization.id,
      last_updated: new Date().toISOString()
    };

    if (editingBenchmark) {
      updateMutation.mutate({ id: editingBenchmark.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (benchmark) => {
    setFormData(benchmark);
    setEditingBenchmark(benchmark);
    setShowAddDialog(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this benchmark?')) {
      deleteMutation.mutate(id);
    }
  };

  const importAIBenchmarks = async () => {
    setImportingFromAI(true);
    try {
      const prompt = `Generate realistic government contracting labor rate benchmarks for common positions.

Return a JSON array of 10-15 labor category benchmarks with this structure:
[
  {
    "labor_category": "Senior Software Engineer",
    "average_hourly_rate": 125,
    "median_hourly_rate": 120,
    "rate_range": {
      "min": 95,
      "percentile_25": 110,
      "percentile_75": 135,
      "max": 160
    },
    "typical_burden_rates": {
      "fringe": 35,
      "overhead": 45,
      "ga": 8
    },
    "sample_size": 150,
    "confidence_score": 85
  }
]

Include variety: IT roles, PM roles, engineering, administrative, executive positions.
Use realistic government contracting rates for 2024-2025.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            benchmarks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  labor_category: { type: "string" },
                  average_hourly_rate: { type: "number" },
                  median_hourly_rate: { type: "number" },
                  rate_range: { type: "object" },
                  typical_burden_rates: { type: "object" },
                  sample_size: { type: "number" },
                  confidence_score: { type: "number" }
                }
              }
            }
          }
        }
      });

      // Create benchmarks
      for (const benchmark of result.benchmarks) {
        await base44.entities.PricingBenchmark.create({
          organization_id: organization.id,
          benchmark_type: 'industry_average',
          data_source: 'ai_aggregated',
          labor_category: benchmark.labor_category,
          average_hourly_rate: benchmark.average_hourly_rate,
          median_hourly_rate: benchmark.median_hourly_rate,
          rate_range: benchmark.rate_range,
          typical_burden_rates: benchmark.typical_burden_rates,
          sample_size: benchmark.sample_size,
          confidence_score: benchmark.confidence_score,
          last_updated: new Date().toISOString()
        });
      }

      queryClient.invalidateQueries({ queryKey: ['pricing-benchmarks'] });
      alert(`✓ Imported ${result.benchmarks.length} AI-generated benchmarks!`);
    } catch (error) {
      console.error("Error importing benchmarks:", error);
      alert("Error importing benchmarks. Please try again.");
    } finally {
      setImportingFromAI(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Benchmark Data Management
              </CardTitle>
              <CardDescription>
                Maintain industry benchmarks for competitive pricing intelligence
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={importAIBenchmarks}
                disabled={importingFromAI}
                className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200"
              >
                {importingFromAI ? (
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                )}
                Import AI Benchmarks
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Benchmark
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {benchmarks.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600 mb-4">No benchmark data yet</p>
              <Button onClick={importAIBenchmarks} disabled={importingFromAI}>
                <Sparkles className="w-4 h-4 mr-2" />
                Import AI Benchmarks to Get Started
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {benchmarks.map((benchmark) => (
                <div key={benchmark.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-slate-900">
                        {benchmark.labor_category || benchmark.naics_code || benchmark.agency_name}
                      </p>
                      <Badge variant="outline" className="capitalize text-xs">
                        {benchmark.benchmark_type.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {benchmark.data_source.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-slate-600">
                      {benchmark.average_hourly_rate && (
                        <span>Avg Rate: ${benchmark.average_hourly_rate}/hr</span>
                      )}
                      {benchmark.median_hourly_rate && (
                        <span>Median: ${benchmark.median_hourly_rate}/hr</span>
                      )}
                      {benchmark.average_fee_percentage && (
                        <span>Avg Fee: {benchmark.average_fee_percentage}%</span>
                      )}
                      {benchmark.sample_size && (
                        <span>Sample: {benchmark.sample_size}</span>
                      )}
                      {benchmark.confidence_score && (
                        <span className={
                          benchmark.confidence_score >= 80 ? 'text-green-600' :
                          benchmark.confidence_score >= 60 ? 'text-amber-600' :
                          'text-red-600'
                        }>
                          Confidence: {benchmark.confidence_score}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(benchmark)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(benchmark.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          resetForm();
          setEditingBenchmark(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBenchmark ? 'Edit' : 'Add'} Benchmark Data</DialogTitle>
            <DialogDescription>
              Add pricing benchmark data to improve your competitive intelligence
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Benchmark Type</Label>
                <Select 
                  value={formData.benchmark_type} 
                  onValueChange={(v) => setFormData({ ...formData, benchmark_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="industry_average">Industry Average</SelectItem>
                    <SelectItem value="agency_specific">Agency Specific</SelectItem>
                    <SelectItem value="naics_specific">NAICS Specific</SelectItem>
                    <SelectItem value="contract_type">Contract Type</SelectItem>
                    <SelectItem value="geographic">Geographic</SelectItem>
                    <SelectItem value="user_submitted">User Submitted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Source</Label>
                <Select 
                  value={formData.data_source} 
                  onValueChange={(v) => setFormData({ ...formData, data_source: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sam_gov">SAM.gov</SelectItem>
                    <SelectItem value="fpds">FPDS</SelectItem>
                    <SelectItem value="usaspending">USASpending.gov</SelectItem>
                    <SelectItem value="govwin">GovWin</SelectItem>
                    <SelectItem value="bloomberg_gov">Bloomberg Gov</SelectItem>
                    <SelectItem value="user_input">User Input</SelectItem>
                    <SelectItem value="ai_aggregated">AI Aggregated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Labor Category</Label>
              <Input
                placeholder="e.g., Senior Software Engineer"
                value={formData.labor_category}
                onChange={(e) => setFormData({ ...formData, labor_category: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Average Hourly Rate ($)</Label>
                <Input
                  type="number"
                  value={formData.average_hourly_rate}
                  onChange={(e) => setFormData({ ...formData, average_hourly_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Median Hourly Rate ($)</Label>
                <Input
                  type="number"
                  value={formData.median_hourly_rate}
                  onChange={(e) => setFormData({ ...formData, median_hourly_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NAICS Code (Optional)</Label>
                <Input
                  placeholder="e.g., 541512"
                  value={formData.naics_code}
                  onChange={(e) => setFormData({ ...formData, naics_code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Agency (Optional)</Label>
                <Input
                  placeholder="e.g., Department of Defense"
                  value={formData.agency_name}
                  onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contract Type</Label>
                <Select 
                  value={formData.contract_type} 
                  onValueChange={(v) => setFormData({ ...formData, contract_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FFP">FFP</SelectItem>
                    <SelectItem value="T&M">T&M</SelectItem>
                    <SelectItem value="CPFF">CPFF</SelectItem>
                    <SelectItem value="CPAF">CPAF</SelectItem>
                    <SelectItem value="IDIQ">IDIQ</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Avg Fee % (Optional)</Label>
                <Input
                  type="number"
                  value={formData.average_fee_percentage}
                  onChange={(e) => setFormData({ ...formData, average_fee_percentage: parseFloat(e.target.value) || 0 })}
                  step="0.1"
                />
              </div>

              <div className="space-y-2">
                <Label>Sample Size</Label>
                <Input
                  type="number"
                  value={formData.sample_size}
                  onChange={(e) => setFormData({ ...formData, sample_size: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Confidence Score (0-100)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.confidence_score}
                onChange={(e) => setFormData({ ...formData, confidence_score: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-slate-500">How confident are you in this data?</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              resetForm();
              setEditingBenchmark(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.labor_category || !formData.average_hourly_rate}
            >
              {editingBenchmark ? 'Update' : 'Add'} Benchmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}