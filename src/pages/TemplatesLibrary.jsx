import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Star, Download } from "lucide-react";
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

export default function TemplatesLibrary() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const { data: templates, isLoading } = useQuery({
    queryKey: ['proposal-templates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      // Get both organization templates and public system templates
      const orgTemplates = await base44.entities.ProposalTemplate.filter(
        { organization_id: organization.id },
        '-created_date'
      );
      const systemTemplates = await base44.entities.ProposalTemplate.filter(
        { is_system_template: true, is_public: true },
        '-created_date'
      );
      return [...orgTemplates, ...systemTemplates];
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const filteredTemplates = templates.filter(t => 
    t.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeColor = (type) => {
    const colors = {
      agency_specific: "bg-blue-100 text-blue-800",
      contract_type: "bg-green-100 text-green-800",
      industry: "bg-purple-100 text-purple-800",
      general: "bg-slate-100 text-slate-800"
    };
    return colors[type] || colors.general;
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Templates Library</h1>
        <p className="text-slate-600">Browse and use proposal templates</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Found</h3>
            <p className="text-slate-600">
              {searchQuery ? 'Try adjusting your search' : 'Templates will appear here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base mb-2 line-clamp-2">
                      {template.template_name}
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={getTypeColor(template.template_type)}>
                        {template.template_type?.replace('_', ' ')}
                      </Badge>
                      {template.is_system_template && (
                        <Badge variant="outline">System</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {template.description && (
                  <p className="text-sm text-slate-600 line-clamp-3">
                    {template.description}
                  </p>
                )}

                {template.agency_name && (
                  <div className="text-xs text-slate-500">
                    Agency: <span className="font-medium">{template.agency_name}</span>
                  </div>
                )}

                {template.sections && template.sections.length > 0 && (
                  <div className="text-xs text-slate-500">
                    {template.sections.length} sections included
                  </div>
                )}

                {template.usage_count > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Download className="w-3 h-3" />
                    <span>Used {template.usage_count} times</span>
                  </div>
                )}

                {template.average_win_rate && (
                  <div className="flex items-center gap-2 text-xs">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-slate-500">
                      {template.average_win_rate}% avg win rate
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <Button size="sm" className="w-full">
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}