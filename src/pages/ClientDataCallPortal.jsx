import React, { useEffect } from "react";
import ClientDataCallPortal from "../components/datacalls/ClientDataCallPortal";

export default function ClientDataCallPortalPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const dataCallRequestId = urlParams.get('id');

  if (!token || !dataCallRequestId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white rounded-xl shadow-lg p-12 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Invalid Access</h2>
          <p className="text-slate-600">
            This page requires a valid access token. Please use the link provided in your email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClientDataCallPortal 
      token={token}
      dataCallRequestId={dataCallRequestId}
    />
  );
}