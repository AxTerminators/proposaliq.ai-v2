import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ModalConfigList from '../components/modalbuilder/ModalConfigList';
import ModalBuilderEditor from '../components/modalbuilder/ModalBuilderEditor';

/**
 * Modal Builder - Main Page
 * 
 * Central interface for creating and managing modal configurations
 * Used by admins to build dynamic forms for proposal workflows
 */
export default function ModalBuilder() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch current user for permissions
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch all modal configs
  const { data: configs = [], isLoading, refetch } = useQuery({
    queryKey: ['modalConfigs'],
    queryFn: () => base44.entities.ModalConfig.list('-updated_date')
  });

  // Filter configs based on search
  const filteredConfigs = configs.filter(config => 
    config.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateNew = () => {
    setSelectedConfig(null);
    setIsCreating(true);
  };

  const handleEdit = (config) => {
    setSelectedConfig(config);
    setIsCreating(true);
  };

  const handleCloseEditor = () => {
    setSelectedConfig(null);
    setIsCreating(false);
    refetch();
  };

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-900 font-semibold">Access Denied</p>
            <p className="text-red-700 text-sm mt-2">
              Only administrators can access the Modal Builder.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show editor if creating or editing
  if (isCreating) {
    return (
      <ModalBuilderEditor
        config={selectedConfig}
        onClose={handleCloseEditor}
      />
    );
  }

  // Main list view
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Modal Builder
          </h1>
          <p className="text-slate-600">
            Create and manage dynamic form configurations for proposal workflows
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Create New Modal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">
              {configs.length}
            </div>
            <div className="text-sm text-slate-600">Total Modals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">
              {configs.filter(c => c.template_type === 'system').length}
            </div>
            <div className="text-sm text-slate-600">System Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-900">
              {configs.filter(c => c.is_active).length}
            </div>
            <div className="text-sm text-slate-600">Active Modals</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search modal configs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal Config List */}
      <ModalConfigList
        configs={filteredConfigs}
        isLoading={isLoading}
        onEdit={handleEdit}
        onRefetch={refetch}
      />
    </div>
  );
}