import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  Trash2, 
  FileText, 
  Shield, 
  Award,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function PersonnelCard({ person, onEdit, onDelete, onBuildResume }) {
  const getAvailabilityColor = (status) => {
    switch (status) {
      case "Available": return "bg-green-100 text-green-700 border-green-300";
      case "Partially Available": return "bg-blue-100 text-blue-700 border-blue-300";
      case "On Contract": return "bg-purple-100 text-purple-700 border-purple-300";
      case "Unavailable": return "bg-red-100 text-red-700 border-red-300";
      default: return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getClearanceColor = (level) => {
    switch (level) {
      case "TS/SCI": return "bg-purple-600 text-white";
      case "Top Secret": return "bg-indigo-600 text-white";
      case "Secret": return "bg-blue-600 text-white";
      case "Public Trust": return "bg-cyan-600 text-white";
      default: return "bg-slate-600 text-white";
    }
  };

  const getClearanceStatusIcon = (status) => {
    switch (status) {
      case "Active": return <CheckCircle2 className="w-3 h-3 text-green-600" />;
      case "Expired": return <AlertCircle className="w-3 h-3 text-red-600" />;
      case "In Progress": return <Clock className="w-3 h-3 text-blue-600" />;
      default: return <AlertCircle className="w-3 h-3 text-slate-600" />;
    }
  };

  const isExpiringS