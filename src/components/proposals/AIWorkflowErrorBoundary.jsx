import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { createPageUrl } from "@/utils";

/**
 * Error Boundary for AI Writing Workflow
 * 
 * Catches JavaScript errors anywhere in the AI writing workflow,
 * logs them, and displays a fallback UI with recovery options.
 */
class AIWorkflowErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AIWorkflowErrorBoundary] Caught error:', error);
    console.error('[AIWorkflowErrorBoundary] Error info:', errorInfo);

    // Log error to analytics or error tracking service
    this.logErrorToService(error, errorInfo);

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
  }

  logErrorToService = (error, errorInfo) => {
    // TODO: Integrate with error tracking service (e.g., Sentry)
    const errorData = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack
      },
      context: {
        proposalId: this.props.proposalId,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    console.log('[AIWorkflowErrorBoundary] Error logged:', errorData);

    // Store in localStorage for debugging
    try {
      const errors = JSON.parse(localStorage.getItem('ai_workflow_errors') || '[]');
      errors.push(errorData);
      // Keep only last 10 errors
      if (errors.length > 10) errors.shift();
      localStorage.setItem('ai_workflow_errors', JSON.stringify(errors));
    } catch (e) {
      console.error('[AIWorkflowErrorBoundary] Failed to store error:', e);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = createPageUrl('Dashboard');
  };

  handleReportBug = () => {
    window.location.href = createPageUrl('Feedback');
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;

      // If error keeps happening, suggest more drastic measures
      const isRepeatedError = errorCount > 2;

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-6 flex items-center justify-center">
          <Card className="max-w-3xl w-full border-2 border-red-300 shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-red-900 mb-2">
                    {isRepeatedError ? 'Persistent Error Detected' : 'AI Workflow Error'}
                  </h1>
                  <p className="text-red-700">
                    {isRepeatedError 
                      ? 'The AI writing workflow has encountered repeated errors. Your data is safe, but the feature may be temporarily unavailable.'
                      : 'An unexpected error occurred in the AI writing workflow. Don\'t worry - your proposal data is safe.'}
                  </p>
                </div>
              </div>

              <Alert className="mb-6 border-amber-300 bg-amber-50">
                <AlertTitle className="text-amber-900 font-semibold">
                  What happened?
                </AlertTitle>
                <AlertDescription className="text-amber-800 text-sm mt-2">
                  {error?.message || 'An unknown error occurred'}
                </AlertDescription>
              </Alert>

              {process.env.NODE_ENV === 'development' && errorInfo && (
                <details className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-300">
                  <summary className="cursor-pointer font-semibold text-slate-900 mb-2">
                    🔧 Developer Info (Click to expand)
                  </summary>
                  <div className="text-xs font-mono text-slate-700 space-y-2">
                    <div>
                      <strong>Error:</strong>
                      <pre className="mt-1 p-2 bg-white rounded overflow-x-auto">
                        {error?.stack}
                      </pre>
                    </div>
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 p-2 bg-white rounded overflow-x-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 mb-3">
                  What would you like to do?
                </h3>

                {!isRepeatedError && (
                  <Button
                    onClick={this.handleReset}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>
                )}

                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="w-full h-12 gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="w-full h-12 gap-2"
                >
                  <Home className="w-4 h-4" />
                  Return to Dashboard
                </Button>

                <Button
                  onClick={this.handleReportBug}
                  variant="outline"
                  className="w-full h-12 gap-2 border-purple-300 hover:bg-purple-50"
                >
                  <Bug className="w-4 h-4" />
                  Report This Issue
                </Button>
              </div>

              {isRepeatedError && (
                <Alert className="mt-6 border-purple-300 bg-purple-50">
                  <AlertTitle className="text-purple-900 font-semibold">
                    💡 Troubleshooting Tips
                  </AlertTitle>
                  <AlertDescription className="text-purple-800 text-sm mt-2">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Clear your browser cache and reload</li>
                      <li>Try using a different browser</li>
                      <li>Check your internet connection</li>
                      <li>Contact support if the issue persists</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AIWorkflowErrorBoundary;