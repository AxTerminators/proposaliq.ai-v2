import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Check, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { validatePersonnelName } from "@/components/utils/boardNameValidation";
import ResumeBioGenerator from "./ResumeBioGenerator";

export default function PersonnelFormDialog({ 
  isOpen, 
  onClose, 
  personnel,
  organization 
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: personnel?.full_name || '',
    title: personnel?.title || '',
    email: personnel?.email || '',
    phone: personnel?.phone || '',
    years_experience: personnel?.years_experience || '',
    clearance_level: personnel?.clearance_level || 'none',
    bio_short: personnel?.bio_short || '',
    ...personnel
  });

  const [nameError, setNameError] = useState("");
  const [isValidatingName, setIsValidatingName] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (personnel?.id) {
        return base44.entities.KeyPersonnel.update(personnel.id, data);
      } else {
        return base44.entities.KeyPersonnel.create({
          ...data,
          organization_id: organization.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['key-personnel'] });
      alert(personnel ? '✅ Personnel updated successfully!' : '✅ Personnel added successfully!');
      onClose();
    },
    onError: (error) => {
      alert(`Error saving personnel: ${error.message}`);
    }
  });

  const handleNameChange = async (value) => {
    setFormData({...formData, full_name: value});
    setNameError("");

    if (!value.trim() || !organization?.id) {
      return;
    }

    setIsValidatingName(true);

    try {
      const validation = await validatePersonnelName(
        value, 
        organization.id, 
        personnel?.id
      );

      if (!validation.isValid) {
        setNameError(validation.message);
      }
    } catch (error) {
      console.error('[PersonnelFormDialog] Validation error:', error);
      setNameError('Validation service error. Please try again.');
    } finally {
      setIsValidatingName(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.full_name.trim()) {
      alert('Please enter a full name');
      return;
    }

    if (nameError) {
      alert('Please fix name errors before saving');
      return;
    }

    saveMutation.mutate(formData);
  };

  const handlePersonnelUpdated = (updates) => {
    setFormData({...formData, ...updates});
  };

  const handleBiosGenerated = (bios) => {
    setFormData({
      ...formData,
      bio_short: bios.short,
      bio_medium: bios.medium,
      bio_long: bios.long,
      bio_executive_summary: bios.executive,
      bio_technical: bios.technical
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {personnel ? 'Edit Personnel' : 'Add Key Personnel'}
          </DialogTitle>
          <DialogDescription>
            {personnel ? 'Update personnel information and bios' : 'Add a new key personnel member to your organization'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., John Smith"
                className={cn(
                  nameError && "border-red-500 focus-visible:ring-red-500"
                )}
              />
              {isValidatingName && (
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                  Checking availability...
                </p>
              )}
              {nameError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {nameError}
                </p>
              )}
              {!nameError && formData.full_name?.trim().length >= 2 && !isValidatingName && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Name is available
                </p>
              )}
              <p className="text-xs text-slate-500">
                Must be 2-100 characters, unique in your organization, avoid: /\:*?"&lt;&gt;|#%&amp;
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Senior Software Engineer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="(123) 456-7890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="years_experience">Years of Experience</Label>
              <Input
                id="years_experience"
                type="number"
                value={formData.years_experience}
                onChange={(e) => setFormData({...formData, years_experience: parseInt(e.target.value) || ''})}
                placeholder="10"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="clearance_level">Security Clearance Level</Label>
              <Select
                value={formData.clearance_level || 'none'}
                onValueChange={(value) => setFormData({...formData, clearance_level: value})}
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
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <ResumeBioGenerator
              personnel={formData}
              onPersonnelUpdated={handlePersonnelUpdated}
              onBiosGenerated={handleBiosGenerated}
            />
          </div>

          {formData.bio_short && (
            <div className="space-y-2">
              <Label htmlFor="bio_short">Short Bio (Preview)</Label>
              <Textarea
                id="bio_short"
                value={formData.bio_short}
                onChange={(e) => setFormData({...formData, bio_short: e.target.value})}
                rows={4}
                className="font-serif"
              />
              <p className="text-xs text-slate-500">
                Word count: {formData.bio_short?.split(/\s+/).filter(Boolean).length || 0}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              saveMutation.isPending || 
              !formData.full_name.trim() ||
              !!nameError ||
              isValidatingName
            }
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {personnel ? 'Update Personnel' : 'Add Personnel'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}