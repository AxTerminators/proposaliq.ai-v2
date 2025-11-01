import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, Bell, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function Settings() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [orgData, setOrgData] = useState({
    organization_name: "",
    organization_type: "",
    address: "",
    phone: "",
    website: "",
    uei: "",
    cage_code: "",
    duns: "",
    naics_codes: [],
    certifications: []
  });

  const [userData, setUserData] = useState({
    full_name: "",
    job_title: "",
    department: "",
    phone: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setUserData({
        full_name: currentUser.full_name || "",
        job_title: currentUser.job_title || "",
        department: currentUser.department || "",
        phone: currentUser.phone || ""
      });
      
      const org = await getUserActiveOrganization(currentUser);
      if (org) {
        setOrganization(org);
        setOrgData({
          organization_name: org.organization_name || "",
          organization_type: org.organization_type || "",
          address: org.address || "",
          phone: org.phone || "",
          website: org.website || "",
          uei: org.uei || "",
          cage_code: org.cage_code || "",
          duns: org.duns || "",
          naics_codes: org.naics_codes || [],
          certifications: org.certifications || []
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSaveOrganization = async () => {
    if (!organization) return;
    
    setSaving(true);
    try {
      await base44.entities.Organization.update(organization.id, orgData);
      alert("Organization settings saved");
      await loadData();
    } catch (error) {
      console.error("Error saving organization:", error);
      alert("Failed to save organization settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await base44.auth.updateMe(userData);
      alert("Profile settings saved");
      await loadData();
    } catch (error) {
      console.error("Error saving user:", error);
      alert("Failed to save profile settings");
    } finally {
      setSaving(false);
    }
  };

  if (!organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
        <p className="text-slate-600">Manage your account and organization settings</p>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organization">
            <Building2 className="w-4 h-4 mr-2" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Organization Name</label>
                  <Input
                    value={orgData.organization_name}
                    onChange={(e) => setOrgData({ ...orgData, organization_name: e.target.value })}
                    placeholder="Your organization name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Organization Type</label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={orgData.organization_type}
                    onChange={(e) => setOrgData({ ...orgData, organization_type: e.target.value })}
                  >
                    <option value="">Select type</option>
                    <option value="small_business">Small Business</option>
                    <option value="8a">8(a)</option>
                    <option value="hubzone">HUBZone</option>
                    <option value="sdvosb">SDVOSB</option>
                    <option value="wosb">WOSB</option>
                    <option value="large_business">Large Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    value={orgData.phone}
                    onChange={(e) => setOrgData({ ...orgData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Website</label>
                  <Input
                    value={orgData.website}
                    onChange={(e) => setOrgData({ ...orgData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <Textarea
                    value={orgData.address}
                    onChange={(e) => setOrgData({ ...orgData, address: e.target.value })}
                    placeholder="Full address"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">UEI</label>
                  <Input
                    value={orgData.uei}
                    onChange={(e) => setOrgData({ ...orgData, uei: e.target.value })}
                    placeholder="Unique Entity Identifier"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">CAGE Code</label>
                  <Input
                    value={orgData.cage_code}
                    onChange={(e) => setOrgData({ ...orgData, cage_code: e.target.value })}
                    placeholder="12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">DUNS</label>
                  <Input
                    value={orgData.duns}
                    onChange={(e) => setOrgData({ ...orgData, duns: e.target.value })}
                    placeholder="DUNS Number"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveOrganization} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <Input
                    value={userData.full_name}
                    onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input value={user.email} disabled className="bg-slate-50" />
                  <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    value={userData.phone}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Job Title</label>
                  <Input
                    value={userData.job_title}
                    onChange={(e) => setUserData({ ...userData, job_title: e.target.value })}
                    placeholder="Your job title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Department</label>
                  <Input
                    value={userData.department}
                    onChange={(e) => setUserData({ ...userData, department: e.target.value })}
                    placeholder="Your department"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveUser} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">Notification preferences will be available soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}