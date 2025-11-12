import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Send,
  AlertCircle,
  Building2
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import moment from "moment";

export default function ClientDataCallPortal({ token, organizationId }) {
  const queryClient = useQueryClient();
  const [dataCallRequest, setDataCallRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState({});
  const [submitterNotes, setSubmitterNotes] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadDataCallRequest();
    checkAuthentication();
  }, [token, organizationId]);

  const checkAuthentication = async () => {
    try {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  const loadDataCallRequest = async () => {
    try {
      setIsLoading(true);
      const response = await base44.functions.invoke('getDataCallRequest', {
        token,
        organization_id: organizationId
      });

      if (!response.data.success) {
        setError(response.data.error);
        return;
      }

      setDataCallRequest(response.data.data_call_request);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFileMutation = useMutation({
    mutationFn: async ({ itemId, file }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const response = await base44.functions.invoke('submitDataCallItem', {
        data_call_request_id: dataCallRequest.id,
        item_id: itemId,
        file_url,
        file_name: file.name,
        file_size: file.size,
        submitted_by_email: dataCallRequest.assigned_to_email,
        token
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-call-request', token] });
      loadDataCallRequest();
      toast.success('File uploaded successfully!');
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
    }
  });

  const submitCompleteMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('completeDataCallSubmission', {
        data_call_request_id: dataCallRequest.id,
        submitter_notes: submitterNotes,
        token
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Data call submitted successfully! The consultant will be notified.');
      loadDataCallRequest();
    },
    onError: (error) => {
      toast.error('Submission failed: ' + error.message);
    }
  });

  const handleFileUpload = async (itemId, files) => {
    if (!files || files.length === 0) return;

    setUploading({ ...uploading, [itemId]: true });
    try {
      for (const file of Array.from(files)) {
        await uploadFileMutation.mutateAsync({ itemId, file });
      }
    } finally {
      setUploading({ ...uploading, [itemId]: false });
    }
  };

  const handleSubmitComplete = () => {
    const requiredItems = dataCallRequest.checklist_items.filter(item => item.is_required);
    const submittedRequired = requiredItems.filter(item => item.submitted);

    if (submittedRequired.length < requiredItems.length) {
      toast.error('Please complete all required items before submitting');
      return;
    }

    submitCompleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-4xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Access Error</h3>
            <p className="text-slate-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completionPercentage = dataCallRequest?.completion_percentage || 0;
  const isCompleted = dataCallRequest?.status === 'submitted' || dataCallRequest?.status === 'completed';
  const isInternal = dataCallRequest?.recipient_type === 'internal_team_member' && isAuthenticated;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  {isInternal ? '📋 Internal Data Request' : '🔒 Secure Data Submission Portal'}
                </CardTitle>
                <p className="text-blue-100">
                  {dataCallRequest?.request_title}
                </p>
              </div>
              <Badge className={`${
                isCompleted ? 'bg-green-500' :
                completionPercentage > 50 ? 'bg-amber-500' :
                'bg-slate-500'
              } text-white text-lg px-4 py-2`}>
                {Math.round(completionPercentage)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Progress value={completionPercentage} className="h-3" />
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-slate-500">Due Date</p>
                  <p className="font-semibold">
                    {dataCallRequest?.due_date 
                      ? moment(dataCallRequest.due_date).format('MMM D, YYYY')
                      : 'No deadline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-slate-500">Items</p>
                  <p className="font-semibold">
                    {dataCallRequest?.checklist_items?.filter(i => i.submitted).length || 0} / {dataCallRequest?.checklist_items?.length || 0} Complete
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-slate-500">Status</p>
                  <Badge className={
                    isCompleted ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }>
                    {isCompleted ? 'Submitted' : 'In Progress'}
                  </Badge>
                </div>
              </div>
            </div>

            {dataCallRequest?.request_description && (
              <div className="pt-4 border-t">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {dataCallRequest.request_description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checklist Items */}
        <div className="space-y-4">
          {dataCallRequest?.checklist_items?.map((item, idx) => (
            <Card key={item.id} className={`border-2 ${
              item.submitted ? 'border-green-300 bg-green-50' : 'border-slate-200'
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {item.submitted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                      )}
                      {item.item_name}
                      {item.is_required && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                    </CardTitle>
                    {item.description && (
                      <p className="text-sm text-slate-600 mt-2">{item.description}</p>
                    )}
                    {item.file_type_hint && (
                      <p className="text-xs text-slate-500 mt-1">
                        Suggested format: {item.file_type_hint}
                      </p>
                    )}
                  </div>

                  {!isCompleted && (
                    <div>
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload(item.id, e.target.files)}
                        disabled={uploading[item.id]}
                        className="hidden"
                        id={`upload-${item.id}`}
                      />
                      <label htmlFor={`upload-${item.id}`}>
                        <Button
                          type="button"
                          size="sm"
                          variant={item.submitted ? "outline" : "default"}
                          disabled={uploading[item.id]}
                          asChild
                        >
                          <span>
                            {uploading[item.id] ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                {item.submitted ? 'Replace' : 'Upload'}
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              </CardHeader>

              {item.submitted && item.submitted_file_ids?.length > 0 && (
                <CardContent className="pt-0">
                  <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                    <p className="text-sm text-green-900 font-semibold mb-2">
                      ✓ Files Uploaded:
                    </p>
                    <p className="text-xs text-green-800">
                      {item.submitted_file_ids.length} file(s) • Submitted {moment(item.submitted_date).fromNow()}
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Submission Notes */}
        {!isCompleted && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={submitterNotes}
                onChange={(e) => setSubmitterNotes(e.target.value)}
                placeholder="Any additional context or notes about the submitted documents..."
                rows={4}
              />
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        {!isCompleted && (
          <Card className="border-2 border-blue-300 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">Ready to submit?</h4>
                  <p className="text-sm text-slate-600">
                    {dataCallRequest?.checklist_items?.filter(i => i.is_required && !i.submitted).length || 0} required items remaining
                  </p>
                </div>
                <Button
                  onClick={handleSubmitComplete}
                  disabled={submitCompleteMutation.isPending || completionPercentage < 100}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  size="lg"
                >
                  {submitCompleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Submit Data Call
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed State */}
        {isCompleted && (
          <Card className="border-2 border-green-300 bg-green-50">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-900 mb-2">
                ✅ Data Call Submitted
              </h3>
              <p className="text-green-700">
                Thank you! Your submission has been received.
                {isInternal ? ' Your team ' : ' The consultant '}
                has been notified and will review the documents shortly.
              </p>
              {dataCallRequest?.submitted_date && (
                <p className="text-sm text-green-600 mt-3">
                  Submitted: {moment(dataCallRequest.submitted_date).format('MMM D, YYYY h:mm A')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-slate-500">
          🔒 Secure Portal • All uploads are encrypted and stored securely
        </div>
      </div>
    </div>
  );
}