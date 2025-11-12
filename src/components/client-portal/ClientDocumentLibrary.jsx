import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import moment from "moment";

/**
 * Client Document Library
 * View and download shared documents
 */
export default function ClientDocumentLibrary({ proposal, clientOrg }) {
  // Fetch shared documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['client-shared-docs', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      
      return base44.entities.SolicitationDocument.filter({
        proposal_id: proposal.id,
        shared_with_client: true
      }, '-created_date');
    },
    enabled: !!proposal?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-8 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No documents shared yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Shared Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-all"
            >
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {doc.file_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {doc.document_type.replace('_', ' ')}
                    </Badge>
                    {doc.file_size && (
                      <span className="text-xs text-slate-500">
                        {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    )}
                  </div>
                  {doc.client_downloaded && doc.client_download_date && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      Downloaded {moment(doc.client_download_date).fromNow()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {doc.client_can_download && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={async () => {
                        // Track download
                        if (!doc.client_downloaded) {
                          try {
                            await base44.entities.SolicitationDocument.update(doc.id, {
                              client_downloaded: true,
                              client_download_date: new Date().toISOString()
                            });
                          } catch (error) {
                            console.error('Error tracking download:', error);
                          }
                        }
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}