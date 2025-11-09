import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, FileText, Award, Users, Handshake } from "lucide-react";
import FolderSelector from "../folders/FolderSelector";

export default function AddContentDialog({ isOpen, onClose, organization, selectedFolderId }) {
  const queryClient = useQueryClient();
  const [contentType, setContentType] = useState('ProposalResource');
  const [folderId, setFolderId] = useState(selectedFolderId || null);
  const [formData, setFormData] = useState({});
  const [tags, setTags] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const createContentMutation = useMutation({
    mutationFn: async (data) => {
      switch (contentType) {
        case 'ProposalResource':
          return base44.entities.ProposalResource.create(data);
        case 'PastPerformance':
          return base44.entities.PastPerformance.create(data);
        case 'KeyPersonnel':
          return base44.entities.KeyPersonnel.create(data);
        case 'TeamingPartner':
          return base44.entities.TeamingPartner.create(data);
        default:
          throw new Error('Unknown content type');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-resources'] });
      queryClient.invalidateQueries({ queryKey: ['past-performance'] });
      queryClient.invalidateQueries({ queryKey: ['key-personnel'] });
      queryClient.invalidateQueries({ queryKey: ['teaming-partners'] });
      handleClose();
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile({
        file_name: file.name,
        file_url,
        file_size: file.size
      });
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    
    const baseData = {
      organization_id: organization.id,
      folder_id: folderId,
      tags: tagsArray,
      ...formData
    };

    if (uploadedFile) {
      baseData.file_name = uploadedFile.file_name;
      baseData.file_url = uploadedFile.file_url;
      baseData.file_size = uploadedFile.file_size;
    }

    await createContentMutation.mutateAsync(baseData);
  };

  const handleClose = () => {
    setFormData({});
    setTags('');
    setUploadedFile(null);
    setFolderId(selectedFolderId || null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Content to Library</DialogTitle>
          <DialogDescription>
            Add reusable content that can be used across proposals
          </DialogDescription>
        </DialogHeader>

        <Tabs value={contentType} onValueChange={setContentType}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="ProposalResource">
              <FileText className="w-4 h-4 mr-2" />
              Resource
            </TabsTrigger>
            <TabsTrigger value="PastPerformance">
              <Award className="w-4 h-4 mr-2" />
              Project
            </TabsTrigger>
            <TabsTrigger value="KeyPersonnel">
              <Users className="w-4 h-4 mr-2" />
              Personnel
            </TabsTrigger>
            <TabsTrigger value="TeamingPartner">
              <Handshake className="w-4 h-4 mr-2" />
              Partner
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 py-4">
            {/* Common Fields */}
            <div className="space-y-2">
              <Label>Folder</Label>
              <FolderSelector
                organization={organization}
                value={folderId}
                onChange={setFolderId}
                allowNone={true}
                filterType="content_library"
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., cybersecurity, federal, cloud"
              />
            </div>

            {/* Type-Specific Forms */}
            <TabsContent value="ProposalResource" className="space-y-4">
              <div className="space-y-2">
                <Label>Resource Type</Label>
                <Select
                  value={formData.resource_type}
                  onValueChange={(value) => setFormData({...formData, resource_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="capability_statement">Capability Statement</SelectItem>
                    <SelectItem value="boilerplate_text">Boilerplate Text</SelectItem>
                    <SelectItem value="marketing_collateral">Marketing Collateral</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Company Overview Boilerplate"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe this resource..."
                  rows={3}
                />
              </div>

              {formData.resource_type === 'boilerplate_text' ? (
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={formData.boilerplate_content || ''}
                    onChange={(e) => setFormData({...formData, boilerplate_content: e.target.value})}
                    placeholder="Enter reusable text content..."
                    rows={8}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    {isUploading && <span className="text-sm text-slate-600">Uploading...</span>}
                  </div>
                  {uploadedFile && (
                    <p className="text-sm text-green-600">✓ {uploadedFile.file_name} uploaded</p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="PastPerformance" className="space-y-4">
              <div className="space-y-2">
                <Label>Project Name *</Label>
                <Input
                  value={formData.project_name || ''}
                  onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                  placeholder="e.g., Cloud Migration for VA"
                />
              </div>

              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input
                  value={formData.client_name || ''}
                  onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                  placeholder="e.g., Department of Veterans Affairs"
                />
              </div>

              <div className="space-y-2">
                <Label>Project Description</Label>
                <Textarea
                  value={formData.project_description || ''}
                  onChange={(e) => setFormData({...formData, project_description: e.target.value})}
                  placeholder="Describe the project and outcomes..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contract Value</Label>
                  <Input
                    type="number"
                    value={formData.contract_value || ''}
                    onChange={(e) => setFormData({...formData, contract_value: e.target.value})}
                    placeholder="500000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contract Type</Label>
                  <Select
                    value={formData.contract_type}
                    onValueChange={(value) => setFormData({...formData, contract_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FFP">FFP</SelectItem>
                      <SelectItem value="T&M">T&M</SelectItem>
                      <SelectItem value="CPFF">CPFF</SelectItem>
                      <SelectItem value="IDIQ">IDIQ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="KeyPersonnel" className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="e.g., John Smith"
                />
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john.smith@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Years Experience</Label>
                  <Input
                    type="number"
                    value={formData.years_experience || ''}
                    onChange={(e) => setFormData({...formData, years_experience: e.target.value})}
                    placeholder="10"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="TeamingPartner" className="space-y-4">
              <div className="space-y-2">
                <Label>Partner Name *</Label>
                <Input
                  value={formData.partner_name || ''}
                  onChange={(e) => setFormData({...formData, partner_name: e.target.value})}
                  placeholder="e.g., Acme Corporation"
                />
              </div>

              <div className="space-y-2">
                <Label>Partner Type</Label>
                <Select
                  value={formData.partner_type}
                  onValueChange={(value) => setFormData({...formData, partner_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                    <SelectItem value="teaming_partner">Teaming Partner</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>POC Name</Label>
                  <Input
                    value={formData.poc_name || ''}
                    onChange={(e) => setFormData({...formData, poc_name: e.target.value})}
                    placeholder="Contact person"
                  />
                </div>

                <div className="space-y-2">
                  <Label>POC Email</Label>
                  <Input
                    type="email"
                    value={formData.poc_email || ''}
                    onChange={(e) => setFormData({...formData, poc_email: e.target.value})}
                    placeholder="contact@partner.com"
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createContentMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createContentMutation.isPending ? 'Adding...' : 'Add to Library'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}