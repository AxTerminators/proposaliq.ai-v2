import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, Bell, Save, FolderTree, Sparkles, Trash2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import ImageUploadOptimized from "../components/ui/ImageUploadOptimized";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  
  const [orgFormData, setOrgFormData] = useState({
    organization_name: "",
    organization_type: "",
    address: "",
    phone: "",
    website: "",
    uei: "",
    cage_code: "",
    duns: "",
    naics_codes: [],
    certifications: [],
    custom_branding: {
      logo_url: ""
    }
  });

  const [userData, setUserData] = useState({
    full_name: "",
    job_title: "",
    department: "",
    phone: ""
  });

  const [isCreatingFolders, setIsCreatingFolders] = useState(false);
  const [foldersCreated, setFoldersCreated] = useState(false);

  // Sample data deletion states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadData();
    checkFolderStatus();
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
        setOrgFormData({
          organization_name: org.organization_name || "",
          organization_type: org.organization_type || "",
          address: org.address || "",
          phone: org.phone || "",
          website: org.website || "",
          uei: org.uei || "",
          cage_code: org.cage_code || "",
          duns: org.duns || "",
          naics_codes: org.naics_codes || [],
          certifications: org.certifications || [],
          custom_branding: org.custom_branding || { logo_url: "" }
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const checkFolderStatus = async () => {
    try {
      const currentUser = await base44.auth.me();
      const org = await getUserActiveOrganization(currentUser);
      
      if (org) {
        const folders = await base44.entities.Folder.filter({
          organization_id: org.id,
          purpose: 'content_library',
          is_system_folder: true
        });
        
        setFoldersCreated(folders.length > 0);
      }
    } catch (error) {
      console.error("Error checking folder status:", error);
    }
  };

  const handleCreateDefaultFolders = async () => {
    if (!organization) {
      alert('No organization found');
      return;
    }

    setIsCreatingFolders(true);
    
    try {
      const response = await base44.functions.invoke('createDefaultContentLibraryFolders', {
        organization_id: organization.id
      });

      if (response.data.success) {
        alert(`✅ ${response.data.message}\n\n📁 Created ${response.data.folder_count} folders`);
        setFoldersCreated(true);
        await checkFolderStatus();
      } else {
        alert(`⚠️ ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error creating folders:', error);
      alert('❌ Error creating default folders: ' + error.message);
    } finally {
      setIsCreatingFolders(false);
    }
  };

  const handleDeleteSampleData = async () => {
    if (!organization) {
      alert('No organization found');
      return;
    }

    setIsDeleting(true);
    
    try {
      const response = await base44.functions.invoke('deleteSampleData', {
        organization_id: organization.id
      });

      if (response.data.success) {
        const counts = response.data.deleted_counts;
        const summary = Object.entries(counts)
          .filter(([_, count]) => count > 0)
          .map(([key, count]) => `  • ${key.replace(/_/g, ' ')}: ${count}`)
          .join('\n');

        alert(`✅ Sample data deleted successfully!\n\n${summary || 'No sample data found.'}`);
        setShowDeleteDialog(false);
      } else {
        alert(`❌ ${response.data.error || 'Failed to delete sample data'}`);
      }
    } catch (error) {
      console.error('Error deleting sample data:', error);
      alert('❌ Error deleting sample data: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogoUpload = async (uploadResult) => {
    if (!uploadResult) {
      setOrgFormData(prevData => ({
        ...prevData,
        custom_branding: {
          ...prevData.custom_branding,
          logo_url: ''
        }
      }));
      return;
    }

    setOrgFormData(prevData => ({
      ...prevData,
      custom_branding: {
        ...prevData.custom_branding,
        logo_url: uploadResult.optimized
      }
    }));
  };

  const handleSaveOrganization = async () => {
    if (!organization) return;
    
    setSaving(true);
    try {
      await base44.entities.Organization.update(organization.id, orgFormData);
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

  const isAdminOrManager = user.role === 'admin' || user.role === 'manager';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
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
            <TabsTrigger value="content-library">
              <FolderTree className="w-4 h-4 mr-2" />
              Content Library
            </TabsTrigger>
            {isAdminOrManager && (
              <TabsTrigger value="data-management">
                <Trash2 className="w-4 h-4 mr-2" />
                Data Management
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organization" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Organization Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label>Organization Name *</Label>
                    <Input
                      value={orgFormData.organization_name}
                      onChange={(e) => setOrgFormData({...orgFormData, organization_name: e.target.value})}
                      placeholder="Acme Corporation"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium mb-2">Organization Type</Label>
                    <select
                      className="w-full border rounded-md p-2"
                      value={orgFormData.organization_type}
                      onChange={(e) => setOrgFormData({ ...orgFormData, organization_type: e.target.value })}
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
                    <Label className="block text-sm font-medium mb-2">Phone</Label>
                    <Input
                      value={orgFormData.phone}
                      onChange={(e) => setOrgFormData({ ...orgFormData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium mb-2">Website</Label>
                    <Input
                      value={orgFormData.website}
                      onChange={(e) => setOrgFormData({ ...orgFormData, website: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="block text-sm font-medium mb-2">Address</Label>
                    <Textarea
                      value={orgFormData.address}
                      onChange={(e) => setOrgFormData({ ...orgFormData, address: e.target.value })}
                      placeholder="Full address"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium mb-2">UEI</Label>
                    <Input
                      value={orgFormData.uei}
                      onChange={(e) => setOrgFormData({ ...orgFormData, uei: e.target.value })}
                      placeholder="Unique Entity Identifier"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium mb-2">CAGE Code</Label>
                    <Input
                      value={orgFormData.cage_code}
                      onChange={(e) => setOrgFormData({ ...orgFormData, cage_code: e.target.value })}
                      placeholder="12345"
                    />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium mb-2">DUNS</Label>
                    <Input
                      value={orgFormData.duns}
                      onChange={(e) => setOrgFormData({ ...orgFormData, duns: e.target.value })}
                      placeholder="DUNS Number"
                    />
                  </div>
                </div>

                <div>
                  <ImageUploadOptimized
                    label="Organization Logo"
                    currentImageUrl={orgFormData.custom_branding?.logo_url}
                    onUploadComplete={handleLogoUpload}
                    maxWidth={800}
                    quality={90}
                    maxSizeMB={5}
                    aspectRatio="auto"
                  />
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

          <TabsContent value="content-library">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-blue-600" />
                  Content Library Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 mb-2">Default Folder Structure</h3>
                      <p className="text-sm text-slate-700 mb-4">
                        Create a comprehensive, industry-neutral folder system for organizing your reusable content. This includes:
                      </p>
                      <ul className="text-sm text-slate-700 space-y-1 mb-4">
                        <li>🏢 Company Information (with Capability Statements)</li>
                        <li>📋 Proposal Sections (Technical Approaches, Management Plans, etc.)</li>
                        <li>🏆 Past Performance & Case Studies</li>
                        <li>🧑‍💼 Key Personnel</li>
                        <li>🤝 Teaming Partners</li>
                        <li>⚖️ Admin & Compliance</li>
                        <li>📈 Marketing & Sales Collateral</li>
                        <li>📦 General Boilerplate</li>
                      </ul>
                      
                      {foldersCreated ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <Badge className="bg-green-600">
                            ✓ Folders Created
                          </Badge>
                          <p className="text-sm text-green-800">
                            Your default folder structure is ready! Visit the Content Library to see it.
                          </p>
                        </div>
                      ) : (
                        <Button
                          onClick={handleCreateDefaultFolders}
                          disabled={isCreatingFolders}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                          {isCreatingFolders ? (
                            <>
                              <div className="animate-spin mr-2">⏳</div>
                              Creating Folders...
                            </>
                          ) : (
                            <>
                              <FolderTree className="w-4 h-4 mr-2" />
                              Create Default Folder Structure
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">💡 Pro Tip</h4>
                  <p className="text-sm text-slate-600">
                    After creating the folder structure, you can customize it by adding, renaming, or reorganizing folders in the Content Library page. The structure we create is just a starting point!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdminOrManager && (
            <TabsContent value="data-management">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    Data Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 mb-2">Delete Sample Data</h3>
                        <p className="text-sm text-slate-700 mb-4">
                          Remove all sample/demo data from your organization. This will permanently delete:
                        </p>
                        <ul className="text-sm text-slate-700 space-y-1 mb-4">
                          <li>📄 Sample proposals and sections</li>
                          <li>✅ Sample tasks and subtasks</li>
                          <li>🏆 Sample past performance records</li>
                          <li>🧑‍💼 Sample key personnel</li>
                          <li>🤝 Sample teaming partners</li>
                          <li>📦 Sample resources and files</li>
                          <li>📋 Sample Kanban boards</li>
                          <li>💬 Sample discussions and comments</li>
                        </ul>
                        
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                          <p className="text-sm text-yellow-800 font-medium">
                            ⚠️ This action cannot be undone. Only sample data marked with "is_sample_data: true" will be deleted.
                          </p>
                        </div>

                        <Button
                          onClick={() => setShowDeleteDialog(true)}
                          variant="destructive"
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? (
                            <>
                              <div className="animate-spin mr-2">⏳</div>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Sample Data
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-2">ℹ️ About Sample Data</h4>
                    <p className="text-sm text-slate-600">
                      Sample data is created during onboarding to help you explore the platform. Once you're comfortable with the system, you can delete it to start with a clean workspace. You can always generate new sample data later if needed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Delete Sample Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently delete all sample data for <strong>{organization.organization_name}</strong>.
              </p>
              <p className="text-red-600 font-medium">
                This action cannot be undone.
              </p>
              <p>
                Are you sure you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSampleData}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Delete Sample Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}