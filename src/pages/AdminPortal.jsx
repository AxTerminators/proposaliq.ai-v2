import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, CreditCard, FileText, Brain, Lock, Activity, BarChart3 } from "lucide-react";

export default function AdminPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (err) {
        console.error("Error loading user:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">You don't have permission to access the Admin Portal.</p>
        </div>
      </div>
    );
  }

  // Admin modules available
  const modules = [
    { id: "subscribers", label: "Subscribers", icon: Users, description: "Manage user accounts and roles" },
    { id: "billing", label: "Billing", icon: CreditCard, description: "Manage subscriptions and payments" },
    { id: "content", label: "Content Library", icon: FileText, description: "Manage templates and resources" },
    { id: "ai", label: "AI Configuration", icon: Brain, description: "Configure AI models" },
    { id: "security", label: "Security", icon: Lock, description: "Security settings" },
    { id: "audit", label: "Audit Logs", icon: Shield, description: "View audit trail" },
    { id: "health", label: "System Health", icon: Activity, description: "Monitor performance" },
    { id: "reports", label: "Reports", icon: BarChart3, description: "Analytics and reporting" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-red-600" />
                Admin Portal
              </h1>
              <p className="text-slate-600 mt-1">System administration and configuration</p>
            </div>
            <Badge className="bg-red-100 text-red-700">
              <Shield className="w-3 h-3 mr-1" />
              {currentUser.admin_role || "Admin"}
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.id} className="border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                <div className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{module.label}</h3>
                  <p className="text-sm text-slate-600">{module.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="border-none shadow-xl p-6 mt-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Your Account</h2>
          <div className="space-y-2">
            <p className="text-slate-600">Name: {currentUser.full_name}</p>
            <p className="text-slate-600">Email: {currentUser.email}</p>
            <p className="text-slate-600">Role: {currentUser.role}</p>
            <p className="text-slate-600">Admin Role: {currentUser.admin_role || "Not assigned (using default permissions)"}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}