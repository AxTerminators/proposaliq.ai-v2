import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText,
  Library,
  Award,
  Handshake,
  Download,
  BarChart3,
  Briefcase,
  ArrowRight,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const WORKSPACE_ITEMS = [
  {
    title: "Proposals",
    description: "Create, manage, and track all your proposals",
    icon: FileText,
    url: "Proposals",
    color: "from-blue-400 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    hoverColor: "hover:border-blue-400",
    iconColor: "text-blue-600",
    stats: "Active pipeline management"
  },
  {
    title: "Resources",
    description: "Content library, boilerplates, and files",
    icon: Library,
    url: "Resources",
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    hoverColor: "hover:border-purple-400",
    iconColor: "text-purple-600",
    stats: "Reusable content assets"
  },
  {
    title: "Past Performance",
    description: "Showcase your track record and success",
    icon: Award,
    url: "PastPerformance",
    color: "from-amber-400 to-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    hoverColor: "hover:border-amber-400",
    iconColor: "text-amber-600",
    stats: "Win history & credentials"
  },
  {
    title: "Teaming Partners",
    description: "Manage subcontractors and partnerships",
    icon: Handshake,
    url: "TeamingPartners",
    color: "from-green-400 to-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    hoverColor: "hover:border-green-400",
    iconColor: "text-green-600",
    stats: "Partner ecosystem"
  },
  {
    title: "Export Center",
    description: "Professional proposal exports and templates",
    icon: Download,
    url: "ExportCenter",
    color: "from-pink-400 to-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    hoverColor: "hover:border-pink-400",
    iconColor: "text-pink-600",
    stats: "PDF, Word, Excel"
  },
  {
    title: "Analytics",
    description: "Performance metrics and AI insights",
    icon: BarChart3,
    url: "Analytics",
    color: "from-indigo-400 to-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    hoverColor: "hover:border-indigo-400",
    iconColor: "text-indigo-600",
    stats: "Data-driven decisions"
  }
];

export default function Workspace() {
  const navigate = useNavigate();

  const handleCardClick = (url) => {
    navigate(createPageUrl(url));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 lg:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto mb-8"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-2">
              Workspace
              <Sparkles className="w-8 h-8 text-blue-600" />
            </h1>
            <p className="text-slate-600 text-lg mt-1">
              Your proposal command center - everything you need in one place
            </p>
          </div>
        </div>
      </motion.div>

      {/* Workspace Cards Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WORKSPACE_ITEMS.map((item, index) => {
            const Icon = item.icon;
            
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  onClick={() => handleCardClick(item.url)}
                  className={cn(
                    "cursor-pointer border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group overflow-hidden",
                    item.borderColor,
                    item.hoverColor
                  )}
                >
                  <CardContent className={cn("p-6", item.bgColor)}>
                    {/* Icon and Gradient Background */}
                    <div className="relative mb-4">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                        item.color
                      )}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center justify-between">
                      {item.title}
                      <ArrowRight className={cn(
                        "w-5 h-5 transform transition-all duration-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
                        item.iconColor
                      )} />
                    </h3>

                    {/* Description */}
                    <p className="text-slate-600 mb-4 line-clamp-2">
                      {item.description}
                    </p>

                    {/* Stats Badge */}
                    <div className="flex items-center gap-2">
                      <TrendingUp className={cn("w-4 h-4", item.iconColor)} />
                      <span className={cn("text-sm font-medium", item.iconColor)}>
                        {item.stats}
                      </span>
                    </div>

                    {/* Hover Effect Line */}
                    <div className={cn(
                      "mt-4 h-1 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left bg-gradient-to-r",
                      item.color
                    )} />
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="max-w-7xl mx-auto mt-12"
      >
        <Card className="border-none shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-5xl font-bold mb-2">⚡</p>
                <p className="text-xl font-semibold mb-1">All-in-One</p>
                <p className="text-blue-100 text-sm">Complete proposal workflow</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">🤖</p>
                <p className="text-xl font-semibold mb-1">AI-Powered</p>
                <p className="text-blue-100 text-sm">Intelligent automation</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">📊</p>
                <p className="text-xl font-semibold mb-1">Data-Driven</p>
                <p className="text-blue-100 text-sm">Actionable insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pro Tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="max-w-7xl mx-auto mt-8"
      >
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Pro Tip</h4>
              <p className="text-amber-800 text-sm">
                Click the <strong>Workspace</strong> menu in the sidebar to quickly access any section. 
                Use the dropdown to see all available tools without leaving your current page.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}