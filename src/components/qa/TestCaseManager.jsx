import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-slate-100 text-slate-700' },
  passed: { label: 'Passed', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', icon: XCircle, color: 'bg-red-100 text-red-700' },
  blocked: { label: 'Blocked', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700' }
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-600 text-white' },
  high: { label: 'High', color: 'bg-amber-600 text-white' },
  medium: { label: 'Medium', color: 'bg-blue-600 text-white' },
  low: { label: 'Low', color: 'bg-slate-600 text-white' }
};

export default function TestCaseManager({ organization, testCases, onRefresh }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    test_id: '',
    title: '',
    description: '',
    category: 'core',
    priority: 'medium',
    steps: '',
    expected_result: '',
    status: 'pending',
    notes: ''
  });

  const createTestMutation = useMutation({
    mutationFn: async (data) => {
      // TODO: Create QATestCase entity first
      toast.info('QATestCase entity needs to be created');
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-test-cases'] });
      setShowDialog(false);
      resetForm();
      onRefresh();
      toast.success('Test case created');
    }
  });

  const updateTestMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // TODO: Update using entity
      toast.info('Update functionality pending');
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-test-cases'] });
      setShowDialog(false);
      resetForm();
      onRefresh();
      toast.success('Test case updated');
    }
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (id) => {
      // TODO: Delete using entity
      toast.info('Delete functionality pending');
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa-test-cases'] });
      onRefresh();
      toast.success('Test case deleted');
    }
  });

  const resetForm = () => {
    setFormData({
      test_id: '',
      title: '',
      description: '',
      category: 'core',
      priority: 'medium',
      steps: '',
      expected_result: '',
      status: 'pending',
      notes: ''
    });
    setEditingTest(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      organization_id: organization.id
    };

    if (editingTest) {
      updateTestMutation.mutate({ id: editingTest.id, data });
    } else {
      createTestMutation.mutate(data);
    }
  };

  const handleEdit = (test) => {
    setEditingTest(test);
    setFormData({
      test_id: test.test_id || '',
      title: test.title || '',
      description: test.description || '',
      category: test.category || 'core',
      priority: test.priority || 'medium',
      steps: test.steps || '',
      expected_result: test.expected_result || '',
      status: test.status || 'pending',
      notes: test.notes || ''
    });
    setShowDialog(true);
  };

  const filteredTests = testCases.filter(test => {
    if (filterCategory !== 'all' && test.category !== filterCategory) return false;
    if (filterStatus !== 'all' && test.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Test Cases</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {testCases.length} total test cases
              </p>
            </div>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Test Case
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="core">Core Functionality</SelectItem>
                <SelectItem value="browser">Browser Compatibility</SelectItem>
                <SelectItem value="device">Device Testing</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Test Cases List */}
          <div className="space-y-3">
            {filteredTests.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No test cases found</p>
                <Button onClick={() => setShowDialog(true)} className="mt-4" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Test Case
                </Button>
              </div>
            ) : (
              filteredTests.map((test) => {
                const statusConfig = STATUS_CONFIG[test.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                const priorityConfig = PRIORITY_CONFIG[test.priority] || PRIORITY_CONFIG.medium;

                return (
                  <div key={test.id} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {test.test_id}
                          </Badge>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          <Badge className={priorityConfig.color}>
                            {priorityConfig.label}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1">{test.title}</h4>
                        <p className="text-sm text-slate-600 mb-2">{test.description}</p>
                        {test.notes && (
                          <p className="text-xs text-slate-500 italic">Note: {test.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(test)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this test case?')) {
                              deleteTestMutation.mutate(test.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTest ? 'Edit Test Case' : 'Create Test Case'}
            </DialogTitle>
            <DialogDescription>
              Define a test case with steps and expected results
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Test ID
              </label>
              <Input
                value={formData.test_id}
                onChange={(e) => setFormData({ ...formData, test_id: e.target.value })}
                placeholder="e.g., TC-001"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief test case title"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is being tested?"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Category
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">Core Functionality</SelectItem>
                    <SelectItem value="browser">Browser Compatibility</SelectItem>
                    <SelectItem value="device">Device Testing</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Priority
                </label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Test Steps
              </label>
              <Textarea
                value={formData.steps}
                onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                placeholder="1. Navigate to login page&#10;2. Enter credentials&#10;3. Click submit"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Expected Result
              </label>
              <Textarea
                value={formData.expected_result}
                onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
                placeholder="User should be logged in and redirected to dashboard"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Notes
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes, blockers, or context"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTest ? 'Update' : 'Create'} Test Case
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}