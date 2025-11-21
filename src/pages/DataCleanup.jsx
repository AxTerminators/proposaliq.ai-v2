import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, Shield } from 'lucide-react';

export default function DataCleanup() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleCleanup = async () => {
    setRunning(true);
    setResult(null);
    
    try {
      const response = await base44.functions.invoke('validateAndFixIconEmoji', {});
      setResult(response.data);
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              Database Cleanup - Fix Icon Emoji
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-900">
                  <p className="font-semibold mb-1">Admin Only</p>
                  <p>This tool will scan all templates and modal configs, delete corrupted records, and fix missing icon_emoji fields.</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleCleanup} 
              disabled={running}
              className="w-full"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Cleanup...
                </>
              ) : (
                'Run Database Cleanup'
              )}
            </Button>

            {result && (
              <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <CardContent className="p-4">
                  {result.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-800 font-semibold">
                        <CheckCircle className="w-5 h-5" />
                        Cleanup Completed Successfully
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>Templates fixed: {result.templates_fixed}</p>
                        <p>Templates deleted: {result.templates_deleted}</p>
                        <p>Modals fixed: {result.modals_fixed}</p>
                        <p>Modals deleted: {result.modals_deleted}</p>
                      </div>
                      {result.details && result.details.length > 0 && (
                        <div className="mt-3 p-2 bg-white rounded border border-green-200">
                          <p className="text-xs font-semibold text-green-800 mb-1">Details:</p>
                          <ul className="text-xs text-green-700 space-y-1">
                            {result.details.map((detail, idx) => (
                              <li key={idx}>• {detail}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-800 font-semibold">
                        <AlertCircle className="w-5 h-5" />
                        Error
                      </div>
                      <p className="text-sm text-red-700">{result.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}