import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";

export default function ExcelExporter({ 
  proposalId,
  estimateData,
  organization
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [includeOptions, setIncludeOptions] = useState({
    summary: true,
    laborRates: true,
    odcBreakdown: true,
    multiYear: true,
    aiAnalysis: true,
    sensitivity: true
  });

  const exportToCSV = () => {
    setExporting(true);
    
    try {
      let csvContent = "";
      
      // Header
      csvContent += "Pricing Data Export\n";
      csvContent += "Generated: " + new Date().toLocaleString() + "\n";
      if (estimateData?.estimate_name) {
        csvContent += "Estimate: " + estimateData.estimate_name + "\n";
      }
      if (organization?.organization_name) {
        csvContent += "Organization: " + organization.organization_name + "\n";
      }
      csvContent += "\n";

      // Summary
      if (includeOptions.summary && estimateData) {
        csvContent += "PRICING SUMMARY\n";
        csvContent += "Metric,Value\n";
        if (estimateData.grand_total) {
          csvContent += "Total Price,$" + estimateData.grand_total.toLocaleString() + "\n";
        }
        if (estimateData.total_labor) {
          csvContent += "Total Labor,$" + estimateData.total_labor.toLocaleString() + "\n";
        }
        if (estimateData.total_odc) {
          csvContent += "Total ODC,$" + estimateData.total_odc.toLocaleString() + "\n";
        }
        if (estimateData.fee_percentage) {
          csvContent += "Fee Percentage," + estimateData.fee_percentage + "%\n";
        }
        if (estimateData.fee_amount) {
          csvContent += "Fee Amount,$" + estimateData.fee_amount.toLocaleString() + "\n";
        }
        csvContent += "\n";
      }

      // Labor Rates
      if (includeOptions.laborRates && estimateData?.labor_categories && estimateData.labor_categories.length > 0) {
        csvContent += "LABOR CATEGORIES\n";
        csvContent += "Category,Hours,Rate,Total\n";
        estimateData.labor_categories.forEach(cat => {
          const total = (cat.hours || 0) * (cat.rate || 0);
          csvContent += '"' + (cat.name || 'N/A') + '",' + (cat.hours || 0) + ',$' + (cat.rate || 0) + ',$' + total.toLocaleString() + '\n';
        });
        csvContent += "\n";
      }

      // ODC Breakdown
      if (includeOptions.odcBreakdown && estimateData?.odc_items && estimateData.odc_items.length > 0) {
        csvContent += "OTHER DIRECT COSTS (ODC)\n";
        csvContent += "Item,Quantity,Unit Cost,Total\n";
        estimateData.odc_items.forEach(item => {
          const total = (item.quantity || 0) * (item.cost || 0);
          csvContent += '"' + (item.name || 'N/A') + '",' + (item.quantity || 0) + ',$' + (item.cost || 0) + ',$' + total.toLocaleString() + '\n';
        });
        csvContent += "\n";
      }

      // Multi-Year Projection
      if (includeOptions.multiYear && estimateData?.multi_year_projection) {
        csvContent += "MULTI-YEAR PROJECTION\n";
        csvContent += "Year,Value\n";
        const proj = estimateData.multi_year_projection;
        if (Array.isArray(proj)) {
          proj.forEach((value, idx) => {
            const yearLabel = idx === 0 ? "Base Year" : `Option Year ${idx}`;
            csvContent += yearLabel + ',$' + (value || 0).toLocaleString() + '\n';
          });
        }
        csvContent += "\n";
      }

      // AI Analysis
      if (includeOptions.aiAnalysis && estimateData?.ai_analysis) {
        csvContent += "AI ANALYSIS\n";
        const ai = estimateData.ai_analysis;
        if (ai.win_probability) {
          csvContent += "Win Probability," + ai.win_probability + "%\n";
        }
        if (ai.competitive_position) {
          csvContent += "Competitive Position," + ai.competitive_position + "\n";
        }
        if (ai.optimal_fee_percentage) {
          csvContent += "Optimal Fee," + ai.optimal_fee_percentage + "%\n";
        }
        csvContent += "\n";
      }

      // Sensitivity Analysis
      if (includeOptions.sensitivity && estimateData?.sensitivity_analysis) {
        csvContent += "SENSITIVITY ANALYSIS\n";
        csvContent += "Scenario,New Total,Change,Percent Change\n";
        estimateData.sensitivity_analysis.forEach(result => {
          csvContent += '"' + result.name + '",$' + (result.total || 0).toLocaleString() + ',$' + (result.delta || 0).toLocaleString() + ',' + (result.percentChange || 0).toFixed(2) + '%\n';
        });
        csvContent += "\n";
      }

      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const filename = (estimateData?.estimate_name || 'cost_estimate').replace(/[^a-z0-9]/gi, '_') + '_' + new Date().toISOString().split('T')[0] + '.csv';
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowDialog(false);
    } catch (error) {
      console.error("Error exporting:", error);
      alert("Error exporting data");
    }
    
    setExporting(false);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setShowDialog(true)}>
        <Download className="w-4 h-4 mr-2" />
        Export to Excel
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Export Pricing Data
            </DialogTitle>
            <DialogDescription>
              Select the data you want to include in the export
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="summary"
                  checked={includeOptions.summary}
                  onCheckedChange={(checked) => setIncludeOptions({...includeOptions, summary: checked})}
                />
                <Label htmlFor="summary" className="cursor-pointer">
                  Pricing Summary
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="laborRates"
                  checked={includeOptions.laborRates}
                  onCheckedChange={(checked) => setIncludeOptions({...includeOptions, laborRates: checked})}
                />
                <Label htmlFor="laborRates" className="cursor-pointer">
                  Labor Categories
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="odcBreakdown"
                  checked={includeOptions.odcBreakdown}
                  onCheckedChange={(checked) => setIncludeOptions({...includeOptions, odcBreakdown: checked})}
                />
                <Label htmlFor="odcBreakdown" className="cursor-pointer">
                  ODC Items
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="multiYear"
                  checked={includeOptions.multiYear}
                  onCheckedChange={(checked) => setIncludeOptions({...includeOptions, multiYear: checked})}
                />
                <Label htmlFor="multiYear" className="cursor-pointer">
                  Multi-Year Projection
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="aiAnalysis"
                  checked={includeOptions.aiAnalysis}
                  onCheckedChange={(checked) => setIncludeOptions({...includeOptions, aiAnalysis: checked})}
                />
                <Label htmlFor="aiAnalysis" className="cursor-pointer">
                  AI Analysis Results
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="sensitivity"
                  checked={includeOptions.sensitivity}
                  onCheckedChange={(checked) => setIncludeOptions({...includeOptions, sensitivity: checked})}
                />
                <Label htmlFor="sensitivity" className="cursor-pointer">
                  Sensitivity Analysis
                </Label>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                Data will be exported in CSV format (Excel compatible)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={exportToCSV} disabled={exporting}>
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}