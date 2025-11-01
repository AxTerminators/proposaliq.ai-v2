import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Clock, CheckCircle, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ExportDialog from "../components/export/ExportDialog";
import BatchExportDialog from "../components/export/BatchExportDialog";
import moment from "moment";

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

export default function ExportCenter() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);

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

  const { data: proposals, isLoading: loadingProposals } = useQuery({
    queryKey: ['proposals-export', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const { data: exportHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['export-history', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ExportHistory.filter(
        { organization_id: organization.id },
        '-created_date',
        20
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['export-templates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ExportTemplate.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.ExportHistory.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-history'] });
    },
  });

  const handleExportProposal = (proposal) => {
    setSelectedProposal(proposal);
    setShowExportDialog(true);
  };

  const getFormatBadge = (format) => {
    const formats = {
      pdf_html: { label: "PDF", color: "bg-red-100 text-red-800" },
      docx_markdown: { label: "DOCX", color: "bg-blue-100 text-blue-800" },
      excel_compliance: { label: "Excel", color: "bg-green-100 text-green-800" },
      html_package: { label: "HTML", color: "bg-purple-100 text-purple-800" },
      json_data: { label: "JSON", color: "bg-amber-100 text-amber-800" }
    };
    const formatInfo = formats[format] || { label: format, color: "bg-slate-100 text-slate-800" };
    return <Badge className={formatInfo.color}>{formatInfo.label}</Badge>;
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Export Center</h1>
          <p className="text-slate-600">Export proposals in various formats</p>
        </div>
        <Button onClick={() => setShowBatchDialog(true)}>
          <Download className="w-5 h-5 mr-2" />
          Batch Export
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Proposals to Export */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Available Proposals</h2>
          {loadingProposals ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : proposals.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Proposals to Export</h3>
                <p className="text-slate-600">Create some proposals first</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {proposals.map((proposal) => (
                <Card key={proposal.id} className="border-none shadow-md hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">{proposal.proposal_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          {proposal.agency_name && (
                            <span>{proposal.agency_name}</span>
                          )}
                          {proposal.solicitation_number && (
                            <>
                              <span>•</span>
                              <span>{proposal.solicitation_number}</span>
                            </>
                          )}
                          <span>•</span>
                          <Badge variant="secondary" className="capitalize text-xs">
                            {proposal.status}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleExportProposal(proposal)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Export History */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Recent Exports</h2>
          {loadingHistory ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : exportHistory.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600">No export history yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {exportHistory.map((history) => (
                <Card key={history.id} className="border-none shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {history.proposal_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {moment(history.created_date).fromNow()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          if (confirm('Delete this export record?')) {
                            deleteHistoryMutation.mutate(history.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {getFormatBadge(history.export_format)}
                      <span className="text-xs text-slate-500">
                        {(history.file_size_bytes / 1024).toFixed(0)} KB
                      </span>
                    </div>

                    {history.download_url && new Date(history.expires_at) > new Date() && (
                      <a
                        href={history.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center justify-center gap-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {showExportDialog && selectedProposal && (
        <ExportDialog
          proposal={selectedProposal}
          templates={templates}
          onClose={() => {
            setShowExportDialog(false);
            setSelectedProposal(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['export-history'] });
          }}
        />
      )}

      {showBatchDialog && (
        <BatchExportDialog
          proposals={proposals}
          templates={templates}
          onClose={() => setShowBatchDialog(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['export-history'] });
          }}
        />
      )}
    </div>
  );
}