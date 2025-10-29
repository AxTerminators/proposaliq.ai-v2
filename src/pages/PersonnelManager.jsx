import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Search,
  Shield,
  Award,
  Briefcase,
  GraduationCap,
  Edit,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Sparkles,
  X
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PersonnelManager() {
  const queryClient = useQueryClient();
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showResumeBuilder, setShowResumeBuilder] = useState(false);
  
  const [newPerson, setNewPerson] = useState({
    full_name: "",
    position_title: "",
    email: "",
    phone: "",
    location: "",
    years_experience: 0,
    security_clearance: "none",
    clearance_status: "inactive",
    availability_status: "available",
    skills: [],
    certifications: [],
    education: [],
    work_history: []
  });

  const [skillInput, setSkillInput] = useState("");

  React.useEffect(() => {
    const loadOrg = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) setOrganization(orgs[0]);
      } catch (error) {
        console.error("Error loading org:", error);
      }
    };
    loadOrg();
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

  const createPersonMutation = useMutation({
    mutationFn: (data) => base44.entities.KeyPersonnel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      setShowCreateDialog(false);
      resetForm();
      alert("✓ Personnel added successfully!");
    },
  });

  const updatePersonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KeyPersonnel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      setShowEditDialog(false);
      alert("✓ Personnel updated successfully!");
    },
  });

  const deletePersonMutation = useMutation({
    mutationFn: (id) => base44.entities.KeyPersonnel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
    },
  });

  const resetForm = () => {
    setNewPerson({
      full_name: "",
      position_title: "",
      email: "",
      phone: "",
      location: "",
      years_experience: 0,
      security_clearance: "none",
      clearance_status: "inactive",
      availability_status: "available",
      skills: [],
      certifications: [],
      education: [],
      work_history: []
    });
  };

  const handleCreate = () => {
    if (!newPerson.full_name) {
      alert("Please enter a name");
      return;
    }

    createPersonMutation.mutate({
      ...newPerson,
      organization_id: organization.id
    });
  };

  const handleEdit = (person) => {
    setSelectedPerson({...person});
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    updatePersonMutation.mutate({
      id: selectedPerson.id,
      data: {
        full_name: selectedPerson.full_name,
        position_title: selectedPerson.position_title,
        email: selectedPerson.email,
        phone: selectedPerson.phone,
        location: selectedPerson.location,
        years_experience: selectedPerson.years_experience,
        security_clearance: selectedPerson.security_clearance,
        clearance_status: selectedPerson.clearance_status,
        availability_status: selectedPerson.availability_status,
        skills: selectedPerson.skills,
        hourly_rate: selectedPerson.hourly_rate,
        labor_category: selectedPerson.labor_category
      }
    });
  };

  const addSkill = (person, setter) => {
    if (!skillInput.trim()) return;
    setter({
      ...person,
      skills: [...(person.skills || []), skillInput.trim()]
    });
    setSkillInput("");
  };

  const removeSkill = (person, setter, index) => {
    setter({
      ...person,
      skills: person.skills.filter((_, i) => i !== index)
    });
  };

  const generateGovResume = async (person) => {
    setShowResumeBuilder(true);
    setSelectedPerson(person);
  };

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700 border-green-300';
      case 'limited': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'committed': return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'unavailable': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getClearanceColor = (clearance) => {
    if (clearance === 'none') return 'bg-slate-100 text-slate-700';
    if (clearance === 'ts_sci' || clearance === 'top_secret') return 'bg-purple-100 text-purple-700';
    if (clearance === 'secret') return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
  };

  const filteredPersonnel = personnel.filter(person =>
    person.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.position_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const availableCount = personnel.filter(p => p.availability_status === 'available').length;
  const clearedCount = personnel.filter(p => p.security_clearance && p.security_clearance !== 'none').length;

  if (isLoading || !organization) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            Personnel Manager
          </h1>
          <p className="text-slate-600">Manage your key personnel and resumes</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600">
          <Plus className="w-5 h-5 mr-2" />
          Add Personnel
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="w-8 h-8 text-blue-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{personnel.length}</p>
                <p className="text-xs text-slate-600">Total Personnel</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{availableCount}</p>
                <p className="text-xs text-slate-600">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Shield className="w-8 h-8 text-purple-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{clearedCount}</p>
                <p className="text-xs text-slate-600">Cleared</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Briefcase className="w-8 h-8 text-amber-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {personnel.reduce((sum, p) => sum + (p.years_experience || 0), 0)}
                </p>
                <p className="text-xs text-slate-600">Total Years Exp</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search by name, title, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Personnel Grid */}
      {filteredPersonnel.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No personnel found</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Person
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonnel.map((person) => (
            <Card key={person.id} className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{person.full_name}</CardTitle>
                    <p className="text-sm text-slate-600">{person.position_title}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge className={getAvailabilityColor(person.availability_status)}>
                        {person.availability_status}
                      </Badge>
                      {person.security_clearance && person.security_clearance !== 'none' && (
                        <Badge className={getClearanceColor(person.security_clearance)}>
                          <Shield className="w-3 h-3 mr-1" />
                          {person.security_clearance.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Experience</p>
                    <p className="font-semibold">{person.years_experience || 0} years</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Used in</p>
                    <p className="font-semibold">{person.usage_count || 0} proposals</p>
                  </div>
                </div>

                {person.skills && person.skills.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {person.skills.slice(0, 3).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {person.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{person.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => generateGovResume(person)} className="flex-1">
                    <FileText className="w-4 h-4 mr-1" />
                    Resume
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(person)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this person?')) {
                        deletePersonMutation.mutate(person.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Personnel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={newPerson.full_name}
                  onChange={(e) => setNewPerson({...newPerson, full_name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Position Title</Label>
                <Input
                  value={newPerson.position_title}
                  onChange={(e) => setNewPerson({...newPerson, position_title: e.target.value})}
                  placeholder="Senior Engineer"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newPerson.email}
                  onChange={(e) => setNewPerson({...newPerson, email: e.target.value})}
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newPerson.phone}
                  onChange={(e) => setNewPerson({...newPerson, phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={newPerson.location}
                  onChange={(e) => setNewPerson({...newPerson, location: e.target.value})}
                  placeholder="Washington, DC"
                />
              </div>
              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Input
                  type="number"
                  value={newPerson.years_experience}
                  onChange={(e) => setNewPerson({...newPerson, years_experience: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Security Clearance</Label>
                <Select
                  value={newPerson.security_clearance}
                  onValueChange={(value) => setNewPerson({...newPerson, security_clearance: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="public_trust">Public Trust</SelectItem>
                    <SelectItem value="secret">Secret</SelectItem>
                    <SelectItem value="top_secret">Top Secret</SelectItem>
                    <SelectItem value="ts_sci">TS/SCI</SelectItem>
                    <SelectItem value="q_clearance">Q Clearance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Availability</Label>
                <Select
                  value={newPerson.availability_status}
                  onValueChange={(value) => setNewPerson({...newPerson, availability_status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="limited">Limited</SelectItem>
                    <SelectItem value="committed">Committed</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a skill"
                  onKeyPress={(e) => e.key === 'Enter' && addSkill(newPerson, setNewPerson)}
                />
                <Button type="button" onClick={() => addSkill(newPerson, setNewPerson)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newPerson.skills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {skill}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeSkill(newPerson, setNewPerson, idx)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Personnel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Personnel</DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={selectedPerson.full_name}
                    onChange={(e) => setSelectedPerson({...selectedPerson, full_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Position Title</Label>
                  <Input
                    value={selectedPerson.position_title}
                    onChange={(e) => setSelectedPerson({...selectedPerson, position_title: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Security Clearance</Label>
                  <Select
                    value={selectedPerson.security_clearance}
                    onValueChange={(value) => setSelectedPerson({...selectedPerson, security_clearance: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="public_trust">Public Trust</SelectItem>
                      <SelectItem value="secret">Secret</SelectItem>
                      <SelectItem value="top_secret">Top Secret</SelectItem>
                      <SelectItem value="ts_sci">TS/SCI</SelectItem>
                      <SelectItem value="q_clearance">Q Clearance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Availability</Label>
                  <Select
                    value={selectedPerson.availability_status}
                    onValueChange={(value) => setSelectedPerson({...selectedPerson, availability_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="limited">Limited</SelectItem>
                      <SelectItem value="committed">Committed</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Skills</Label>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Add a skill"
                    onKeyPress={(e) => e.key === 'Enter' && addSkill(selectedPerson, setSelectedPerson)}
                  />
                  <Button type="button" onClick={() => addSkill(selectedPerson, setSelectedPerson)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selectedPerson.skills || []).map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {skill}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeSkill(selectedPerson, setSelectedPerson, idx)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume Builder Dialog */}
      <Dialog open={showResumeBuilder} onOpenChange={setShowResumeBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Generate Government Resume</DialogTitle>
            <CardDescription>
              Coming soon: AI-powered resume generation in standard government formats
            </CardDescription>
          </DialogHeader>
          <div className="py-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 mb-2">Resume builder feature</p>
            <p className="text-sm text-slate-500">This will generate formatted resumes for proposals</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResumeBuilder(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}