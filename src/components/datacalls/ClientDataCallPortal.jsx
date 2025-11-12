import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileQuestion,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Send,
  FileText,
  Calendar,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function ClientDataCallPortal({ token, dataCallRequestId }) {
  const queryClient = useQueryClient();
  const [uploadingItemId, setUploadingItemId] = useState(null);
  const [itemNotes, setItemNotes] = useState({});

  const { data: dataCallRequest, isLoading, error } = useQuery({
    queryKey: ['data-call-request', dataCallRequestId],
    queryFn: async () => {
      const requests = await base44.entities.DataCallRequest.filter({ id: dataCallRequestId });
      if (requests.length === 0) {
        throw new Error('Data call request not found');
      }
      
      const request = requests[0];
      
      // Validate token
      if (request.access_token !== token) {
        throw new Error('Invalid access token');
      }

      // Check expiration
      if (request.token_expires_at && new Date(request.token_expires_at) < new Date()) {
        throw new Error('Access token has expired');
      }

      // Track access
      await base44.entities.DataCallRequest.update(request.id, {
        portal_accessed_count: (request.portal_accessed_count || 0) + 1,
        last_portal_access: new Date().toISOString()
      });

      return request;
    },
    enabled: !!token && !!dataCallRequestId,
    retry: false
  });

  // Initialize notes from existing data
  useEffect(() => {
    if (dataCallRequest?.checklist_items) {
      const notes = {};
      dataCallRequest.checklist_items.forEach(item => {
        if (item.submitted_notes) {
          notes[item.id] = item.submitted_notes;
        }
      });
      setItemNotes(notes);
    }
  }, [dataCallRequest]);

  const handleFileUpload = async (itemId, file) => {
    if (!file) return;

    setUploadingItemId(itemId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Create ClientUploadedFile record
      const uploadedFile = await base44.entities.ClientUploadedFile.create({
        organization_id: dataCallRequest.client_organization_id || dataCallRequest.organization_id,
        proposal_id: dataCallRequest.proposal_id,
        consulting_firm_id: dataCallRequest.organization_id,
        data_call_request_id: dataCallRequest.id,
        data_call_item_id: itemId,
        file_name: file.name,
        file_url,
        file_size: file.size,
        file_type: file.type,
        file_category: "data_call_response",
        uploaded_by_email: dataCallRequest.assigned_to_email,
        uploaded_by_name: dataCallRequest.assigned_to_name
      });

      // Update checklist item with uploaded file
      const updatedItems = dataCallRequest.checklist_items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            uploaded_files: [...(item.uploaded_files || []), uploadedFile.id],
            status: 'completed',
            completed_date: new Date().toISOString(),
            completed_by: dataCallRequest.assigned_to_email
          };
        }
        return item;
      });

      await base44.entities.DataCallRequest.update(dataCallRequest.id, {
        checklist_items: updatedItems
      });

      queryClient.invalidateQueries({ queryKey: ['data-call-request'] });
      toast.success('File uploaded successfully!');
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleMarkAsNotApplicable = async (itemId) => {
    const updatedItems = dataCallRequest.checklist_items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          status: 'not_applicable',
          submitted_notes: itemNotes[itemId] || "",
          completed_date: new Date().toISOString(),
          completed_by: dataCallRequest.assigned_to_email
        };
      }
      return item;
    });

    try {
      await base44.entities.DataCallRequest.update(dataCallRequest.id, {
        checklist_items: updatedItems
      });

      queryClient.invalidateQueries({ queryKey: ['data-call-request'] });
      toast.success('Item marked as not applicable');
    } catch (error) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleSaveNotes = async (itemId) => {
    const updatedItems = dataCallRequest.checklist_items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          submitted_notes: itemNotes[itemId] || ""
        };
      }
      return item;
    });

    try {
      await base44.entities.DataCallRequest.update(dataCallRequest.id, {
        checklist_items: updatedItems
      });

      queryClient.invalidateQueries({ queryKey: ['data-call-request'] });
      toast.success('Notes saved');
    } catch (error) {
      toast.error('Failed to save notes: ' + error.message);
    }
  };

  const handleSubmitDataCall = async () => {
    const requiredItems = dataCallRequest.checklist_items.filter(item => item.is_required);
    const completedRequiredItems = requiredItems.filter(item => 
      item.status === 'completed' || item.status === 'not_applicable'
    );

    if (completedRequiredItems.length < requiredItems.length) {
      toast.error('Please complete all required items before submitting');
      return;
    }

    try {
      await base44.entities.DataCallRequest.update(dataCallRequest.id, {
        overall_status: 'completed',
        completed_date: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['data-call-request'] });
      toast.success('✅ Data call submitted successfully! Thank you.');
    } catch (error) {
      toast.error('Submission failed: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-lg text-slate-700">Loading data call request...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md border-2 border-red-300">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-700">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedItems = dataCallRequest.checklist_items.filter(item => 
    item.status === 'completed' || item.status === 'not_applicable'
  ).length;
  const totalItems = dataCallRequest.checklist_items.length;
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const allRequiredCompleted = dataCallRequest.checklist_items
    .filter(item => item.is_required)
    .every(item => item.status === 'completed' || item.status === 'not_applicable');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  {dataCallRequest.request_title}
                </CardTitle>
                <p className="text-blue-100 text-sm">
                  Requested by {dataCallRequest.created_by_name || dataCallRequest.created_by_email}
                </p>
              </div>
              <Badge className={
                dataCallRequest.overall_status === 'completed' ? 'bg-green-600' :
                dataCallRequest.overall_status === 'overdue' ? 'bg-red-600' :
                'bg-amber-600'
              }>
                {dataCallRequest.overall_status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {dataCallRequest.request_description && (
              <p className="text-slate-700">{dataCallRequest.request_description}</p>
            )}

            <div className="grid md:grid-cols-3 gap-4">
              {dataCallRequest.due_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-slate-500">Due Date</p>
                    <p className="font-semibold text-slate-900">
                      {moment(dataCallRequest.due_date).format('MMM D, YYYY')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-slate-500">Progress</p>
                  <p className="font-semibold text-slate-900">
                    {completedItems} of {totalItems} items
                  </p>
                </div>
              </div>

              {dataCallRequest.priority && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-slate-500">Priority</p>
                    <Badge className="capitalize">{dataCallRequest.priority}</Badge>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-xs text-slate-500 mt-2 text-center">
                {Math.round(progressPercentage)}% Complete
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Items */}
        <div className="space-y-4">
          {dataCallRequest.checklist_items.map((item, index) => (
            <Card key={item.id} className={`border-2 ${
              item.status === 'completed' ? 'border-green-300 bg-green-50' :
              item.status === 'not_applicable' ? 'border-slate-300 bg-slate-50' :
              item.is_required ? 'border-amber-300' : 'border-slate-200'
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.status === 'completed' ? 'bg-green-600 text-white' :
                      item.status === 'not_applicable' ? 'bg-slate-400 text-white' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span className="font-semibold">{index + 1}</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {item.item_label}
                        {item.is_required && (
                          <Badge className="ml-2 bg-amber-600">Required</Badge>
                        )}
                      </CardTitle>
                      {item.item_description && (
                        <p className="text-sm text-slate-600">{item.item_description}</p>
                      )}
                    </div>
                  </div>

                  <Badge variant={
                    item.status === 'completed' ? 'default' :
                    item.status === 'not_applicable' ? 'secondary' :
                    'outline'
                  } className={
                    item.status === 'completed' ? 'bg-green-600' :
                    item.status === 'not_applicable' ? 'bg-slate-400' : ''
                  }>
                    {item.status === 'pending' ? 'Pending' :
                     item.status === 'in_progress' ? 'In Progress' :
                     item.status === 'completed' ? 'Completed' :
                     'Not Applicable'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {item.status !== 'completed' && item.status !== 'not_applicable' && (
                  <>
                    {/* File Upload */}
                    <div>
                      <Label>Upload Document</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(item.id, file);
                            }
                          }}
                          disabled={uploadingItemId === item.id}
                          className="flex-1"
                        />
                        {uploadingItemId === item.id && (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={itemNotes[item.id] || ""}
                        onChange={(e) => setItemNotes({
                          ...itemNotes,
                          [item.id]: e.target.value
                        })}
                        placeholder="Add any context or notes about this item..."
                        rows={2}
                      />
                      {itemNotes[item.id] !== (item.submitted_notes || "") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveNotes(item.id)}
                          className="mt-2"
                        >
                          Save Notes
                        </Button>
                      )}
                    </div>

                    {/* Mark as N/A */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsNotApplicable(item.id)}
                      className="w-full"
                    >
                      Mark as Not Applicable
                    </Button>
                  </>
                )}

                {/* Show uploaded files */}
                {item.uploaded_files?.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-green-900 mb-2">
                      ✓ {item.uploaded_files.length} file(s) uploaded
                    </p>
                    {item.completed_date && (
                      <p className="text-xs text-green-700">
                        Completed {moment(item.completed_date).fromNow()}
                      </p>
                    )}
                  </div>
                )}

                {item.status === 'not_applicable' && item.submitted_notes && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-sm text-slate-700">
                      <strong>Note:</strong> {item.submitted_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit Button */}
        {dataCallRequest.overall_status !== 'completed' && (
          <Card className="border-2 border-blue-300 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Ready to Submit?</h3>
                  <p className="text-sm text-slate-600">
                    {allRequiredCompleted ? (
                      <span className="text-green-700">✓ All required items completed</span>
                    ) : (
                      <span className="text-amber-700">⚠️ Some required items are still pending</span>
                    )}
                  </p>
                </div>

                <Button
                  onClick={handleSubmitDataCall}
                  disabled={!allRequiredCompleted}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Data Call
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {dataCallRequest.overall_status === 'completed' && (
          <Card className="border-2 border-green-300 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600" />
              <h3 className="font-semibold text-green-900 text-xl mb-2">
                Data Call Submitted!
              </h3>
              <p className="text-green-700">
                Thank you for providing the requested information. The consulting team has been notified.
              </p>
              {dataCallRequest.completed_date && (
                <p className="text-sm text-green-600 mt-2">
                  Submitted {moment(dataCallRequest.completed_date).format('MMM D, YYYY [at] h:mm A')}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}