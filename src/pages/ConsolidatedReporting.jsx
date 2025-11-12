import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BarChart3, TrendingUp } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import ConsolidatedClientReporting from "../components/clients/ConsolidatedClientReporting";
import GlobalResourceLibrary from "../components/clients/GlobalResourceLibrary";
import ResourceUsageAnalytics from "../components/clients/ResourceUsageAnalytics";

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

export default function ConsolidatedReporting() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);

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

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  const isConsultingFirm = organization.organization_type === 'consulting_firm' || 
                           organization.organization_type === 'consultancy' ||
                           (organization.organization_type === 'demo' && organization.demo_view_mode === 'consultancy');

  if (!isConsultingFirm) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Feature Not Available
            </h3>
            <p className="text-slate-600">
              Portfolio dashboard is only available for consulting firms managing multiple clients.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            Portfolio Dashboard
          </h1>
          <p className="text-slate-600">
            Consolidated analytics and insights across all client workspaces
          </p>
        </div>
        <Badge className="bg-purple-100 text-purple-700 text-sm px-4 py-2">
          Consulting Firm View
        </Badge>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Client Analytics
          </TabsTrigger>
          <TabsTrigger value="resources">
            <TrendingUp className="w-4 h-4 mr-2" />
            Resource Distribution
          </TabsTrigger>
          <TabsTrigger value="usage">
            <TrendingUp className="w-4 h-4 mr-2" />
            Resource Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <ConsolidatedClientReporting consultingFirm={organization} />
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <GlobalResourceLibrary consultingFirm={organization} />
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <ResourceUsageAnalytics consultingFirm={organization} />
        </TabsContent>
      </Tabs>
    </div>
  );
}