import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Chrome, CheckCircle2, XCircle, Clock } from "lucide-react";

const BROWSERS = [
  { name: 'Chrome', versions: ['Latest (v120)', 'Previous (v119)'] },
  { name: 'Firefox', versions: ['Latest (v121)', 'Previous (v120)'] },
  { name: 'Safari', versions: ['Latest (v17)', 'Previous (v16)'] },
  { name: 'Edge', versions: ['Latest (v120)', 'Previous (v119)'] }
];

const TEST_AREAS = [
  'User Registration & Login',
  'Proposal Creation',
  'Kanban Board',
  'File Uploads',
  'AI Features',
  'Export Documents',
  'Collaboration Tools',
  'Client Portal'
];

export default function BrowserCompatibilityMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Browser Compatibility Matrix</CardTitle>
        <p className="text-sm text-slate-600">
          Test on latest 2 versions of each major browser
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold text-slate-900">Feature</th>
                {BROWSERS.map(browser => (
                  <th key={browser.name} className="text-center p-3 font-semibold text-slate-900" colSpan={2}>
                    {browser.name}
                  </th>
                ))}
              </tr>
              <tr className="border-b bg-slate-50">
                <th className="p-2"></th>
                {BROWSERS.flatMap(browser => 
                  browser.versions.map(version => (
                    <th key={`${browser.name}-${version}`} className="text-center p-2 text-xs text-slate-600">
                      {version.split('(')[1]?.replace(')', '')}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {TEST_AREAS.map((area, idx) => (
                <tr key={idx} className="border-b hover:bg-slate-50">
                  <td className="p-3 text-sm text-slate-700">{area}</td>
                  {BROWSERS.flatMap(browser =>
                    browser.versions.map((version, vIdx) => (
                      <td key={`${browser.name}-${version}-${vIdx}`} className="text-center p-3">
                        <Badge variant="outline" className="bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-slate-600">Passed</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-slate-600">Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <span className="text-slate-600">Pending</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}