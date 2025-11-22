import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FirstTimeSetup({ user, onComplete }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    organization_name: '',
    organization_type: 'corporate',
    contact_name: user?.full_name || '',
    contact_email: user?.email || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Create organization
      const org = await base44.entities.Organization.create({
        organization_name: formData.organization_name,
        organization_type: formData.organization_type,
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        is_primary: true,
        onboarding_completed: true,
      });

      setStep(2);

      // Step 2: Create subscription
      await base44.entities.Subscription.create({
        organization_id: org.id,
        plan_type: 'free',
        token_credits: 200000,
        token_credits_used: 0,
        max_users: 1,
        status: 'active',
      });

      setStep(3);

      // Step 3: Create master Kanban board
      await base44.entities.KanbanConfig.create({
        organization_id: org.id,
        board_name: 'Master Board',
        board_type: 'master',
        is_master_board: true,
        columns: [
          { id: 'lead', label: 'Lead', color: 'bg-blue-100', order: 1, status_mapping: ['evaluating'] },
          { id: 'plan', label: 'Plan', color: 'bg-yellow-100', order: 2, status_mapping: ['draft'] },
          { id: 'draft', label: 'Draft', color: 'bg-orange-100', order: 3, status_mapping: ['in_progress'] },
          { id: 'review', label: 'Review', color: 'bg-purple-100', order: 4, status_mapping: ['in_progress'] },
          { id: 'hold', label: 'Hold', color: 'bg-gray-100', order: 5, status_mapping: ['on_hold'] },
          { id: 'submitted', label: 'Submitted', color: 'bg-green-100', order: 6, status_mapping: ['submitted'] },
          { id: 'won', label: 'Won', color: 'bg-emerald-100', order: 7, status_mapping: ['won'] },
          { id: 'lost', label: 'Lost', color: 'bg-red-100', order: 8, status_mapping: ['lost'] },
          { id: 'archived', label: 'Archived', color: 'bg-slate-100', order: 9, status_mapping: ['archived'] }
        ]
      });

      setStep(4);

      // Step 4: Update user with organization access
      await base44.auth.updateMe({
        active_client_id: org.id,
        client_accesses: [
          {
            organization_id: org.id,
            role: 'admin',
            is_favorite: true,
          }
        ],
      });

      setStep(5);

      // Complete and redirect
      setTimeout(() => {
        onComplete && onComplete(org);
        navigate(createPageUrl('Dashboard'));
        window.location.reload(); // Reload to update context
      }, 1000);

    } catch (error) {
      console.error('Error setting up organization:', error);
      alert('Failed to create organization: ' + error.message);
      setLoading(false);
    }
  };

  const progressSteps = [
    { step: 1, label: 'Creating organization' },
    { step: 2, label: 'Setting up subscription' },
    { step: 3, label: 'Creating pipeline board' },
    { step: 4, label: 'Configuring account' },
    { step: 5, label: 'Complete!' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl">Welcome to GovHQ.ai</CardTitle>
          <CardDescription className="text-lg">
            Let's set up your organization to get started
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!loading ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="organization_name">Organization Name *</Label>
                <Input
                  id="organization_name"
                  value={formData.organization_name}
                  onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                  placeholder="Your Company Name"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="organization_type">Organization Type *</Label>
                <Select
                  value={formData.organization_type}
                  onValueChange={(value) => setFormData({ ...formData, organization_type: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporate">Corporate (In-house team)</SelectItem>
                    <SelectItem value="consulting_firm">Consulting Firm (Manage multiple clients)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="contact_name">Primary Contact Name *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="contact_email">Primary Contact Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="john@company.com"
                  required
                  className="mt-2"
                />
              </div>

              <Button type="submit" className="w-full" size="lg">
                Create Organization
              </Button>
            </form>
          ) : (
            <div className="py-12">
              <div className="space-y-4">
                {progressSteps.map(({ step: stepNum, label }) => (
                  <div key={stepNum} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step >= stepNum ? 'bg-green-500' : 'bg-slate-200'
                    }`}>
                      {step > stepNum ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : step === stepNum ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <span className="text-slate-400 text-sm font-semibold">{stepNum}</span>
                      )}
                    </div>
                    <span className={`text-lg ${
                      step >= stepNum ? 'text-slate-900 font-medium' : 'text-slate-400'
                    }`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}