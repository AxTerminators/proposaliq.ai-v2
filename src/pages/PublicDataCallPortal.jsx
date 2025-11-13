import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  FileText,
  Calendar,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

// CRITICAL: Get function base URL from environment
const getFunctionUrl = (functionName) => {
  // Use the current origin to build function URLs
  const origin = window.location.origin;
  return `${origin}/api/functions/${functionName}`;
};

export default function PublicDataCallPortal() {
  const [dataCallRequest, setDataCallRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingItemId, setUploadingItemId] = useState(null);
  const [itemNotes, setItemNotes] = useState({});
  const [token, setToken] = useState(null);
  const [dataCallRequestId, setDataCallRequestId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlId = urlParams.get('id');

    console.log('[PublicDataCallPortal] URL params:', { urlToken, urlId });

    if (!urlToken || !urlId) {
      setError('Invalid access link. Please use the link provided in your email.');
      setIsLoading(false);
      return;
    }

    setToken(urlToken);
    setDataCallRequestId(urlId);
    loadDataCall(urlToken, urlId);
  }, []);

  const loadDataCall = async (accessToken, requestId) => {
    try {
      setIsLoading(true);
      console.log('[PublicDataCallPortal] Validating token...', { accessToken, requestId });
      
      // CRITICAL: Use direct fetch instead of base44.functions.invoke to avoid auth
      const response = await fetch(getFunctionUrl('validateDataCallToken'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: accessToken,
          data_call_id: requestId
        })
      });

      const result = await response.json();
      console.log('[PublicDataCallPortal] Validation response:', result);

      if (!result.success) {
        throw new Error(result.error);
      }

      const dataCall = result.data_call;
      setDataCallRequest(dataCall);

      // Initialize notes
      const notes = {};
      dataCall.checklist_items?.forEach(item => {
        if (item.submitted_notes) {
          notes[item.id] = item.submitted_notes;
        }
      });
      setItemNotes(notes);
      setError(null);
    } catch (err) {
      console.error('[PublicDataCallPortal] Load error:', err);
      setError(err.message || 'Failed to load data call request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (itemId, file) => {
    if (!file) return;

    setUploadingItemId(itemId);
    try {
      // Use FormData for file upload with direct fetch
      const formData = new FormData();
      formData.append('token', token);
      formData.append('data_call_id', dataCallRequestId);
      formData.append('item_id', itemId);
      formData.append('file', file);

      const response = await fetch(getFunctionUrl('uploadDataCallFile'), {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result?.success) {
        throw new Error(result?.error || 'Upload failed');
      }

      // Reload data call to get updated state
      await loadDataCall(token, dataCallRequestId);
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('[PublicDataCallPortal] Upload error:', error);
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
      const response = await fetch(getFunctionUrl('updateDataCallItem'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          data_call_id: dataCallRequestId,
          checklist_items: updatedItems
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      await loadDataCall(token, dataCallRequestId);
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
      const response = await fetch(getFunctionUrl('updateDataCallItem'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          data_call_id: dataCallRequestId,
          checklist_items: updatedItems
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      await loadDataCall(token, dataCallRequestId);
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
      const response = await fetch(getFunctionUrl('updateDataCallItem'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          data_call_id: dataCallRequestId,
          checklist_items: dataCallRequest.checklist_items,
          mark_completed: true
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      await loadDataCall(token, dataCallRequestId);
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
            <p className="text-slate-700 mb-4">{error}</p>
            <div className="text-xs text-slate-500 bg-slate-50 rounded p-3 mt-4">
              <p className="font-semibold mb-1">Troubleshooting:</p>
              <p>• Make sure you're using the link from your email</p>
              <p>• Check that the link hasn't expired</p>
              <p>• Contact the sender if you continue having issues</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dataCallRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md border-2 border-red-300">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Not Found</h2>
            <p className="text-slate-700">Data call request not found.</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ProposalIQ.ai Branding Header */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ProposalIQ.ai</h1>
            <p className="text-xs text-slate-500">Secure Data Call Portal</p>
          </div>
        </div>

        {/* Header */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl md:text-2xl mb-2">
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
          <CardContent className="p-4 md:p-6 space-y-4">
            {dataCallRequest.request_description && (
              <p className="text-slate-700 text-sm md:text-base">{dataCallRequest.request_description}</p>
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
              <CardHeader className="p-4 md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.status === 'completed' ? 'bg-green-600 text-white' :
                      item.status === 'not_applicable' ? 'bg-slate-400 text-white' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span className="font-semibold text-sm">{index + 1}</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <CardTitle className="text-base md:text-lg mb-2">
                        {item.item_label}
                        {item.is_required && (
                          <Badge className="ml-2 bg-amber-600 text-xs">Required</Badge>
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

              <CardContent className="p-4 md:p-6 pt-0 space-y-4">
                {item.status !== 'completed' && item.status !== 'not_applicable' && (
                  <>
                    {/* File Upload */}
                    <div>
                      <Label className="text-sm">Upload Document</Label>
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
                      <Label className="text-sm">Notes (Optional)</Label>
                      <Textarea
                        value={itemNotes[item.id] || ""}
                        onChange={(e) => setItemNotes({
                          ...itemNotes,
                          [item.id]: e.target.value
                        })}
                        placeholder="Add any context or notes about this item..."
                        rows={2}
                        className="text-sm"
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
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
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
                  className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto"
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