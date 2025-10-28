import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Megaphone, 
  Globe,
  Mail,
  FileText,
  Image,
  Settings
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canEdit } from "./PermissionChecker";

export default function MarketingModule({ currentUser }) {
  const userRole = currentUser.admin_role || currentUser.role;
  const canEditMarketing = canEdit(userRole, 'marketing');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Marketing & Communications</h2>
          <p className="text-slate-600">Manage public pages, emails, and branding</p>
        </div>
      </div>

      <Tabs defaultValue="pages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pages">Public Pages</TabsTrigger>
          <TabsTrigger value="emails">Email Templates</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        {/* Public Pages */}
        <TabsContent value="pages" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Landing Page
                </CardTitle>
                <CardDescription>Main public-facing page</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Status</span>
                    <Badge className="bg-green-600">Published</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Last Updated</span>
                    <span className="text-sm">2 days ago</span>
                  </div>
                  <Button variant="outline" className="w-full" disabled={!canEditMarketing}>
                    Edit Page
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Pricing Page
                </CardTitle>
                <CardDescription>Subscription plans display</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Status</span>
                    <Badge className="bg-green-600">Published</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Last Updated</span>
                    <span className="text-sm">Today</span>
                  </div>
                  <Button variant="outline" className="w-full" disabled={!canEditMarketing}>
                    Edit Page
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Blog
                </CardTitle>
                <CardDescription>News and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Status</span>
                    <Badge variant="secondary">Not Setup</Badge>
                  </div>
                  <Button variant="outline" className="w-full" disabled={!canEditMarketing}>
                    Setup Blog
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documentation
                </CardTitle>
                <CardDescription>Help center and guides</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Status</span>
                    <Badge variant="secondary">Not Setup</Badge>
                  </div>
                  <Button variant="outline" className="w-full" disabled={!canEditMarketing}>
                    Setup Docs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="emails" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Manage automated email communications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="font-semibold">Welcome Email</h4>
                        <p className="text-xs text-slate-600">Sent when user signs up</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled={!canEditMarketing}>
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="font-semibold">Subscription Confirmation</h4>
                        <p className="text-xs text-slate-600">Sent after plan upgrade</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled={!canEditMarketing}>
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="font-semibold">Token Low Warning</h4>
                        <p className="text-xs text-slate-600">Sent when tokens are low</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled={!canEditMarketing}>
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="font-semibold">Monthly Newsletter</h4>
                        <p className="text-xs text-slate-600">Monthly product updates</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled={!canEditMarketing}>
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Brand Assets
              </CardTitle>
              <CardDescription>Logo, colors, and typography</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold mb-3">Logo</h4>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold">PIQ</span>
                  </div>
                  <Button variant="outline" size="sm" disabled={!canEditMarketing}>
                    Update Logo
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold mb-3">Brand Colors</h4>
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <div className="w-full h-12 bg-blue-600 rounded-lg mb-1"></div>
                    <p className="text-xs text-center">#2563eb</p>
                  </div>
                  <div>
                    <div className="w-full h-12 bg-indigo-600 rounded-lg mb-1"></div>
                    <p className="text-xs text-center">#4f46e5</p>
                  </div>
                  <div>
                    <div className="w-full h-12 bg-slate-900 rounded-lg mb-1"></div>
                    <p className="text-xs text-center">#0f172a</p>
                  </div>
                  <div>
                    <div className="w-full h-12 bg-slate-200 rounded-lg mb-1"></div>
                    <p className="text-xs text-center">#e2e8f0</p>
                  </div>
                  <div>
                    <div className="w-full h-12 bg-green-600 rounded-lg mb-1"></div>
                    <p className="text-xs text-center">#16a34a</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Platform Announcements
              </CardTitle>
              <CardDescription>In-app notifications and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Badge className="bg-blue-600 mb-2">Active</Badge>
                  <h4 className="font-semibold mb-1">New Pricing Plans Available</h4>
                  <p className="text-sm text-slate-600">Check out our updated pricing with more token options!</p>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" disabled={!canEditMarketing}>Edit</Button>
                    <Button variant="outline" size="sm" disabled={!canEditMarketing}>Deactivate</Button>
                  </div>
                </div>

                <Button variant="outline" className="w-full" disabled={!canEditMarketing}>
                  <Megaphone className="w-4 h-4 mr-2" />
                  Create New Announcement
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}