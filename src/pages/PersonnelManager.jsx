import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Plus, 
  Search,
  Edit,
  Trash2,
  Shield,
  Award,
  Briefcase,
  FileText,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Target,
  Star
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PersonnelForm from "../components/personnel/PersonnelForm";
import PersonnelCard from "../components/personnel/PersonnelCard";
import ResumeBuilder from "../components/personnel/ResumeBuilder";
import AvailabilityChecker from "../components/personnel/AvailabilityChecker";

export default function PersonnelManager() {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [organization, setOrganization] = React.useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResumeBuilder, setShowResumeBuilder] = useState(false);
  const [showAvailabilityChecker, setShowAvailabilityChecker] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClearance, setFilterClearance] = useState("all");

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: personnel, isLoading } = useQuery({
    queryKey: ['personnel', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.KeyPersonnel.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const createPersonnelMutation = useMutation({
    mutationFn: (data) => base44.entities.KeyPersonnel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      setShowCreateDialog(false);
      alert("✓ Personnel added successfully!");
    },
  });

  const updatePersonnelMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KeyPersonnel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      setShowEditDialog(false);
      alert("✓ Personnel updated successfully!");
    },
  });

  const deletePersonnelMutation = useMutation({
    mutationFn: (id) => base44.entities.KeyPersonnel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
    },
  });

  const handleEdit = (person) => {
    setSelectedPerson(person);
    setShowEditDialog(true);
  };

  const handleBuildResume = (person) => {
    setSelectedPerson(person);
    setShowResumeBuilder(true);
  };

  const handleCheckAvailability = () => {
    setShowAvailabilityChecker(true);
  };

  // Filter personnel
  const filteredPersonnel = personnel.filter(person => {
    const matchesSearch = !searchQuery || 
      person.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.position_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.skills?.some(s => s.skill_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = filterStatus === "all" || person.availability?.status === filterStatus;
    const matchesClearance = filterClearance === "all" || person.security_clearance?.level === filterClearance;

    return matchesSearch && matchesStatus && matchesClearance;
  });

  // Calculate stats
  const stats = React.useMemo(() => {
    const now = new Date();
    return {
      total: personnel.length,
      available: personnel.filter(p => p.availability?.status === "Available").length,
      onContract: personnel.filter(p => p.availability?.status === "On Contract").length,
      clearances: {
        secret: personnel.filter(p => p.security_clearance?.level === "Secret" && p.security_clearance?.status === "Active").length,
        topSecret: personnel.filter(p => p.security_clearance?.level === "Top Secret" && p.security_clearance?.status === "Active").length,
        tsSci: personnel.filter(p => p.security_clearance?.level === "TS/SCI" && p.security_clearance?.status === "Active").length,
      },
      expiringClearances: personnel.filter(p => {
        if (!p.security_clearance?.expiration_date) return false;
        const expDate = new Date(p.security_clearance.expiration_date);
        const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
        return expDate >= now && expDate <= sixtyDaysFromNow;
      }).length,
      expiringCerts: personnel.reduce((sum, p) => {
        const expiring = (p.certifications || []).filter(cert => {
          if (!cert.expiration_date) return false;
          const expDate = new Date(cert.expiration_date);
          const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
          return expDate >= now && expDate <= sixtyDaysFromNow;
        }).length;
        return sum + expiring;
      }, 0)
    };
  }, [personnel]);

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-64 w-96" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            Personnel Manager
          </h1>
          <p className="text-slate-600">Manage your key personnel, resumes, and availability</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCheckAvailability} variant="outline">
            <Clock className="w-5 h-5 mr-2" />
            Check Availability
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 mr-2" />
            Add Personnel
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Personnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.available}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              On Contract
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.onContract}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Active Clearances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {stats.clearances.secret + stats.clearances.topSecret + stats.clearances.tsSci}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.clearances.tsSci} TS/SCI, {stats.clearances.topSecret} TS, {stats.clearances.secret} S
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{stats.expiringClearances + stats.expiringCerts}</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.expiringClearances} clearances, {stats.expiringCerts} certs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by name, title, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Partially Available">Partially Available</SelectItem>
                  <SelectItem value="On Contract">On Contract</SelectItem>
                  <SelectItem value="Unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterClearance} onValueChange={setFilterClearance}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Clearance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clearances</SelectItem>
                  <SelectItem value="TS/SCI">TS/SCI</SelectItem>
                  <SelectItem value="Top Secret">Top Secret</SelectItem>
                  <SelectItem value="Secret">Secret</SelectItem>
                  <SelectItem value="Public Trust">Public Trust</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Personnel Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-96" />)}
        </div>
      ) : filteredPersonnel.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No personnel found</p>
            <p className="text-sm text-slate-500 mb-4">Add key personnel to track availability and build resumes</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Person
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonnel.map((person) => (
            <PersonnelCard
              key={person.id}
              person={person}
              onEdit={handleEdit}
              onDelete={(id) => {
                if (confirm('Delete this person?')) {
                  deletePersonnelMutation.mutate(id);
                }
              }}
              onBuildResume={handleBuildResume}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Personnel</DialogTitle>
          </DialogHeader>
          <PersonnelForm
            organizationId={organization.id}
            onSubmit={(data) => createPersonnelMutation.mutate(data)}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Personnel</DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <PersonnelForm
              organizationId={organization.id}
              initialData={selectedPerson}
              onSubmit={(data) => updatePersonnelMutation.mutate({ id: selectedPerson.id, data })}
              onCancel={() => setShowEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Resume Builder Dialog */}
      <Dialog open={showResumeBuilder} onOpenChange={setShowResumeBuilder}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Resume Builder - {selectedPerson?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <ResumeBuilder
              person={selectedPerson}
              onClose={() => setShowResumeBuilder(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Availability Checker Dialog */}
      <Dialog open={showAvailabilityChecker} onOpenChange={setShowAvailabilityChecker}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Personnel Availability Checker</DialogTitle>
          </DialogHeader>
          <AvailabilityChecker
            personnel={personnel}
            onClose={() => setShowAvailabilityChecker(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}