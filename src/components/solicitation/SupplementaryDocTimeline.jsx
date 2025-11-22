import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  FileStack,
  Calendar,
  GitBranch,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Timeline visualization of supplementary documents
 * Shows chronological view of base solicitation, amendments, Q&As, etc.
 */
export default function SupplementaryDocTimeline({ proposalId }) {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["solicitation-timeline", proposalId],
    queryFn: () =>
      base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
      }),
    enabled: !!proposalId,
  });

  // Sort by version_date or created_date
  const sortedDocs = React.useMemo(() => {
    return [...documents].sort((a, b) => {
      const dateA = new Date(a.version_date || a.created_date);
      const dateB = new Date(b.version_date || b.created_date);
      return dateA - dateB;
    });
  }, [documents]);

  // Group by parent relationships
  const documentTree = React.useMemo(() => {
    const tree = [];
    const docMap = new Map();

    // First pass: create map
    sortedDocs.forEach((doc) => {
      docMap.set(doc.id, { ...doc, children: [] });
    });

    // Second pass: build tree
    sortedDocs.forEach((doc) => {
      const node = docMap.get(doc.id);
      if (doc.parent_document_id) {
        const parent = docMap.get(doc.parent_document_id);
        if (parent) {
          parent.children.push(node);
        } else {
          tree.push(node);
        }
      } else {
        tree.push(node);
      }
    });

    return tree;
  }, [sortedDocs]);

  const getDocumentIcon = (doc) => {
    if (doc.is_supplementary) {
      if (doc.supplementary_type === "amendment") return AlertCircle;
      if (doc.supplementary_type === "q_a_response") return CheckCircle;
      return FileStack;
    }
    return FileText;
  };

  const getDocumentColor = (doc) => {
    if (doc.is_supplementary) {
      if (doc.supplementary_type === "amendment") return "text-red-600";
      if (doc.supplementary_type === "q_a_response") return "text-amber-600";
      if (doc.supplementary_type === "sow" || doc.supplementary_type === "pws")
        return "text-blue-600";
      return "text-purple-600";
    }
    return "text-slate-600";
  };

  const renderDocumentNode = (doc, depth = 0) => {
    const Icon = getDocumentIcon(doc);
    const colorClass = getDocumentColor(doc);
    const hasChildren = doc.children && doc.children.length > 0;

    return (
      <div key={doc.id} className="relative">
        {/* Timeline connector */}
        {depth > 0 && (
          <div className="absolute left-6 top-0 w-px h-full bg-slate-200" />
        )}

        <div className={cn("flex gap-4 py-3", depth > 0 && "ml-8")}>
          {/* Timeline dot */}
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                "w-12 h-12 rounded-full border-2 bg-white flex items-center justify-center",
                doc.is_latest_version
                  ? "border-green-500 shadow-lg"
                  : "border-slate-300"
              )}
            >
              <Icon className={cn("w-5 h-5", colorClass)} />
            </div>
            {hasChildren && (
              <div className="absolute left-1/2 -translate-x-1/2 top-12 w-px h-8 bg-slate-300" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-slate-900 truncate">
                  {doc.file_name}
                </h4>
                {doc.amendment_number && (
                  <Badge className="bg-red-100 text-red-700 border-red-300">
                    Amendment #{doc.amendment_number}
                  </Badge>
                )}
                {doc.is_latest_version && (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    Latest
                  </Badge>
                )}
                {doc.is_supplementary && (
                  <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                    {doc.supplementary_type?.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
            </div>

            {doc.description && (
              <p className="text-sm text-slate-600 mb-2">{doc.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-slate-500">
              {(doc.version_date || doc.created_date) && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(
                    new Date(doc.version_date || doc.created_date),
                    "MMM d, yyyy"
                  )}
                </div>
              )}
              {doc.parent_document_id && (
                <div className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  Linked to parent
                </div>
              )}
              {doc.rag_status && (
                <div className="flex items-center gap-1">
                  {doc.rag_status === "completed" && (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-green-600">RAG Ready</span>
                    </>
                  )}
                  {doc.rag_status === "processing" && (
                    <>
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span className="text-blue-600">Processing</span>
                    </>
                  )}
                  {doc.rag_status === "failed" && (
                    <>
                      <AlertCircle className="w-3 h-3 text-red-600" />
                      <span className="text-red-600">Failed</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Render children */}
        {hasChildren && (
          <div className="ml-4">
            {doc.children.map((child) => renderDocumentNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="w-5 h-5 animate-spin text-slate-400 mr-2" />
            <span className="text-slate-600">Loading timeline...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No solicitation documents uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Document Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-2">
            {documentTree.map((doc) => renderDocumentNode(doc))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}