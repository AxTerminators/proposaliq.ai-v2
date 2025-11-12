import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Database,
  Eye,
  Lock,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Data Isolation Test Page
 * Verify that data is properly isolated between organizations
 */
export default function DataIsolationTest() {
  const [user, setUser] = useState(null);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      let orgId = currentUser.active_client_id;
      if (!orgId && currentUser.client_accesses?.length > 0) {
        orgId = currentUser.client_accesses[0].organization_id;
      }
      if (orgId) {
        const orgs = await base44.entities.Organization.filter({ id: orgId });
        if (orgs.length > 0) {
          setCurrentOrg(orgs[0]);
        }
      }
    };
    loadData();
  }, []);

  const runIsolationTests = async () => {
    setIsTesting(true);
    const results = [];

    try {
      // Test 1: Proposals
      const proposals = await base44.entities.Proposal.list();
      const proposalsInOrg = proposals.filter(p => p.organization_id === currentOrg.id);
      results.push({
        entity: 'Proposals',
        total: proposals.length,
        inOrg: proposalsInOrg.length,
        isolated: proposals.length === proposalsInOrg.length,
        severity: proposals.length === proposalsInOrg.length ? 'success' : 'critical'
      });

      // Test 2: Kanban Boards
      const boards = await base44.entities.KanbanConfig.list();
      const boardsInOrg = boards.filter(b => b.organization_id === currentOrg.id);
      results.push({
        entity: 'Kanban Boards',
        total: boards.length,
        inOrg: boardsInOrg.length,
        isolated: boards.length === boardsInOrg.length,
        severity: boards.length === boardsInOrg.length ? 'success' : 'critical'
      });

      // Test 3: Tasks
      const tasks = await base44.entities.ProposalTask.list();
      const tasksInOrg = proposals.length > 0
        ? tasks.filter(t => t.proposal_id && proposalsInOrg.some(p => p.id === t.proposal_id))
        : [];
      results.push({
        entity: 'Tasks',
        total: tasks.length,
        inOrg: tasksInOrg.length,
        isolated: tasks.length === tasksInOrg.length || tasks.length === 0,
        severity: tasks.length === tasksInOrg.length || tasks.length === 0 ? 'success' : 'warning'
      });

      // Test 4: Calendar Events
      const events = await base44.entities.CalendarEvent.list();
      const eventsInOrg = events.filter(e => e.organization_id === currentOrg.id);
      results.push({
        entity: 'Calendar Events',
        total: events.length,
        inOrg: eventsInOrg.length,
        isolated: events.length === eventsInOrg.length,
        severity: events.length === eventsInOrg.length ? 'success' : 'critical'
      });

      // Test 5: Discussions
      const discussions = await base44.entities.Discussion.list();
      const discussionsInOrg = discussions.filter(d => d.organization_id === currentOrg.id);
      results.push({
        entity: 'Discussions',
        total: discussions.length,
        inOrg: discussionsInOrg.length,
        isolated: discussions.length === discussionsInOrg.length,
        severity: discussions.length === discussionsInOrg.length ? 'success' : 'warning'
      });

      // Test 6: Resources
      const resources = await base44.entities.ProposalResource.list();
      const resourcesInOrg = resources.filter(r => r.organization_id === currentOrg.id);
      results.push({
        entity: 'Resources',
        total: resources.length,
        inOrg: resourcesInOrg.length,
        isolated: resources.length === resourcesInOrg.length,
        severity: resources.length === resourcesInOrg.length ? 'success' : 'critical'
      });

      // Test 7: Past Performance
      const pastPerf = await base44.entities.PastPerformance.list();
      const pastPerfInOrg = pastPerf.filter(p => p.organization_id === currentOrg.id);
      results.push({
        entity: 'Past Performance',
        total: pastPerf.length,
        inOrg: pastPerfInOrg.length,
        isolated: pastPerf.length === pastPerfInOrg.length,
        severity: pastPerf.length === pastPerfInOrg.length ? 'success' : 'critical'
      });

      // Test 8: Key Personnel
      const personnel = await base44.entities.KeyPersonnel.list();
      const personnelInOrg = personnel.filter(p => p.organization_id === currentOrg.id);
      results.push({
        entity: 'Key Personnel',
        total: personnel.length,
        inOrg: personnelInOrg.length,
        isolated: personnel.length === personnelInOrg.length,
        severity: personnel.length === personnelInOrg.length ? 'success' : 'critical'
      });

      // Test 9: Teaming Partners
      const partners = await base44.entities.TeamingPartner.list();
      const partnersInOrg = partners.filter(p => p.organization_id === currentOrg.id);
      results.push({
        entity: 'Teaming Partners',
        total: partners.length,
        inOrg: partnersInOrg.length,
        isolated: partners.length === partnersInOrg.length,
        severity: partners.length === partnersInOrg.length ? 'success' : 'critical'
      });

      setTestResults(results);
    } catch (error) {
      console.error('Test error:', error);
      alert('Error running tests: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const overallStatus = testResults.length > 0
    ? testResults.every(r => r.severity === 'success')
      ? 'success'
      : testResults.some(r => r.severity === 'critical')
        ? 'critical'
        : 'warning'
    : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Data Isolation Test
        </h1>
        <p className="text-slate-600">
          Verify that data is properly scoped to your current organization
        </p>
      </div>

      {/* Current Context */}
      <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle>Current Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-slate-600 mb-1">User</p>
            <p className="font-semibold text-slate-900">{user?.full_name || user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Active Organization</p>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-900">{currentOrg?.organization_name}</p>
              <Badge className={cn(
                currentOrg?.organization_type === 'consulting_firm' ? 'bg-purple-100 text-purple-700' :
                currentOrg?.organization_type === 'client_organization' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-700'
              )}>
                {currentOrg?.organization_type?.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Organization ID</p>
            <p className="font-mono text-sm text-slate-700">{currentOrg?.id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Run Tests */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Isolation Tests</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                These tests verify that all entities are properly filtered by organization_id
              </p>
            </div>
            <Button
              onClick={runIsolationTests}
              disabled={isTesting || !currentOrg}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Run Tests
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Eye className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>Click "Run Tests" to verify data isolation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Overall Status */}
              <div className={cn(
                "p-6 rounded-xl border-2 mb-6",
                overallStatus === 'success' ? 'bg-green-50 border-green-300' :
                overallStatus === 'critical' ? 'bg-red-50 border-red-300' :
                'bg-amber-50 border-amber-300'
              )}>
                <div className="flex items-center gap-3">
                  {overallStatus === 'success' ? (
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  )}
                  <div>
                    <p className="text-lg font-bold text-slate-900">
                      {overallStatus === 'success' 
                        ? '✅ All Tests Passed' 
                        : '⚠️ Isolation Issues Detected'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {overallStatus === 'success'
                        ? 'Data is properly isolated to your organization'
                        : 'Some entities are not properly filtered'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Individual Test Results */}
              {testResults.map((result, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-4 rounded-lg border-2 flex items-center justify-between",
                    result.severity === 'success' ? 'bg-green-50 border-green-200' :
                    result.severity === 'critical' ? 'bg-red-50 border-red-300' :
                    'bg-amber-50 border-amber-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {result.severity === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className={cn(
                        "w-5 h-5",
                        result.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                      )} />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{result.entity}</p>
                      <p className="text-sm text-slate-600">
                        {result.isolated 
                          ? `All ${result.total} records belong to this org` 
                          : `${result.total - result.inOrg} records from other orgs visible!`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{result.inOrg}/{result.total}</p>
                    <p className="text-xs text-slate-500">In this org</p>
                  </div>
                </div>
              ))}

              {/* Recommendations */}
              {overallStatus !== 'success' && (
                <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-300 rounded-xl">
                  <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Recommended Actions
                  </h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    {testResults.filter(r => !r.isolated).map((result, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="flex-shrink-0">•</span>
                        <span>
                          <strong>{result.entity}:</strong> Review queries to ensure organization_id filtering. 
                          Found {result.total - result.inOrg} records that don't belong to this organization.
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}