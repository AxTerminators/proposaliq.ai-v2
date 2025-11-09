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
import { FolderPlus } from "lucide-react";
import FolderSelector from "../folders/FolderSelector";

const FOLDER_PURPOSES = [
  { value: 'general', label: 'General Purpose' },
  { value: 'client_specific', label: 'Client-Specific' },
  { value: 'proposal_templates', label: 'Proposal Templates' },
  { value: 'company_assets', label: 'Company Assets' },
  { value: 'partner_resources', label: 'Partner Resources' },
  { value: 'compliance_docs', label: 'Compliance Documents' },
  { value: 'training_materials', label: 'Training Materials' }
];

const FOLDER_TYPES = [
  { value: 'content_library', label: 'Content Library' },
  { value: 'client_files', label: 'Client Files' },
  { value: 'templates', label: 'Templates' },
  { value: 'internal_resources', label: 'Internal Resources' }
];

export default function AddFolderDialog({ isOpen, onClose, organization, parentFolderId = null }) {
  const queryClient = useQueryClient();
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('general');
  const [folderType, setFolderType] = useState('content_library');
  const [selectedParentId, setSelectedParentId] = useState(parentFolderId);

  const createFolderMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Folder.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      handleClose();
    }
  });

  const handleSubmit = async () => {
    if (!folderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    await createFolderMutation.mutateAsync({
      organization_id: organization.id,
      folder_name: folderName,
      parent_folder_id: selectedParentId,
      purpose,
      folder_type: folderType,
      description,
      order: 0,
      content_count: 0
    });
  };

  const handleClose = () => {
    setFolderName('');
    setDescription('');
    setPurpose('general');
    setFolderType('content_library');
    setSelectedParentId(parentFolderId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-600" />
            Create New Folder
          </DialogTitle>
          <DialogDescription>
            Organize your content library with folders
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Folder Name *</Label>
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g., Client A Resources"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this folder contain?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Parent Folder (Optional)</Label>
            <FolderSelector
              organization={organization}
              value={selectedParentId}
              onChange={setSelectedParentId}
              allowNone={true}
              placeholder="None (root level)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLDER_PURPOSES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={folderType} onValueChange={setFolderType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLDER_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createFolderMutation.isPending || !folderName.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createFolderMutation.isPending ? 'Creating...' : 'Create Folder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}