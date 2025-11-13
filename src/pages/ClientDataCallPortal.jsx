import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle } from "lucide-react";
import ClientDataCallPortal from "../components/datacalls/ClientDataCallPortal";

export default function ClientDataCallPortalPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const dataCallRequestId = urlParams.get('id');

  const [validationState, setValidationState] = useState('loading'); // 'loading', 'valid', 'invalid', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [user, setUser] = useState(null);

  // Step 1: Check if user is authenticated
  // Step 2: Validate token against the logged-in user
  useEffect(() => {
    const validateAccess = async () => {
      // Missing parameters check
      if (!token || !dataCallRequestId) {
        setValidationState('invalid');
        setErrorMessage('This page requires a valid access token. Please use the link provided in your email.');
        return;
      }

      try {
        // Get the currently logged-in user
        const currentUser = await base44.auth.me();
        
        if (!currentUser) {
          // User is not authenticated - redirect to login with return URL
          console.log('[ClientDataCallPortal] User not authenticated, redirecting to login');
          base44.auth.redirectToLogin(window.location.href);
          return;
        }

        console.log('[ClientDataCallPortal] ✅ User authenticated:', currentUser.email);
        setUser(currentUser);

        // Validate the token using the backend function
        console.log('[ClientDataCallPortal] 🔐 Validating token...');
        const validationResponse = await base44.functions.invoke('validateDataCallToken', {
          token,
          data_call_id: dataCallRequestId
        });

        console.log('[ClientDataCallPortal] Validation response:', validationResponse.data);

        if (validationResponse.data?.valid) {
          // Check if the logged-in user is the assigned recipient
          const dataCall = validationResponse.data.data_call;
          
          if (dataCall.assigned_to_email === currentUser.email) {
            console.log('[ClientDataCallPortal] ✅ Token valid and user matches assigned recipient');
            setValidationState('valid');
          } else {
            console.log('[ClientDataCallPortal] ⚠️ Token valid but user does not match assigned recipient');
            setValidationState('invalid');
            setErrorMessage(`This data call is assigned to ${dataCall.assigned_to_email}. You are logged in as ${currentUser.email}. Please log in with the correct account.`);
          }
        } else {
          console.log('[ClientDataCallPortal] ❌ Invalid token');
          setValidationState('invalid');
          setErrorMessage(validationResponse.data?.message || 'Invalid or expired access token.');
        }

      } catch (error) {
        console.error('[ClientDataCallPortal] Error during validation:', error);
        setValidationState('error');
        setErrorMessage('An error occurred while validating your access. Please try again or contact support.');
      }
    };

    validateAccess();
  }, [token, dataCallRequestId]);

  // Loading state
  if (validationState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white rounded-xl shadow-lg p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Validating Access</h2>
          <p className="text-slate-600">
            Please wait while we verify your credentials...
          </p>
        </div>
      </div>
    );
  }

  // Invalid or error state
  if (validationState === 'invalid' || validationState === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white rounded-xl shadow-lg p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Denied</h2>
          <p className="text-slate-600 mb-6">
            {errorMessage}
          </p>
          {validationState === 'invalid' && errorMessage.includes('log in with the correct account') && (
            <button
              onClick={() => {
                base44.auth.logout(window.location.href);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Switch Account
            </button>
          )}
        </div>
      </div>
    );
  }

  // Valid state - render the actual portal
  return (
    <ClientDataCallPortal 
      token={token}
      dataCallRequestId={dataCallRequestId}
      user={user}
    />
  );
}