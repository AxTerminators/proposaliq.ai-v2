// ... keep existing code (imports) ...
import TimeTrackingPanel from "../components/consultant/TimeTrackingPanel";
import CrossClientResourceAnalytics from "../components/consultant/CrossClientResourceAnalytics";
import MultiClientReportBuilder from "../components/consultant/MultiClientReportBuilder";

export default function ConsultantDashboard() {
  // ... keep existing code (state, useEffect, all queries, metrics, calculations) ...

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            Consultant Dashboard
          </h1>
          <p className="text-slate-600">
            Overview of all client engagements and active work
          </p>
        </div>
        <div className="flex gap-2">
          <MultiClientReportBuilder
            consultingFirm={consultingFirm}
            trigger={
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            }
          />
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("ClientOrganizationManager"))}
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Clients
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("ConsolidatedReporting"))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Full Analytics
          </Button>
        </div>
      </div>

      {/* ... keep existing code (key metrics cards, charts row) ... */}

      {/* ... keep existing code (active client engagements and sidebar) ... */}

      {/* Resource Analytics */}
      <CrossClientResourceAnalytics consultingFirm={consultingFirm} />

      {/* ... keep existing code (at-risk clients alert) ... */}
    </div>
  );
}