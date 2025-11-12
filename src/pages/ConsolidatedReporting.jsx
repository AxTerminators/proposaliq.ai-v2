import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Building2,
  TrendingUp,
  Users,
  Loader2,
  Download,
  Calendar,
  FileText
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ConsolidatedClientReporting from "../components/clients/ConsolidatedClientReporting";
import GlobalResourceLibrary from "../components/clients/GlobalResourceLibrary";

async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = user.active_client_id;
  if (!orgId && user.client_accesses?.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  }
  if (!orgId) {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) orgId = orgs[0].id;
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) return orgs[0];
  }
  return null;
}

/**
 * Consolidated Reporting Page
 * Aggregated view across all client workspaces for consulting firm
 */
export default function ConsolidatedReporting() {
  const [user, setUser] = useState(null);
  const [consultingFirm, setConsultingFirm] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setConsultingFirm(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  if (!consultingFirm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  const isConsultingFirm = consultingFirm.organization_type === 'consulting_firm' || 
                           consultingFirm.organization_type === 'consultancy';

  if (!isConsultingFirm) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Feature Not Available
            </h3>
            <p className="text-slate-600">
              Consolidated reporting is only available for consulting firms managing multiple client workspaces.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Portfolio Dashboard
          </h1>
          <p className="text-slate-600">
            Aggregated insights across all your client workspaces
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="resources">
            <FileText className="w-4 h-4 mr-2" />
            Resource Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <ConsolidatedClientReporting consultingFirm={consultingFirm} />
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <GlobalResourceLibrary consultingFirm={consultingFirm} />
        </TabsContent>
      </Tabs>
    </div>
  );
}