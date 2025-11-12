import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2, BarChart3, CheckCircle2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const REPORT_TEMPLATES = [
  {
    id: 'monthly_summary',
    name: 'Monthly Summary Report',
    description: 'Overview of all client activity for the month',
    includes: ['proposals_created', 'proposals_won', 'revenue', 'win_rate', 'health_scores']
  },
  {
    id: 'quarterly_review',
    name: 'Quarterly Performance Review',
    description: 'Detailed quarterly analysis with trends',
    includes: ['all_metrics', 'trends', 'forecasts', 'recommendations']
  },
  {
    id: 'client_health',
    name: 'Client Health Scorecard',
    description: 'Health scores and risk assessment for all clients',
    includes: ['health_scores', 'engagement_metrics', 'churn_risk', 'recommendations']
  },
  {
    id: 'revenue_report',
    name: 'Revenue & Pipeline Report',
    description: 'Financial overview across all clients',
    includes: ['total_revenue', 'pipeline_value', 'win_rates', 'contract_values']
  },
  {
    id: 'custom',
    name: 'Custom Report',
    description: 'Select specific clients and metrics',
    includes: ['customizable']
  }
];

/**
 * Multi-Client Report Builder
 * Generate comprehensive reports across multiple clients
 */
export default function MultiClientReportBuilder({ consultingFirm, trigger }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('monthly_summary');
  const [selectedClients, setSelectedClients] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: moment().startOf('month').format('YYYY-MM-DD'),
    end: moment().endOf('month').format('YYYY-MM-DD')
  });

  // Fetch all client organizations
  const { data: clientOrgs = [] } = useQuery({
    queryKey: ['report-clients', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.Organization.filter({
        organization_type: 'client_organization',
        parent_organization_id: consultingFirm.id,
        is_archived: false
      }, 'organization_name');
    },
    enabled: !!consultingFirm?.id,
  });

  const handleGenerateReport = async () => {
    if (selectedClients.length === 0) {
      toast.error('Please select at least one client');
      return;
    }

    setIsGenerating(true);

    try {
      // Fetch all data for selected clients
      const reportData = {
        template: selectedTemplate,
        date_range: dateRange,
        clients: []
      };

      for (const clientId of selectedClients) {
        const client = clientOrgs.find(c => c.id === clientId);
        const proposals = await base44.entities.Proposal.filter({
          organization_id: clientId
        });

        const periodProposals = proposals.filter(p =>
          moment(p.created_date).isBetween(dateRange.start, dateRange.end, null, '[]')
        );

        const healthScores = await base44.entities.ClientHealthScore.filter(
          { client_id: clientId },
          '-calculated_date',
          1
        );

        reportData.clients.push({
          name: client.organization_name,
          proposals_total: proposals.length,
          proposals_in_period: periodProposals.length,
          proposals_won: periodProposals.filter(p => p.status === 'won').length,
          total_value: periodProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0),
          health_score: healthScores[0]?.overall_score || null,
          churn_risk: healthScores[0]?.churn_risk || 'unknown'
        });
      }

      // For now, show the data in a simple format
      // In production, this would call a backend function to generate PDF/Excel
      console.log('Report Data:', reportData);
      toast.success('Report generated! (Download feature coming soon)');
      
    } catch (error) {
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAllClients = () => {
    setSelectedClients(clientOrgs.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedClients([]);
  };

  const currentTemplate = REPORT_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <>
      {trigger ? (
        React.cloneElement(trigger, { onClick: () => setShowDialog(true) })
      ) : (
        <Button onClick={() => setShowDialog(true)} variant="outline">
          <BarChart3 className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Multi-Client Report Builder
            </DialogTitle>
            <DialogDescription>
              Generate comprehensive reports across your client portfolio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Report Template Selection */}
            <div>
              <Label>Report Template</Label>
              <div className="grid md:grid-cols-2 gap-3 mt-2">
                {REPORT_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all",
                      selectedTemplate === template.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    )}
                  >
                    <p className="font-semibold text-slate-900 text-sm mb-1">
                      {template.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Client Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Select Clients ({selectedClients.length} selected)</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllClients}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAll}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                {clientOrgs.map(client => (
                  <div
                    key={client.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      selectedClients.includes(client.id)
                        ? "bg-blue-50 border-blue-300"
                        : "hover:bg-slate-50"
                    )}
                    onClick={() => toggleClientSelection(client.id)}
                  >
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => toggleClientSelection(client.id)}
                    />
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-slate-900 text-sm">
                      {client.organization_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* What's Included */}
            {currentTemplate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-2">This report will include:</p>
                <ul className="space-y-1 text-sm text-blue-800">
                  {currentTemplate.includes.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      {item.replace('_', ' ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={selectedClients.length === 0 || isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}