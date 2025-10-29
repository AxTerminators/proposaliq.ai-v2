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

  const isExpiringSoon = (dateString) => {
    if (!dateString) return false;
    const expDate = new Date(dateString);
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    return expDate >= now && expDate <= sixtyDaysFromNow;
  };

  return (
    <Card className="border-none shadow-lg hover:shadow-xl transition-all">
      <CardHeader className="border-b pb-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-3 flex-1">
            {person.photo_url ? (
              <img 
                src={person.photo_url} 
                alt={person.full_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {person.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 truncate">{person.full_name}</h3>
              <p className="text-sm text-slate-600 truncate">{person.position_title}</p>
              {person.years_of_experience && (
                <p className="text-xs text-slate-500 mt-1">
                  {person.years_of_experience} years experience
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Availability */}
        {person.availability && (
          <div className={`p-2 rounded-lg border-2 ${getAvailabilityColor(person.availability.status)}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{person.availability.status}</span>
              {person.availability.hours_per_week && (
                <span className="text-xs">{person.availability.hours_per_week}h/wk</span>
              )}
            </div>
          </div>
        )}

        {/* Security Clearance */}
        {person.security_clearance && person.security_clearance.level !== "None" && (
          <div className="flex items-center justify-between">
            <Badge className={getClearanceColor(person.security_clearance.level)}>
              <Shield className="w-3 h-3 mr-1" />
              {person.security_clearance.level}
            </Badge>
            <div className="flex items-center gap-1">
              {getClearanceStatusIcon(person.security_clearance.status)}
              <span className="text-xs text-slate-600">{person.security_clearance.status}</span>
            </div>
          </div>
        )}

        {/* Expiring Alerts */}
        {person.security_clearance?.expiration_date && isExpiringSoon(person.security_clearance.expiration_date) && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            <AlertCircle className="w-4 h-4" />
            Clearance expiring: {new Date(person.security_clearance.expiration_date).toLocaleDateString()}
          </div>
        )}

        {/* Certifications */}
        {person.certifications && person.certifications.length > 0 && (
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-slate-600">{person.certifications.length} certification{person.certifications.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Contact */}
        <div className="space-y-1">
          {person.email && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Mail className="w-3 h-3" />
              <span className="truncate">{person.email}</span>
            </div>
          )}
          {person.phone && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Phone className="w-3 h-3" />
              {person.phone}
            </div>
          )}
          {person.location && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <MapPin className="w-3 h-3" />
              {person.location.city}, {person.location.state}
            </div>
          )}
        </div>

        {/* Skills/Tags */}
        {person.tags && person.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {person.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {person.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{person.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Active Proposals */}
        {person.active_proposals && person.active_proposals.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <Briefcase className="w-4 h-4" />
            On {person.active_proposals.length} active proposal{person.active_proposals.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onBuildResume(person)}>
            <FileText className="w-4 h-4 mr-1" />
            Resume
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(person)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(person.id)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}