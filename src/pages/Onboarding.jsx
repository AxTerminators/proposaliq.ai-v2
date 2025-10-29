
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Upload, Plus, X, Building2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import NAICSAutocomplete from "../components/ui/NAICSAutocomplete"; // Added import

const CERTIFICATIONS = [
  "8(a)", "HUBZone", "SDVOSB", "VOSB", "WOSB", "EDWOSB", "SDB"
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [orgData, setOrgData] = useState({
    organization_name: "",
    contact_name: "",
    contact_email: "",
    address: "",
    uei: "",
    cage_code: "",
    website_url: "",
    primary_naics: "",
    secondary_naics: [],
    certifications: [],
    is_primary: true,
    onboarding_completed: false
  });

  const [newNaics, setNewNaics] = useState("");
  const [otherCert, setOtherCert] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [partners, setPartners] = useState([]);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [currentPartner, setCurrentPartner] = useState({
    partner_name: "",
    address: "",
    poc_name: "",
    poc_phone: "",
    poc_email: "",
    uei: "",
    cage_code: "",
    website_url: "",
    primary_naics: "",
    secondary_naics: [],
    certifications: []
  });

  const handleFileUpload = async (files, entityType, entityId) => {
    for (const file of files) {
      try {
        setUploadingFiles(prev => [...prev, file.name]);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        await base44.entities.ProposalResource.create({
          organization_id: entityId,
          resource_type: "capability_statement",
          file_name: file.name,
          file_url: file_url,
          file_size: file.size,
          entity_type: entityType
        });
        
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      } catch (error) {
        console.error("Error uploading file:", error);
        setUploadingFiles(prev => prev.filter(name => name !== file.name));
      }
    }
  };

  const handleOrgSubmit = async () => {
    if (!orgData.organization_name || !orgData.contact_name || !orgData.contact_email) {
      alert("Please fill in all required fields");
      return;
    }
    
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const createdOrg = await base44.entities.Organization.create({
        ...orgData,
        onboarding_completed: true
      });

      for (const partner of partners) {
        await base44.entities.TeamingPartner.create({
          ...partner,
          organization_id: createdOrg.id
        });
      }

      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("There was an error completing onboarding. Please try again.");
    }
    setIsSubmitting(false);
  };

  const addPartner = () => {
    if (!currentPartner.partner_name) {
      alert("Please enter partner name");
      return;
    }
    setPartners([...partners, currentPartner]);
    setCurrentPartner({
      partner_name: "",
      address: "",
      poc_name: "",
      poc_phone: "",
      poc_email: "",
      uei: "",
      cage_code: "",
      website_url: "",
      primary_naics: "",
      secondary_naics: [],
      certifications: []
    });
    setShowPartnerForm(false);
  };

  const progress = (step / 2) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to ProposalIQ.ai</h1>
          <p className="text-slate-600">Let's set up your organization profile</p>
        </div>

        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2 text-sm text-slate-600">
            <span className={step >= 1 ? "font-semibold text-blue-600" : ""}>Organization Details</span>
            <span className={step >= 2 ? "font-semibold text-blue-600" : ""}>Teaming Partners (Optional)</span>
          </div>
        </div>

        {step === 1 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Organization Details
              </CardTitle>
              <CardDescription>Tell us about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org_name">Organization Name *</Label>
                  <Input
                    id="org_name"
                    value={orgData.organization_name}
                    onChange={(e) => setOrgData({...orgData, organization_name: e.target.value})}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name *</Label>
                  <Input
                    id="contact_name"
                    value={orgData.contact_name}
                    onChange={(e) => setOrgData({...orgData, contact_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={orgData.contact_email}
                    onChange={(e) => setOrgData({...orgData, contact_email: e.target.value})}
                    placeholder="john@acme.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={orgData.address}
                    onChange={(e) => setOrgData({...orgData, address: e.target.value})}
                    placeholder="123 Main St, City, ST 12345"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="uei">UEI <span className="text-xs text-slate-500">(Unique Entity Identifier)</span></Label>
                  <Input
                    id="uei"
                    value={orgData.uei}
                    onChange={(e) => setOrgData({...orgData, uei: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cage_code">CAGE Code <span className="text-xs text-slate-500">(Commercial and Government Entity)</span></Label>
                  <Input
                    id="cage_code"
                    value={orgData.cage_code}
                    onChange={(e) => setOrgData({...orgData, cage_code: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <Input
                    id="website"
                    value={orgData.website_url}
                    onChange={(e) => setOrgData({...orgData, website_url: e.target.value})}
                    placeholder="https://acme.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary_naics">Primary NAICS Code</Label>
                  <NAICSAutocomplete
                    id="primary_naics"
                    value={orgData.primary_naics}
                    onChange={(code) => setOrgData({...orgData, primary_naics: code})}
                    placeholder="Type code or keyword (e.g., 541330 or 'Engineering')"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Secondary NAICS Codes</Label>
                <div className="flex gap-2">
                  <NAICSAutocomplete
                    value={newNaics}
                    onChange={setNewNaics}
                    placeholder="Search and add NAICS code"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newNaics && !orgData.secondary_naics.includes(newNaics)) {
                        setOrgData({...orgData, secondary_naics: [...orgData.secondary_naics, newNaics]});
                        setNewNaics("");
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {orgData.secondary_naics.map((code, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {code}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setOrgData({...orgData, secondary_naics: orgData.secondary_naics.filter((_, i) => i !== idx)})}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Certifications</Label>
                <div className="flex flex-wrap gap-2">
                  {CERTIFICATIONS.map((cert) => (
                    <Badge
                      key={cert}
                      variant={orgData.certifications.includes(cert) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (orgData.certifications.includes(cert)) {
                          setOrgData({...orgData, certifications: orgData.certifications.filter(c => c !== cert)});
                        } else {
                          setOrgData({...orgData, certifications: [...orgData.certifications, cert]});
                        }
                      }}
                    >
                      {cert}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={otherCert}
                    onChange={(e) => setOtherCert(e.target.value)}
                    placeholder="Add other certification"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && otherCert) {
                        setOrgData({...orgData, certifications: [...orgData.certifications, otherCert]});
                        setOtherCert("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (otherCert) {
                        setOrgData({...orgData, certifications: [...orgData.certifications, otherCert]});
                        setOtherCert("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleOrgSubmit} className="bg-blue-600 hover:bg-blue-700">
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Teaming Partners & Subcontractors
              </CardTitle>
              <CardDescription>Add your partners (optional - you can skip this step)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {partners.length > 0 && (
                <div className="space-y-3">
                  <Label>Added Partners</Label>
                  {partners.map((partner, idx) => (
                    <div key={idx} className="p-4 border rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{partner.partner_name}</p>
                        <p className="text-sm text-slate-600">{partner.poc_name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPartners(partners.filter((_, i) => i !== idx))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {!showPartnerForm && (
                <Button
                  variant="outline"
                  onClick={() => setShowPartnerForm(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Teaming Partner
                </Button>
              )}

              {showPartnerForm && (
                <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Partner Name *</Label>
                      <Input
                        value={currentPartner.partner_name}
                        onChange={(e) => setCurrentPartner({...currentPartner, partner_name: e.target.value})}
                        placeholder="Partner Company Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>POC Name</Label>
                      <Input
                        value={currentPartner.poc_name}
                        onChange={(e) => setCurrentPartner({...currentPartner, poc_name: e.target.value})}
                        placeholder="Contact Person"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>POC Email</Label>
                      <Input
                        type="email"
                        value={currentPartner.poc_email}
                        onChange={(e) => setCurrentPartner({...currentPartner, poc_email: e.target.value})}
                        placeholder="contact@partner.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>POC Phone</Label>
                      <Input
                        value={currentPartner.poc_phone}
                        onChange={(e) => setCurrentPartner({...currentPartner, poc_phone: e.target.value})}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setShowPartnerForm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addPartner}>
                      Add Partner
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleFinalSubmit} disabled={isSubmitting}>
                    Skip
                  </Button>
                  <Button 
                    onClick={handleFinalSubmit} 
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {isSubmitting ? "Setting up..." : "Complete Setup"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
