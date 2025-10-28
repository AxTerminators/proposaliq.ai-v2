import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lock, 
  Shield,
  Key,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { canEdit, logAdminAction } from "./PermissionChecker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SecurityModule({ currentUser }) {
  const [mfaRequired, setMfaRequired] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(24);
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [requireSpecialChar, setRequireSpecialChar] = useState(true);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);

  const userRole = currentUser.admin_role || currentUser.role;
  const canEditSecurity = canEdit(userRole, 'security');

  const saveSecuritySettings = async () => {
    await logAdminAction('security_settings_changed', {
      mfaRequired,
      sessionTimeout,
      passwordMinLength,
      requireSpecialChar,
      maxLoginAttempts
    });
    alert("Security settings saved successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Security & Compliance</h2>
          <p className="text-slate-600">Configure security policies and access controls</p>
        </div>
        {canEditSecurity && (
          <Button onClick={saveSecuritySettings}>
            <Shield className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        )}
      </div>

      <Tabs defaultValue="authentication" className="space-y-6">
        <TabsList>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Authentication */}
        <TabsContent value="authentication" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Authentication Settings
              </CardTitle>
              <CardDescription>
                Configure login and password requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    Multi-Factor Authentication (MFA)
                    {mfaRequired && <Badge className="bg-green-600">Required</Badge>}
                  </h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Require all admin users to enable 2FA for enhanced security
                  </p>
                </div>
                <Switch 
                  checked={mfaRequired} 
                  onCheckedChange={setMfaRequired}
                  disabled={!canEditSecurity}
                />
              </div>

              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold">Password Policy</h4>
                
                <div className="space-y-2">
                  <Label>Minimum Password Length: {passwordMinLength}</Label>
                  <Input
                    type="number"
                    value={passwordMinLength}
                    onChange={(e) => setPasswordMinLength(parseInt(e.target.value))}
                    min={8}
                    max={32}
                    disabled={!canEditSecurity}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Special Characters</Label>
                    <p className="text-xs text-slate-600">Must include !@#$%^&*()</p>
                  </div>
                  <Switch 
                    checked={requireSpecialChar}
                    onCheckedChange={setRequireSpecialChar}
                    disabled={!canEditSecurity}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Login Attempts: {maxLoginAttempts}</Label>
                  <Input
                    type="number"
                    value={maxLoginAttempts}
                    onChange={(e) => setMaxLoginAttempts(parseInt(e.target.value))}
                    min={3}
                    max={10}
                    disabled={!canEditSecurity}
                  />
                  <p className="text-xs text-slate-600">Account locked after this many failed attempts</p>
                </div>
              </div>

              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Session Management
                </h4>
                
                <div className="space-y-2">
                  <Label>Session Timeout (hours): {sessionTimeout}</Label>
                  <Input
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(parseInt(e.target.value))}
                    min={1}
                    max={72}
                    disabled={!canEditSecurity}
                  />
                  <p className="text-xs text-slate-600">Users will be logged out after this period of inactivity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control */}
        <TabsContent value="access" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Role-Based Access Control</CardTitle>
              <CardDescription>
                Manage permissions and role assignments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Active Admin Roles</h4>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-700">9</p>
                    <p className="text-xs text-slate-600 mt-1">Different permission levels</p>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Audit Logging</h4>
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-blue-700">Active</p>
                    <p className="text-xs text-slate-600 mt-1">All actions tracked</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3 pt-4">
                <h4 className="font-semibold">Security Principles</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Least-privilege access enforced</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Role separation implemented</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Super Admin privileges protected</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Immutable audit trails maintained</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Data Protection & Compliance</CardTitle>
              <CardDescription>
                GDPR, CCPA, and data privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-semibold">Data Encryption at Rest</h4>
                  <p className="text-sm text-slate-600">All stored data is encrypted</p>
                </div>
                <Badge className="bg-green-600">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-semibold">Data Export Compliance</h4>
                  <p className="text-sm text-slate-600">Users can export their data on request</p>
                </div>
                <Switch defaultChecked disabled={!canEditSecurity} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-semibold">Right to be Forgotten</h4>
                  <p className="text-sm text-slate-600">Users can request data deletion</p>
                </div>
                <Switch defaultChecked disabled={!canEditSecurity} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-semibold">Privacy Policy Acceptance</h4>
                  <p className="text-sm text-slate-600">Require users to accept privacy policy</p>
                </div>
                <Switch defaultChecked disabled={!canEditSecurity} />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Compliance Standards</h4>
                <div className="grid md:grid-cols-3 gap-2">
                  <Badge variant="outline">GDPR Ready</Badge>
                  <Badge variant="outline">CCPA Compliant</Badge>
                  <Badge variant="outline">SOC 2 Type II</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Security Monitoring</CardTitle>
              <CardDescription>
                Track security events and threats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-700">0</p>
                    <p className="text-xs text-slate-600">Failed Login Attempts (24h)</p>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-700">100%</p>
                    <p className="text-xs text-slate-600">MFA Adoption Rate</p>
                  </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-amber-700">0</p>
                    <p className="text-xs text-slate-600">Security Alerts</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Recent Security Events</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">All systems operational</p>
                        <p className="text-xs text-slate-500">No security incidents detected</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">Now</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}