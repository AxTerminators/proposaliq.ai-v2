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
  proposalData, 
  clins, 
  laborAllocations, 
  laborCategories,
  odcItems, 
  pricingStrategy,
  totalCost,
  totalPrice 
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [includeOptions, setIncludeOptions] = useState({
    summary: true,
    laborRates: true,
    clinDetails: true,
    laborAllocations: true,
    odcBreakdown: true,
    pricingStrategy: true,
    charts: false
  });

  const exportToCSV = () => {
    setExporting(true);
    
    try {
      let csvContent = "";
      
      // Header
      csvContent += `Pricing Data Export - ${proposalData.proposal_name}\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `Agency: ${proposalData.agency_name}\n`;
      csvContent += `Solicitation: ${proposalData.solicitation_number}\n\n`;

      // Summary
      if (includeOptions.summary) {
        csvContent += "PRICING SUMMARY\n";
        csvContent += "Metric,Value\n";
        csvContent += `Total Price,$${totalPrice.toLocaleString()}\n`;
        csvContent += `Total Cost,$${totalCost.toLocaleString()}\n`;
        csvContent += `Fee/Profit,$${(totalPrice - totalCost).toLocaleString()}\n`;
        csvContent += `Fee Percentage,${totalCost > 0 ? ((totalPrice - totalCost) / totalCost * 100).toFixed(2) : 0}%\n`;
        csvContent += `Number of CLINs,${clins.length}\n\n`;
      }

      // Labor Rates
      if (includeOptions.laborRates && laborCategories.length > 0) {
        csvContent += "LABOR RATES\n";
        csvContent += "Category,Level,Base Rate,Fringe %,OH %,G&A %,Loaded Rate,Annual Salary\n";
        laborCategories.forEach(cat => {
          csvContent += `"${cat.category_name}",${cat.labor_level},$${cat.base_hourly_rate},${cat.fringe_rate}%,${cat.overhead_rate}%,${cat.ga_rate}%,$${cat.loaded_hourly_rate},$${cat.annual_salary_equivalent}\n`;
        });
        csvContent += "\n";
      }

      // CLIN Details
      if (includeOptions.clinDetails && clins.length > 0) {
        csvContent += "CLIN BREAKDOWN\n";
        csvContent += "CLIN #,Title,Period,Labor Cost,ODC Cost,Total Cost,Fee %,Fee Amount,Total Price\n";
        clins.forEach(clin => {
          csvContent += `"${clin.clin_number}","${clin.clin_title}","${clin.period_of_performance}",$${clin.labor_cost || 0},$${clin.odc_cost || 0},$${clin.total_cost || 0},${clin.fee_percentage}%,$${clin.fee_amount || 0},$${clin.total_price || 0}\n`;
        });
        csvContent += "\n";
      }

      // Labor Allocations
      if (includeOptions.laborAllocations && laborAllocations.length > 0) {
        csvContent += "LABOR ALLOCATIONS\n";
        csvContent += "CLIN,Labor Category,Hours,Rate,Total Cost,FTE\n";
        laborAllocations.forEach(alloc => {
          const clin = clins.find(c => c.id === alloc.clin_id);
          csvContent += `"${clin?.clin_number || 'N/A'}","${alloc.labor_category_name}",${alloc.hours},$${alloc.hourly_rate},$${alloc.total_cost},${alloc.fte?.toFixed(2)}\n`;
        });
        csvContent += "\n";
      }

      // ODC Breakdown
      if (includeOptions.odcBreakdown && odcItems.length > 0) {
        csvContent += "OTHER DIRECT COSTS (ODC)\n";
        csvContent += "CLIN,Category,Item,Quantity,Unit Cost,Total Cost\n";
        odcItems.forEach(odc => {
          const clin = clins.find(c => c.id === odc.clin_id);
          csvContent += `"${clin?.clin_number || 'N/A}","${odc.odc_category}","${odc.item_name}",${odc.quantity},$${odc.unit_cost},$${odc.total_cost}\n`;
        });
        csvContent += "\n";
      }

      // Pricing Strategy
      if (includeOptions.pricingStrategy && pricingStrategy) {
        csvContent += "PRICING STRATEGY\n";
        csvContent += "Attribute,Value\n";
        csvContent += `Approach,"${pricingStrategy.pricing_approach?.replace(/_/g, ' ')}"\n`;
        csvContent += `Competitive Positioning,"${pricingStrategy.competitive_positioning}"\n`;
        if (pricingStrategy.price_to_win_analysis) {
          csvContent += `Recommended Price,$${pricingStrategy.price_to_win_analysis.recommended_price?.toLocaleString()}\n`;
          csvContent += `Win Probability,${pricingStrategy.win_probability_at_price}%\n`;
        }
        csvContent += "\n";
      }

      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${proposalData.proposal_name.replace(/[^a-z0-9]/gi, '_')}_pricing_${new Date().toISOString().split('T')[0]}.csv`);
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

  const exportToExcel = () => {
    // For now, CSV export is sufficient
    // In production, you'd use a library like xlsx or ExcelJS
    exportToCSV();
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
                  Labor Rate Table
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="clinDetails"
                  checked={includeOptions.clinDetails}
                  onCheckedChange={(checked) => setIncludeOptions({...includeOptions, clinDetails: checked})}
                />
                <Label htmlFor="clinDetails" className="cursor-pointer">
                  CLIN Breakdown
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="laborAllocations"
                  checked={includeOptions.laborAllocations}
                  onCheckedChange={(checked) => setIncludeOptions({...includeOptions, laborAllocations: checked})}
                />
                <Label htmlFor="laborAllocations" className="cursor-pointer">
                  Labor Allocations
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="odcBreakdown"
                  checked={includeOptions.odcBreakdown}
                  onCheckedChange={(checked) => setIncludeOptions({...includeOptions, odcBreakdown: checked})}
                />
                <Label htmlFor="odcBreakdown" className="cursor-pointer">
                  ODC Details
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="pricingStrategy"
                  checked={includeOptions.pricingStrategy}
                  onCheckedChange={(checked) => setIncludeOptions({...includeOptions, pricingStrategy: checked})}
                />
                <Label htmlFor="pricingStrategy" className="cursor-pointer">
                  Pricing Strategy
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
            <Button onClick={exportToExcel} disabled={exporting}>
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