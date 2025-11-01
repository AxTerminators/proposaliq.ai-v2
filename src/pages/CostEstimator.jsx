import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Plus, Trash2, Calculator } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function CostEstimator() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [laborCategories, setLaborCategories] = useState([
    { name: "", hours: 0, rate: 0 }
  ]);
  const [odcItems, setOdcItems] = useState([
    { name: "", quantity: 0, cost: 0 }
  ]);
  const [feePercentage, setFeePercentage] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const addLaborCategory = () => {
    setLaborCategories([...laborCategories, { name: "", hours: 0, rate: 0 }]);
  };

  const removeLaborCategory = (index) => {
    setLaborCategories(laborCategories.filter((_, i) => i !== index));
  };

  const updateLaborCategory = (index, field, value) => {
    const updated = [...laborCategories];
    updated[index][field] = value;
    setLaborCategories(updated);
  };

  const addOdcItem = () => {
    setOdcItems([...odcItems, { name: "", quantity: 0, cost: 0 }]);
  };

  const removeOdcItem = (index) => {
    setOdcItems(odcItems.filter((_, i) => i !== index));
  };

  const updateOdcItem = (index, field, value) => {
    const updated = [...odcItems];
    updated[index][field] = value;
    setOdcItems(updated);
  };

  const calculateTotalLabor = () => {
    return laborCategories.reduce((sum, cat) => sum + (cat.hours * cat.rate), 0);
  };

  const calculateTotalOdc = () => {
    return odcItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
  };

  const calculateSubtotal = () => {
    return calculateTotalLabor() + calculateTotalOdc();
  };

  const calculateFee = () => {
    return calculateSubtotal() * (feePercentage / 100);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateFee();
  };

  if (!organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Cost Estimator</h1>
        <p className="text-slate-600">Quick cost estimation tool for proposals</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Labor Categories */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Labor Categories</CardTitle>
                <Button size="sm" onClick={addLaborCategory}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {laborCategories.map((cat, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    placeholder="Category name"
                    value={cat.name}
                    onChange={(e) => updateLaborCategory(idx, 'name', e.target.value)}
                    className="col-span-5"
                  />
                  <Input
                    type="number"
                    placeholder="Hours"
                    value={cat.hours || ''}
                    onChange={(e) => updateLaborCategory(idx, 'hours', parseFloat(e.target.value) || 0)}
                    className="col-span-3"
                  />
                  <Input
                    type="number"
                    placeholder="Rate"
                    value={cat.rate || ''}
                    onChange={(e) => updateLaborCategory(idx, 'rate', parseFloat(e.target.value) || 0)}
                    className="col-span-3"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLaborCategory(idx)}
                    disabled={laborCategories.length === 1}
                    className="col-span-1"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-900">Total Labor</span>
                  <span className="text-lg font-bold text-slate-900">
                    ${calculateTotalLabor().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>ODC Items</CardTitle>
                <Button size="sm" onClick={addOdcItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {odcItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateOdcItem(idx, 'name', e.target.value)}
                    className="col-span-5"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity || ''}
                    onChange={(e) => updateOdcItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="col-span-3"
                  />
                  <Input
                    type="number"
                    placeholder="Cost"
                    value={item.cost || ''}
                    onChange={(e) => updateOdcItem(idx, 'cost', parseFloat(e.target.value) || 0)}
                    className="col-span-3"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOdcItem(idx)}
                    disabled={odcItems.length === 1}
                    className="col-span-1"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-900">Total ODC</span>
                  <span className="text-lg font-bold text-slate-900">
                    ${calculateTotalOdc().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Cost Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Labor</span>
                  <span className="font-semibold text-slate-900">
                    ${calculateTotalLabor().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">ODC</span>
                  <span className="font-semibold text-slate-900">
                    ${calculateTotalOdc().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-900">Subtotal</span>
                    <span className="font-bold text-slate-900">
                      ${calculateSubtotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-slate-300">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600">Fee %</span>
                    <Input
                      type="number"
                      value={feePercentage}
                      onChange={(e) => setFeePercentage(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Fee Amount</span>
                    <span className="font-semibold text-slate-900">
                      ${calculateFee().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-900">Grand Total</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${calculateGrandTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Quick Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Hours</span>
                <span className="font-medium text-slate-900">
                  {laborCategories.reduce((sum, cat) => sum + cat.hours, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Avg Hourly Rate</span>
                <span className="font-medium text-slate-900">
                  ${(calculateTotalLabor() / (laborCategories.reduce((sum, cat) => sum + cat.hours, 0) || 1)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Labor %</span>
                <span className="font-medium text-slate-900">
                  {((calculateTotalLabor() / calculateSubtotal()) * 100 || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">ODC %</span>
                <span className="font-medium text-slate-900">
                  {((calculateTotalOdc() / calculateSubtotal()) * 100 || 0).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}