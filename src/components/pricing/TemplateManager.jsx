import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Save, FileText, Plus, CheckCircle2, Download, Trash2, Sparkles } from "lucide-react";

export default function TemplateManager({ organizationId, proposalId, currentPricingData }) {
  const queryClient = useQueryClient();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    template_name: "",
    template_type: "custom",
    description: "",
    contract_type: "fixed_price",
    service_category: "IT_services",
    default_fee_percentage: 10.0,
    tags: []
  });

  const { data: templates } = useQuery({
    queryKey: ['pricing-templates', organizationId],
    queryFn: () => organizationId ? base44.entities.PricingTemplate.filter({ organization_id: organizationId }, '-usage_count') : [],
    initialData: [],
    enabled: !!organizationId
  });

  const { data: laborCategories } = useQuery({
    queryKey: ['labor-categories', organizationId],
    queryFn: () => organizationId ? base44.entities.LaborCategory.filter({ organization_id: organizationId }) : [],
    initialData: [],
    enabled: !!organizationId
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.PricingTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-templates'] });
      setShowSaveDialog(false);
      alert("✓ Template saved successfully!");
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.PricingTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-templates'] });
    }
  });

  const handleSaveAsTemplate = () => {
    if (!templateForm.template_name) {
      alert("Please provide a template name");
      return;
    }

    if (!currentPricingData || !currentPricingData.clins || currentPricingData.clins.length === 0) {
      alert("No pricing data to save. Please build CLINs first.");
      return;
    }

    // Extract current pricing structure
    const laborCats = laborCategories.map(cat => ({
      category_name: cat.category_name,
      labor_level: cat.labor_level,
      base_hourly_rate: cat.base_hourly_rate,
      fringe_rate: cat.fringe_rate,
      overhead_rate: cat.overhead_rate,
      ga_rate: cat.ga_rate,
      typical_hours: 2080 // Default to 1 FTE
    }));

    const clinStructure = currentPricingData.clins.map(clin => ({
      clin_number: clin.clin_number,
      clin_title: clin.clin_title,
      clin_type: clin.clin_type,
      description: `Template CLIN for ${clin.clin_type}`
    }));

    const templateData = {
      ...templateForm,
      organization_id: organizationId,
      labor_categories: laborCats,
      typical_clins: clinStructure,
      typical_odc_items: [],
      usage_count: 0
    };

    saveTemplateMutation.mutate(templateData);
  };

  const handleLoadTemplate = async (template) => {
    if (!proposalId) {
      alert("Please select a proposal first");
      return;
    }

    if (confirm(`Load template "${template.template_name}"? This will create CLINs and labor categories from the template.`)) {
      try {
        // Create labor categories if they don't exist
        for (const labCat of template.labor_categories || []) {
          const exists = laborCategories.find(lc => lc.category_name === labCat.category_name);
          if (!exists) {
            const loadedRate = labCat.base_hourly_rate * 
              (1 + labCat.fringe_rate / 100) * 
              (1 + labCat.overhead_rate / 100) * 
              (1 + labCat.ga_rate / 100);

            await base44.entities.LaborCategory.create({
              organization_id: organizationId,
              category_name: labCat.category_name,
              labor_level: labCat.labor_level,
              base_hourly_rate: labCat.base_hourly_rate,
              fringe_rate: labCat.fringe_rate,
              overhead_rate: labCat.overhead_rate,
              ga_rate: labCat.ga_rate,
              loaded_hourly_rate: parseFloat(loadedRate.toFixed(2)),
              annual_salary_equivalent: labCat.base_hourly_rate * 2080
            });
          }
        }

        // Create CLINs from template
        for (const clin of template.typical_clins || []) {
          await base44.entities.CLIN.create({
            proposal_id: proposalId,
            organization_id: organizationId,
            clin_number: clin.clin_number,
            clin_title: clin.clin_title,
            clin_type: clin.clin_type,
            period_of_performance: "Base Year",
            fee_percentage: template.default_fee_percentage || 10.0,
            total_cost: 0,
            total_price: 0
          });
        }

        // Update template usage count
        await base44.entities.PricingTemplate.update(template.id, {
          usage_count: (template.usage_count || 0) + 1,
          last_used_date: new Date().toISOString()
        });

        queryClient.invalidateQueries({ queryKey: ['clins'] });
        queryClient.invalidateQueries({ queryKey: ['labor-categories'] });
        setShowLoadDialog(false);
        alert("✓ Template loaded successfully! CLINs and labor categories have been created.");

      } catch (error) {
        console.error("Error loading template:", error);
        alert("Error loading template. Please try again.");
      }
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
          <Save className="w-4 h-4 mr-2" />
          Save as Template
        </Button>
        <Button variant="outline" onClick={() => setShowLoadDialog(true)}>
          <Download className="w-4 h-4 mr-2" />
          Load Template
        </Button>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-blue-600" />
              Save Pricing Template
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={templateForm.template_name}
                onChange={(e) => setTemplateForm({...templateForm, template_name: e.target.value})}
                placeholder="e.g., IT Services - T&M Standard"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Type</Label>
                <Select
                  value={templateForm.template_type}
                  onValueChange={(value) => setTemplateForm({...templateForm, template_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract_type">Contract Type</SelectItem>
                    <SelectItem value="agency_specific">Agency Specific</SelectItem>
                    <SelectItem value="service_offering">Service Offering</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contract Type</Label>
                <Select
                  value={templateForm.contract_type}
                  onValueChange={(value) => setTemplateForm({...templateForm, contract_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_price">Fixed Price</SelectItem>
                    <SelectItem value="time_and_materials">Time & Materials</SelectItem>
                    <SelectItem value="cost_plus">Cost Plus</SelectItem>
                    <SelectItem value="labor_hour">Labor Hour</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Category</Label>
                <Select
                  value={templateForm.service_category}
                  onValueChange={(value) => setTemplateForm({...templateForm, service_category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT_services">IT Services</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="R&D">R&D</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Default Fee %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={templateForm.default_fee_percentage}
                  onChange={(e) => setTemplateForm({...templateForm, default_fee_percentage: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={templateForm.description}
                onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                placeholder="Describe when to use this template..."
                className="h-20"
              />
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 mb-2">
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                Template will save:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-5">
                <li>• {laborCategories.length} labor categories with rates</li>
                <li>• {currentPricingData?.clins?.length || 0} CLIN structure(s)</li>
                <li>• Default fee percentage</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAsTemplate}>
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Load Pricing Template
            </DialogTitle>
          </DialogHeader>

          {templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">No templates saved yet</p>
              <p className="text-sm text-slate-500">
                Save your current pricing structure as a template for future use
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <Card key={template.id} className="border hover:border-blue-300 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">{template.template_name}</h4>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {template.template_type?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        
                        {template.description && (
                          <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="capitalize">
                            {template.contract_type?.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {template.service_category?.replace(/_/g, ' ')}
                          </Badge>
                          {template.labor_categories?.length > 0 && (
                            <Badge variant="outline">
                              {template.labor_categories.length} Labor Categories
                            </Badge>
                          )}
                          {template.typical_clins?.length > 0 && (
                            <Badge variant="outline">
                              {template.typical_clins.length} CLINs
                            </Badge>
                          )}
                          {template.usage_count > 0 && (
                            <Badge variant="outline" className="text-green-600">
                              Used {template.usage_count}x
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm"
                          onClick={() => handleLoadTemplate(template)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Load
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Delete this template?')) {
                              deleteTemplateMutation.mutate(template.id);
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
        </DialogContent>
      </Dialog>
    </>
  );
}