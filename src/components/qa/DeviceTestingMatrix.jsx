import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Tablet, Smartphone, CheckCircle2, Clock } from "lucide-react";

const DEVICE_CATEGORIES = [
  {
    type: 'Desktop',
    icon: Monitor,
    devices: [
      { name: '1920x1080 (Full HD)', common: true },
      { name: '1366x768 (Laptop)', common: true },
      { name: '2560x1440 (2K)', common: false }
    ]
  },
  {
    type: 'Tablet',
    icon: Tablet,
    devices: [
      { name: 'iPad Pro 12.9"', common: true },
      { name: 'iPad Air', common: true },
      { name: 'Samsung Tab S8', common: false }
    ]
  },
  {
    type: 'Mobile',
    icon: Smartphone,
    devices: [
      { name: 'iPhone 13 Pro', common: true },
      { name: 'iPhone SE', common: true },
      { name: 'Samsung S21', common: true }
    ]
  }
];

const TEST_SCENARIOS = [
  'Login & Navigation',
  'Proposal Creation',
  'Kanban Board Interaction',
  'Form Inputs',
  'File Upload',
  'Responsive Layout',
  'Touch Gestures',
  'Performance'
];

export default function DeviceTestingMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Testing Matrix</CardTitle>
        <p className="text-sm text-slate-600">
          Test across desktop, tablet, and mobile devices
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {DEVICE_CATEGORIES.map(category => {
          const Icon = category.icon;
          return (
            <div key={category.type}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900">{category.type}</h3>
              </div>
              
              <div className="grid gap-3">
                {category.devices.map(device => (
                  <div key={device.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{device.name}</span>
                        {device.common && (
                          <Badge variant="outline" className="text-xs">
                            Priority
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-slate-100 text-slate-600">
                        0/{TEST_SCENARIOS.length} tested
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {TEST_SCENARIOS.map(scenario => (
                        <Badge 
                          key={scenario} 
                          variant="outline"
                          className="text-xs bg-slate-50"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {scenario}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}