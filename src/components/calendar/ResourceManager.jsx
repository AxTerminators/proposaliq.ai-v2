import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Plus, Edit, Trash2, Calendar, Clock, Users, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function ResourceManager({ organization, user }) {
  const queryClient = useQueryClient();
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  
  const [resourceData, setResourceData] = useState({
    resource_name: "",
    resource_type: "physical_space",
    description: "",
    location: "",
    capacity: 1,
    is_bookable: true,
    booking_rules: {
      available_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      available_hours: {
        start_time: "08:00",
        end_time: "18:00"
      },
      requires_approval: false
    },
    color: "from-cyan-400 to-cyan-600"
  });

  const [bookingData, setBookingData] = useState({
    booking_title: "",
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    notes: ""
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Resource.filter({ organization_id: organization.id }, 'resource_name');
    },
    enabled: !!organization?.id,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['resource-bookings', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ResourceBooking.filter({ organization_id: organization.id }, '-start_date');
    },
    enabled: !!organization?.id,
  });

  const createResourceMutation = useMutation({
    mutationFn: async (data) => {
      if (editingResource) {
        return base44.entities.Resource.update(editingResource.id, data);
      } else {
        return base44.entities.Resource.create({
          ...data,
          organization_id: organization.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowResourceForm(false);
      setEditingResource(null);
      resetResourceForm();
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ResourceBooking.create({
        ...data,
        resource_id: selectedResource.id,
        organization_id: organization.id,
        booked_by_email: user.email,
        booked_by_name: user.full_name,
        status: selectedResource.booking_rules?.requires_approval ? 'pending_approval' : 'confirmed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-bookings'] });
      setShowBookingDialog(false);
      setSelectedResource(null);
      resetBookingForm();
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.Resource.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const resetResourceForm = () => {
    setResourceData({
      resource_name: "",
      resource_type: "physical_space",
      description: "",
      location: "",
      capacity: 1,
      is_bookable: true,
      booking_rules: {
        available_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        available_hours: {
          start_time: "08:00",
          end_time: "18:00"
        },
        requires_approval: false
      },
      color: "from-cyan-400 to-cyan-600"
    });
  };

  const resetBookingForm = () => {
    setBookingData({
      booking_title: "",
      start_date: new Date().toISOString().slice(0, 16),
      end_date: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      notes: ""
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Resource Management</h3>
          <p className="text-sm text-slate-600">Manage bookable resources like meeting rooms, equipment, and tools</p>
        </div>
        <Button onClick={() => { resetResourceForm(); setEditingResource(null); setShowResourceForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((resource) => {
          const resourceBookings = bookings.filter(b => 
            b.resource_id === resource.id &&
            b.status === 'confirmed' &&
            moment(b.start_date).isAfter(moment())
          );

          return (
            <Card key={resource.id} className="border-none shadow-md">
              <CardHeader className={cn("bg-gradient-to-r text-white", resource.color)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm">{resource.resource_name}</CardTitle>
                  <Switch
                    checked={resource.is_active}
                    onCheckedChange={async (checked) => {
                      await base44.entities.Resource.update(resource.id, { is_active: checked });
                      queryClient.invalidateQueries({ queryKey: ['resources'] });
                    }}
                    className="data-[state=checked]:bg-white/30"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="text-sm text-slate-600">{resource.description}</div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="capitalize text-xs">
                    {resource.resource_type?.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Capacity: {resource.capacity}
                  </Badge>
                </div>
                {resource.location && (
                  <div className="text-xs text-slate-600">📍 {resource.location}</div>
                )}
                <div className="text-xs text-slate-500">
                  {resourceBookings.length} upcoming booking{resourceBookings.length !== 1 ? 's' : ''}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                    setSelectedResource(resource);
                    setShowBookingDialog(true);
                  }}>
                    <Calendar className="w-3 h-3 mr-1" />
                    Book
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditingResource(resource);
                    setResourceData(resource);
                    setShowResourceForm(true);
                  }}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => {
                    if (confirm(`Delete resource "${resource.resource_name}"?`)) {
                      deleteResourceMutation.mutate(resource.id);
                    }
                  }}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {resources.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Resources Yet</h3>
            <p className="text-sm text-slate-600 mb-4">Create your first bookable resource to get started</p>
            <Button onClick={() => { resetResourceForm(); setShowResourceForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Resource
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resource Form Dialog */}
      <Dialog open={showResourceForm} onOpenChange={(open) => {
        setShowResourceForm(open);
        if (!open) {
          setEditingResource(null);
          resetResourceForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Edit Resource' : 'New Resource'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Resource Name *</label>
              <Input
                value={resourceData.resource_name}
                onChange={(e) => setResourceData({ ...resourceData, resource_name: e.target.value })}
                placeholder="e.g., War Room, AI Tool License"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <Select 
                  value={resourceData.resource_type}
                  onValueChange={(value) => setResourceData({ ...resourceData, resource_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical_space">Physical Space</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="software_license">Software License</SelectItem>
                    <SelectItem value="tool">Tool</SelectItem>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                    <SelectItem value="digital_resource">Digital Resource</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Capacity</label>
                <Input
                  type="number"
                  min="1"
                  value={resourceData.capacity}
                  onChange={(e) => setResourceData({ ...resourceData, capacity: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={resourceData.description}
                onChange={(e) => setResourceData({ ...resourceData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location (if applicable)</label>
              <Input
                value={resourceData.location}
                onChange={(e) => setResourceData({ ...resourceData, location: e.target.value })}
                placeholder="e.g., Building A, Room 204"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Requires approval for booking</label>
              <Switch
                checked={resourceData.booking_rules?.requires_approval || false}
                onCheckedChange={(checked) => setResourceData({
                  ...resourceData,
                  booking_rules: { ...resourceData.booking_rules, requires_approval: checked }
                })}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowResourceForm(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createResourceMutation.mutate(resourceData)}
                disabled={!resourceData.resource_name.trim()}
              >
                {editingResource ? 'Update Resource' : 'Create Resource'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resource Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={(open) => {
        setShowBookingDialog(open);
        if (!open) {
          setSelectedResource(null);
          resetBookingForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-600" />
              Book Resource: {selectedResource?.resource_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedResource && (
              <Card className={cn("border-2 bg-gradient-to-r text-white", selectedResource.color)}>
                <CardContent className="p-4">
                  <div className="font-semibold mb-1">{selectedResource.resource_name}</div>
                  <div className="text-sm opacity-90">{selectedResource.description}</div>
                  <div className="flex gap-2 mt-2">
                    <Badge className="bg-white/20 text-white">
                      Capacity: {selectedResource.capacity}
                    </Badge>
                    {selectedResource.location && (
                      <Badge className="bg-white/20 text-white">
                        📍 {selectedResource.location}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Booking Purpose *</label>
              <Input
                value={bookingData.booking_title}
                onChange={(e) => setBookingData({ ...bookingData, booking_title: e.target.value })}
                placeholder="e.g., Red Team Review Session"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Time</label>
                <Input
                  type="datetime-local"
                  value={bookingData.start_date}
                  onChange={(e) => setBookingData({ ...bookingData, start_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">End Time</label>
                <Input
                  type="datetime-local"
                  value={bookingData.end_date}
                  onChange={(e) => setBookingData({ ...bookingData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <Textarea
                value={bookingData.notes}
                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createBookingMutation.mutate(bookingData)}
                disabled={!bookingData.booking_title.trim()}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Book Resource
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}