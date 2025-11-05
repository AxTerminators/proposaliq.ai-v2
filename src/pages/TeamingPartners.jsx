
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  Search,
  Trash2,
  Edit,
  Building2,
  Mail,
  Phone,
  Globe,
  Award,
  Star,
  StarOff
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import UniversalAlert from "@/components/ui/UniversalAlert";

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

export default function TeamingPartners() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  
  // Universal Alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "info",
    title: "",
    description: ""
  });
  
  const [partnerData, setPartnerData] = useState({
    partner_name: "",
    partner_type: "teaming_partner",
    address: "",
    poc_name: "",
    poc_email: "",
    poc_phone: "",
    uei: "",
    cage_code: "",
    website_url: "",
    core_capabilities: [],
    certifications: [],
    tags: [],
    notes: "",
    status: "active"
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: partners, isLoading } = useQuery({
    queryKey: ['teaming-partners', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.TeamingPartner.filter(
        { organization_id: organization.id },
        'partner_name'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (data) => {
      if (editingPartner) {
        return base44.entities.TeamingPartner.update(editingPartner.id, data);
      } else {
        return base44.entities.TeamingPartner.create({
          ...data,
          organization_id: organization.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaming-partners'] });
      setShowDialog(false);
      setEditingPartner(null);
      resetForm();
      setAlertConfig({
        type: "success",
        title: "Success",
        description: `Partner ${editingPartner ? "updated" : "added"} successfully.`
      });
      setShowAlert(true);
    },
    onError: (error) => {
      console.error("Error saving partner:", error);
      setAlertConfig({
        type: "error",
        title: "Error",
        description: `Failed to save partner: ${error.message}`
      });
      setShowAlert(true);
    }
  });

  const deletePartnerMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.TeamingPartner.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaming-partners'] });
      setAlertConfig({
        type: "success",
        title: "Success",
        description: "Partner deleted successfully."
      });
      setShowAlert(true);
    },
    onError: (error) => {
      console.error("Error deleting partner:", error);
      setAlertConfig({
        type: "error",
        title: "Error",
        description: `Failed to delete partner: ${error.message}`
      });
      setShowAlert(true);
    }
  });

  const resetForm = () => {
    setPartnerData({
      partner_name: "",
      partner_type: "teaming_partner",
      address: "",
      poc_name: "",
      poc_email: "",
      poc_phone: "",
      uei: "",
      cage_code: "",
      website_url: "",
      core_capabilities: [],
      certifications: [],
      tags: [],
      notes: "",
      status: "active"
    });
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setPartnerData(partner);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!partnerData.partner_name.trim()) {
      setAlertConfig({
        type: "warning",
        title: "Partner Name Required",
        description: "Please enter a partner name before saving."
      });
      setShowAlert(true);
      return;
    }
    createPartnerMutation.mutate(partnerData);
  };

  const filteredPartners = partners.filter(p => 
    p.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.poc_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getPartnerTypeColor = (type) => {
    const colors = {
      prime: "bg-purple-100 text-purple-800",
      subcontractor: "bg-blue-100 text-blue-800",
      teaming_partner: "bg-green-100 text-green-800",
      consultant: "bg-amber-100 text-amber-800",
      vendor: "bg-slate-100 text-slate-800"
    };
    return colors[type] || colors.teaming_partner;
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Teaming Partners</h1>
          <p className="text-slate-600">Manage your network of partners and subcontractors</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-5 h-5 mr-2" />
          Add Partner
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search partners..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filteredPartners.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Partners Yet</h3>
            <p className="text-slate-600 mb-6">
              Build your network by adding teaming partners and subcontractors
            </p>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Partner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map((partner) => (
            <Card key={partner.id} className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{partner.partner_name}</CardTitle>
                    <Badge className={getPartnerTypeColor(partner.partner_type)}>
                      {partner.partner_type?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(partner)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
                          deletePartnerMutation.mutate(partner.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {partner.poc_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{partner.poc_name}</span>
                  </div>
                )}
                {partner.poc_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${partner.poc_email}`} className="text-blue-600 hover:underline">
                      {partner.poc_email}
                    </a>
                  </div>
                )}
                {partner.poc_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{partner.poc_phone}</span>
                  </div>
                )}
                {partner.website_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Website
                    </a>
                  </div>
                )}
                
                {partner.certifications && partner.certifications.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                      <Award className="w-3 h-3" />
                      <span>Certifications</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {partner.certifications.slice(0, 3).map((cert, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { 
        setShowDialog(open); 
        if (!open) { 
          setEditingPartner(null); 
          resetForm(); 
        } 
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Edit Partner' : 'Add New Partner'}</DialogTitle>
            <DialogDescription>
              Add or update teaming partner information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Partner Name *</label>
                <Input
                  value={partnerData.partner_name}
                  onChange={(e) => setPartnerData({ ...partnerData, partner_name: e.target.value })}
                  placeholder="Company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={partnerData.partner_type}
                  onChange={(e) => setPartnerData({ ...partnerData, partner_type: e.target.value })}
                >
                  <option value="prime">Prime Contractor</option>
                  <option value="subcontractor">Subcontractor</option>
                  <option value="teaming_partner">Teaming Partner</option>
                  <option value="consultant">Consultant</option>
                  <option value="vendor">Vendor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={partnerData.status}
                  onChange={(e) => setPartnerData({ ...partnerData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="preferred">Preferred</option>
                  <option value="potential">Potential</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">POC Name</label>
                <Input
                  value={partnerData.poc_name}
                  onChange={(e) => setPartnerData({ ...partnerData, poc_name: e.target.value })}
                  placeholder="Point of contact"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">POC Email</label>
                <Input
                  type="email"
                  value={partnerData.poc_email}
                  onChange={(e) => setPartnerData({ ...partnerData, poc_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">POC Phone</label>
                <Input
                  value={partnerData.poc_phone}
                  onChange={(e) => setPartnerData({ ...partnerData, poc_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">UEI</label>
                <Input
                  value={partnerData.uei}
                  onChange={(e) => setPartnerData({ ...partnerData, uei: e.target.value })}
                  placeholder="Unique Entity Identifier"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">CAGE Code</label>
                <Input
                  value={partnerData.cage_code}
                  onChange={(e) => setPartnerData({ ...partnerData, cage_code: e.target.value })}
                  placeholder="12345"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Website</label>
                <Input
                  value={partnerData.website_url}
                  onChange={(e) => setPartnerData({ ...partnerData, website_url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Address</label>
                <Textarea
                  value={partnerData.address}
                  onChange={(e) => setPartnerData({ ...partnerData, address: e.target.value })}
                  placeholder="Full address"
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <Textarea
                  value={partnerData.notes}
                  onChange={(e) => setPartnerData({ ...partnerData, notes: e.target.value })}
                  placeholder="Internal notes about this partner"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createPartnerMutation.isPending}>
                {createPartnerMutation.isPending ? 'Saving...' : (editingPartner ? 'Update Partner' : 'Add Partner')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UniversalAlert
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        type={alertConfig.type}
        title={alertConfig.title}
        description={alertConfig.description}
      />
    </div>
  );
}
