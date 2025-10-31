import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar,
  CheckSquare,
  MessageCircle,
  MessageSquare,
  DollarSign,
  Wrench,
  ArrowRight,
  Sparkles,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const TOOLS_ITEMS = [
  {
    title: "Calendar",
    description: "Schedule events, meetings, and proposal deadlines",
    icon: Calendar,
    url: "Calendar",
    color: "from-teal-400 to-cyan-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    hoverColor: "hover:border-teal-400",
    iconColor: "text-teal-600",
    stats: "Time management"
  },
  {
    title: "Tasks",
    description: "Track tasks, assignments, and to-dos",
    icon: CheckSquare,
    url: "Tasks",
    color: "from-rose-400 to-pink-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    hoverColor: "hover:border-rose-400",
    iconColor: "text-rose-600",
    stats: "Productivity tracking"
  },
  {
    title: "Discussions",
    description: "Team collaboration and forum discussions",
    icon: MessageCircle,
    url: "Discussions",
    color: "from-violet-400 to-purple-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    hoverColor: "hover:border-violet-400",
    iconColor: "text-violet-600",
    stats: "Team collaboration"
  },
  {
    title: "AI Chat",
    description: "AI-powered proposal assistance and guidance",
    icon: MessageSquare,
    url: "Chat",
    color: "from-sky-400 to-blue-600",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    hoverColor: "hover:border-sky-400",
    iconColor: "text-sky-600",
    stats: "Intelligent assistance"
  },
  {
    title: "Cost Estimator",
    description: "Pricing, labor rates, and cost analysis",
    icon: DollarSign,
    url: "CostEstimator",
    color: "from-emerald-400 to-green-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    hoverColor: "hover:border-emerald-400",
    iconColor: "text-emerald-600",
    stats: "Financial planning"
  }
];

export default function Tools() {
  const navigate = useNavigate();

  const handleCardClick = (url) => {
    navigate(createPageUrl(url));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-6 lg:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto mb-8"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-2">
              Tools
              <Zap className="w-8 h-8 text-purple-600" />
            </h1>
            <p className="text-slate-600 text-lg mt-1">
              Powerful utilities to boost your productivity and collaboration
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tools Cards Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOOLS_ITEMS.map((item, index) => {
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
                      <Zap className={cn("w-4 h-4", item.iconColor)} />
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
        transition={{ duration: 0.5, delay: 0.5 }}
        className="max-w-7xl mx-auto mt-12"
      >
        <Card className="border-none shadow-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-5xl font-bold mb-2">🛠️</p>
                <p className="text-xl font-semibold mb-1">Essential Tools</p>
                <p className="text-purple-100 text-sm">Everything you need in one place</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">⚡</p>
                <p className="text-xl font-semibold mb-1">Boost Efficiency</p>
                <p className="text-purple-100 text-sm">Work smarter, not harder</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">🤝</p>
                <p className="text-xl font-semibold mb-1">Collaborate Better</p>
                <p className="text-purple-100 text-sm">Seamless team coordination</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pro Tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="max-w-7xl mx-auto mt-8"
      >
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-purple-900 mb-1">Pro Tip</h4>
              <p className="text-purple-800 text-sm">
                Access all these tools quickly from the <strong>Tools</strong> dropdown menu in the sidebar. 
                Use keyboard shortcuts for even faster navigation!
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}