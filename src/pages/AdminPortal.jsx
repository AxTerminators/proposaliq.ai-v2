import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function AdminPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("AdminPortal mounted");
    const loadUser = async () => {
      try {
        console.log("Fetching user...");
        const user = await base44.auth.me();
        console.log("User fetched:", user);
        setCurrentUser(user);
      } catch (err) {
        console.error("Error loading user:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  console.log("Rendering - loading:", loading, "currentUser:", currentUser, "error:", error);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-red-600">Error</h1>
          <p className="text-slate-600 mt-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">No User</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900">Admin Portal</h1>
        <div className="mt-4 space-y-2">
          <p className="text-slate-600">User: {currentUser.full_name}</p>
          <p className="text-slate-600">Email: {currentUser.email}</p>
          <p className="text-slate-600">Role: {currentUser.role}</p>
          <p className="text-slate-600">Admin Role: {currentUser.admin_role || "Not assigned"}</p>
        </div>
      </div>
    </div>
  );
}