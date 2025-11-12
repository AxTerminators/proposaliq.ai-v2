import React, { useEffect, useState } from "react";
import ClientDataCallPortal from "../components/datacall/ClientDataCallPortal";
import { Skeleton } from "@/components/ui/skeleton";

export default function DataCallPortal() {
  const [token, setToken] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const orgParam = urlParams.get('org');

    setToken(tokenParam);
    setOrganizationId(orgParam);
  }, []);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Skeleton className="h-96 w-full max-w-4xl" />
      </div>
    );
  }

  return <ClientDataCallPortal token={token} organizationId={organizationId} />;
}