import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  CheckCircle2, 
  Clock, 
  Upload,
  FileText,
  MessageSquare,
  ArrowLeft
} from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";
import DragDropFileUpload from "./DragDropFileUpload";

/**
 * Mobile-optimized full-screen data call view
 * Optimized for touch interactions and smaller screens
 */
export default function MobileDataCallView({ 
  dataCallId, 
  isOpen, 
  onClose 
}) {
  const [expandedItem, setExpandedItem] = useState(null);

  const { data: dataCall, isLoading } = useQuery({
    queryKey: ['mobile-data-call', dataCallId],
    queryFn: async () => {
      if (!dataCallId) return null;
      const results = await base44.entities.DataCallRequest.filter({ id: dataCallId });
      return results[0] || null;
    },
    enabled: !!dataCallId && isOpen
  });

  const { data: uploadedFiles = [] } = useQuery({
    queryKey: ['mobile-data-call-files', dataCallId],
    queryFn: async () => {
      if (!dataCallId) return [];
      return base44.entities.ClientUploadedFile.filter({
        data_call_request_id: dataCallId
      });
    },
    enabled: !!dataCallId && isOpen
  });

  if (!isOpen) return null;

  const completedItems = dataCall?.checklist_items?.filter(item => 
    item.status === 'completed'
  ).length || 0;
  const totalItems = dataCall?.checklist_items?.length || 0;
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b z-10">
          <SheetHeader className="p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="min-w-[44px] min-h-[44px]"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <SheetTitle className="text-lg flex-1 line-clamp-2">
                {dataCall?.request_title || 'Data Call Request'}
              </SheetTitle>
            </div>

            {dataCall && (
              <div className="flex items-center gap-2 flex-wrap px-4">
                <Badge className={cn(
                  dataCall.overall_status === 'completed' ? 'bg-green-600' :
                  dataCall.overall_status === 'in_progress' ? 'bg-blue-600' :
                  'bg-slate-600'
                )}>
                  {dataCall.overall_status}
                </Badge>
                <Badge className={cn(
                  dataCall.priority === 'urgent' ? 'bg-red-500' :
                  dataCall.priority === 'high' ? 'bg-orange-500' :
                  'bg-slate-500'
                )}>
                  {dataCall.priority}
                </Badge>
              </div>
            )}
          </SheetHeader>

          {/* Progress Bar */}
          {dataCall && (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">
                  {completedItems} / {totalItems} completed
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : !dataCall ? (
          <div className="p-12 text-center">
            <p className="text-slate-600">Data call not found</p>
          </div>
        ) : (
          <div className="p-4 space-y-6 pb-24">
            {/* Description */}
            {dataCall.request_description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {dataCall.request_description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Key Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                {dataCall.due_date && (
                  <div className="flex items-center gap-3 min-h-[44px]">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500">Due Date</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {moment(dataCall.due_date).format('MMM D, YYYY')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 min-h-[44px]">
                  <Clock className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">Created</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {moment(dataCall.created_date).fromNow()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checklist Items - Accordion for mobile */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Checklist Items
              </h3>
              
              <Accordion type="single" collapsible className="space-y-3">
                {dataCall.checklist_items?.map((item, index) => {
                  const itemFiles = uploadedFiles.filter(f => f.data_call_item_id === item.id);
                  
                  return (
                    <AccordionItem key={item.id} value={item.id} className="border rounded-lg">
                      <AccordionTrigger className="px-4 hover:no-underline min-h-[60px]">
                        <div className="flex items-start gap-3 w-full">
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-slate-900 text-sm">
                              {index + 1}. {item.item_label}
                            </p>
                            {item.is_required && (
                              <Badge className="mt-1 bg-red-100 text-red-700 text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      
                      <AccordionContent className="px-4 pb-4 space-y-3">
                        {item.item_description && (
                          <p className="text-sm text-slate-600">
                            {item.item_description}
                          </p>
                        )}

                        {/* File Upload for this item */}
                        {item.status !== 'completed' && (
                          <DragDropFileUpload
                            dataCallId={dataCallId}
                            checklistItemId={item.id}
                            maxFiles={5}
                          />
                        )}

                        {/* Uploaded files */}
                        {itemFiles.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-700">
                              Uploaded Files:
                            </p>
                            {itemFiles.map(file => (
                              <div
                                key={file.id}
                                className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
                              >
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-slate-900 flex-1 truncate">
                                  {file.file_name}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {(file.file_size / 1024).toFixed(1)}KB
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}