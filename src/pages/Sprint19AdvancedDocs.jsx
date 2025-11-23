import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Code,
  Database,
  Zap,
  Users,
  Clock,
  Download,
  ExternalLink,
  FileCode,
  GitBranch
} from "lucide-react";
import APIDocumentation from "@/components/documentation/APIDocumentation";
import DeveloperGuide from "@/components/documentation/DeveloperGuide";
import EntitySchemaViewer from "@/components/documentation/EntitySchemaViewer";
import CodeExamples from "@/components/documentation/CodeExamples";

const SPRINT_INFO = {
  number: 19,
  name: "Documentation - Advanced Content",
  duration: "2 weeks",
  priority: "Low",
  dependencies: "Sprint 17",
  team: "Technical Writer, Developer Advocate",
  successCriteria: {
    apiDocumented: true,
    onboardingTime: "<1 day",
    externalIntegration: true
  }
};

export default function Sprint19AdvancedDocs() {
  const [activeTab, setActiveTab] = useState('api');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000
  });

  const stats = {
    apiEndpoints: 45,
    entitySchemas: 60,
    codeExamples: 32,
    architectureDocs: 8
  };

  const completionPercentage = 85;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <FileCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Sprint {SPRINT_INFO.number}: Advanced Docs</h1>
                <p className="text-slate-600">{SPRINT_INFO.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Badge className="bg-slate-600 text-white">
                {SPRINT_INFO.priority}
              </Badge>
              <span className="text-slate-600">
                <Clock className="w-4 h-4 inline mr-1" />
                {SPRINT_INFO.duration}
              </span>
              <span className="text-slate-600">
                <Users className="w-4 h-4 inline mr-1" />
                {SPRINT_INFO.team}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
            <Button size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Live Docs
            </Button>
          </div>
        </div>

        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Documentation Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Overall Completion</span>
                <span className="text-2xl font-bold text-slate-900">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">API Endpoints</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.apiEndpoints}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Code className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Entity Schemas</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.entitySchemas}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Database className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Code Examples</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.codeExamples}</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Architecture Docs</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.architectureDocs}</p>
                    </div>
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <GitBranch className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api">API Documentation</TabsTrigger>
            <TabsTrigger value="schemas">Entity Schemas</TabsTrigger>
            <TabsTrigger value="examples">Code Examples</TabsTrigger>
            <TabsTrigger value="developer">Developer Guide</TabsTrigger>
          </TabsList>

          <TabsContent value="api">
            <APIDocumentation user={user} />
          </TabsContent>

          <TabsContent value="schemas">
            <EntitySchemaViewer user={user} />
          </TabsContent>

          <TabsContent value="examples">
            <CodeExamples user={user} />
          </TabsContent>

          <TabsContent value="developer">
            <DeveloperGuide user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}