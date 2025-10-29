import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// NAICS Codes Data - Official SBA List
const naicsData = [
  {"code": "111110", "description": "Soybean Farming"},
  {"code": "111120", "description": "Oilseed (except Soybean) Farming"},
  {"code": "111130", "description": "Dry Pea and Bean Farming"},
  {"code": "111140", "description": "Wheat Farming"},
  {"code": "111150", "description": "Corn Farming"},
  {"code": "111160", "description": "Rice Farming"},
  {"code": "111191", "description": "Oilseed and Grain Combination Farming"},
  {"code": "111199", "description": "All Other Grain Farming"},
  {"code": "111211", "description": "Potato Farming"},
  {"code": "111219", "description": "Other Vegetable (except Potato) and Melon Farming"},
  {"code": "111310", "description": "Orange Groves"},
  {"code": "111320", "description": "Citrus (except Orange) Groves"},
  {"code": "111331", "description": "Apple Orchards"},
  {"code": "111332", "description": "Grape Vineyards"},
  {"code": "111333", "description": "Strawberry Farming"},
  {"code": "111334", "description": "Berry (except Strawberry) Farming"},
  {"code": "111335", "description": "Tree Nut Farming"},
  {"code": "111336", "description": "Fruit and Tree Nut Combination Farming"},
  {"code": "111339", "description": "Other Noncitrus Fruit Farming"},
  {"code": "111411", "description": "Mushroom Production"},
  {"code": "111419", "description": "Other Food Crops Grown Under Cover"},
  {"code": "111421", "description": "Nursery and Tree Production"},
  {"code": "111422", "description": "Floriculture Production"},
  {"code": "236115", "description": "New Single-family Housing Construction (Except For-Sale Builders)"},
  {"code": "236116", "description": "New Multifamily Housing Construction (except For-Sale Builders)"},
  {"code": "236117", "description": "New Housing For-Sale Builders"},
  {"code": "236118", "description": "Residential Remodelers"},
  {"code": "236210", "description": "Industrial Building Construction"},
  {"code": "236220", "description": "Commercial and Institutional Building Construction"},
  {"code": "237110", "description": "Water and Sewer Line and Related Structures Construction"},
  {"code": "237120", "description": "Oil and Gas Pipeline and Related Structures Construction"},
  {"code": "237130", "description": "Power and Communication Line and Related Structures Construction"},
  {"code": "237210", "description": "Land Subdivision"},
  {"code": "237310", "description": "Highway, Street, and Bridge Construction"},
  {"code": "237990", "description": "Other Heavy and Civil Engineering Construction"},
  {"code": "238110", "description": "Poured Concrete Foundation and Structure Contractors"},
  {"code": "238120", "description": "Structural Steel and Precast Concrete Contractors"},
  {"code": "238130", "description": "Framing Contractors"},
  {"code": "238140", "description": "Masonry Contractors"},
  {"code": "238150", "description": "Glass and Glazing Contractors"},
  {"code": "238160", "description": "Roofing Contractors"},
  {"code": "238170", "description": "Siding Contractors"},
  {"code": "238190", "description": "Other Foundation, Structure, and Building Exterior Contractors"},
  {"code": "238210", "description": "Electrical Contractors and Other Wiring Installation Contractors"},
  {"code": "238220", "description": "Plumbing, Heating, and Air Conditioning Contractors"},
  {"code": "238290", "description": "Other Building Equipment Contractors"},
  {"code": "238310", "description": "Drywall and Insulation Contractors"},
  {"code": "238320", "description": "Painting and Wall Covering Contractors"},
  {"code": "238330", "description": "Flooring Contractors"},
  {"code": "238340", "description": "Tile and Terrazzo Contractors"},
  {"code": "238350", "description": "Finish Carpentry Contractors"},
  {"code": "238390", "description": "Other Building Finishing Contractors"},
  {"code": "238910", "description": "Site Preparation Contractors"},
  {"code": "238990", "description": "All Other Specialty Trade Contractors"},
  {"code": "541110", "description": "Offices of Lawyers"},
  {"code": "541191", "description": "Title Abstract and Settlement Offices"},
  {"code": "541199", "description": "All Other Legal Services"},
  {"code": "541211", "description": "Offices of Certified Public Accountants"},
  {"code": "541213", "description": "Tax Preparation Services"},
  {"code": "541214", "description": "Payroll Services"},
  {"code": "541219", "description": "Other Accounting Services"},
  {"code": "541310", "description": "Architectural Services"},
  {"code": "541320", "description": "Landscape Architectural Services"},
  {"code": "541330", "description": "Engineering Services"},
  {"code": "541340", "description": "Drafting Services"},
  {"code": "541350", "description": "Building Inspection Services"},
  {"code": "541360", "description": "Geophysical Surveying and Mapping Services"},
  {"code": "541370", "description": "Surveying and Mapping (except Geophysical) Services"},
  {"code": "541380", "description": "Testing Laboratories and Services"},
  {"code": "541410", "description": "Interior Design Services"},
  {"code": "541420", "description": "Industrial Design Services"},
  {"code": "541430", "description": "Graphic Design Services"},
  {"code": "541490", "description": "Other Specialized Design Services"},
  {"code": "541511", "description": "Custom Computer Programming Services"},
  {"code": "541512", "description": "Computer Systems Design Services"},
  {"code": "541513", "description": "Computer Facilities Management Services"},
  {"code": "541519", "description": "Other Computer Related Services"},
  {"code": "541611", "description": "Administrative Management and General Management Consulting Services"},
  {"code": "541612", "description": "Human Resources Consulting Services"},
  {"code": "541613", "description": "Marketing Consulting Services"},
  {"code": "541614", "description": "Process, Physical Distribution and Logistics Consulting Services"},
  {"code": "541618", "description": "Other Management Consulting Services"},
  {"code": "541620", "description": "Environmental Consulting Services"},
  {"code": "541690", "description": "Other Scientific and Technical Consulting Services"},
  {"code": "541713", "description": "Research and Development in Nanotechnology"},
  {"code": "541714", "description": "Research and Development in Biotechnology (except Nanobiotechnology)"},
  {"code": "541715", "description": "Research and Development in the Physical, Engineering, and Life Sciences (except Nanotechnology and Biotechnology)"},
  {"code": "541720", "description": "Research and Development in the Social Sciences and Humanities"},
  {"code": "541810", "description": "Advertising Agencies"},
  {"code": "541820", "description": "Public Relations Agencies"},
  {"code": "541830", "description": "Media Buying Agencies"},
  {"code": "541840", "description": "Media Representatives"},
  {"code": "541850", "description": "Indoor and Outdoor Display Advertising"},
  {"code": "541860", "description": "Direct Mail Advertising"},
  {"code": "541870", "description": "Advertising Material Distribution Services"},
  {"code": "541890", "description": "Other Services Related to Advertising"},
  {"code": "541910", "description": "Marketing Research and Public Opinion Polling"},
  {"code": "541921", "description": "Photography Studios, Portrait"},
  {"code": "541922", "description": "Commercial Photography"},
  {"code": "541930", "description": "Translation and Interpretation Services"},
  {"code": "541940", "description": "Veterinary Services"},
  {"code": "541990", "description": "All Other Professional, Scientific and Technical Services"},
  {"code": "561110", "description": "Office Administrative Services"},
  {"code": "561210", "description": "Facilities Support Services"},
  {"code": "561311", "description": "Employment Placement Agencies"},
  {"code": "561312", "description": "Executive Search Services"},
  {"code": "561320", "description": "Temporary Help Services"},
  {"code": "561330", "description": "Professional Employer Organizations"},
  {"code": "561410", "description": "Document Preparation Services"},
  {"code": "561421", "description": "Telephone Answering Services"},
  {"code": "561422", "description": "Telemarketing Bureaus and Other contact Centers"},
  {"code": "561431", "description": "Private Mail Centers"},
  {"code": "561439", "description": "Other Business Service Centers (including Copy Shops)"},
  {"code": "561440", "description": "Collection Agencies"},
  {"code": "561450", "description": "Credit Bureaus"},
  {"code": "561491", "description": "Repossession Services"},
  {"code": "561492", "description": "Court Reporting and Stenotype Services"},
  {"code": "561499", "description": "All Other Business Support Services"},
  {"code": "561510", "description": "Travel Agencies"},
  {"code": "561520", "description": "Tour Operators"},
  {"code": "561591", "description": "Convention and Visitors Bureaus"},
  {"code": "561599", "description": "All Other Travel Arrangement and Reservation Services"},
  {"code": "561611", "description": "Investigation and Personal Background Check Services"},
  {"code": "561612", "description": "Security Guards and Patrol Services"},
  {"code": "561613", "description": "Armored Car Services"},
  {"code": "561621", "description": "Security Systems Services (except Locksmiths)"},
  {"code": "561622", "description": "Locksmiths"},
  {"code": "561710", "description": "Exterminating and Pest Control Services"},
  {"code": "561720", "description": "Janitorial Services"},
  {"code": "561730", "description": "Landscaping Services"},
  {"code": "561740", "description": "Carpet and Upholstery Cleaning Services"},
  {"code": "561790", "description": "Other Services to Buildings and Dwellings"},
  {"code": "561910", "description": "Packaging and Labeling Services"},
  {"code": "561920", "description": "Convention and Trade Show Organizers"},
  {"code": "561990", "description": "All Other Support Services"},
  {"code": "562111", "description": "Solid Waste Collection"},
  {"code": "562112", "description": "Hazardous Waste Collection"},
  {"code": "562119", "description": "Other Waste Collection"},
  {"code": "562211", "description": "Hazardous Waste Treatment and Disposal"},
  {"code": "562212", "description": "Solid Waste Landfill"},
  {"code": "562213", "description": "Solid Waste Combustors and Incinerators"},
  {"code": "562219", "description": "Other Nonhazardous Waste Treatment and Disposal"},
  {"code": "562910", "description": "Remediation Services"},
  {"code": "562920", "description": "Materials Recovery Facilities"},
  {"code": "562991", "description": "Septic Tank and Related Services"},
  {"code": "562998", "description": "All Other Miscellaneous Waste Management Services"},
  {"code": "611110", "description": "Elementary and Secondary Schools"},
  {"code": "611210", "description": "Junior Colleges"},
  {"code": "611310", "description": "Colleges, Universities and Professional Schools"},
  {"code": "611410", "description": "Business and Secretarial Schools"},
  {"code": "611420", "description": "Computer Training"},
  {"code": "611430", "description": "Professional and Management Development Training"},
  {"code": "611699", "description": "All Other Miscellaneous Schools and Instruction"},
  {"code": "611710", "description": "Educational Support Services"},
  {"code": "621111", "description": "Offices of Physicians (except Mental Health Specialists)"},
  {"code": "621112", "description": "Offices of Physicians, Mental Health Specialists"},
  {"code": "621210", "description": "Offices of Dentists"},
  {"code": "621310", "description": "Offices of Chiropractors"},
  {"code": "621320", "description": "Offices of Optometrists"},
  {"code": "621330", "description": "Offices of Mental Health Practitioners (except Physicians)"},
  {"code": "621340", "description": "Offices of Physical, Occupational and Speech Therapists and Audiologists"},
  {"code": "621391", "description": "Offices of Podiatrists"},
  {"code": "621399", "description": "Offices of All Other Miscellaneous Health Practitioners"},
  {"code": "621410", "description": "Family Planning Centers"},
  {"code": "621420", "description": "Outpatient Mental Health and Substance Abuse Centers"},
  {"code": "621491", "description": "HMO Medical Centers"},
  {"code": "621492", "description": "Kidney Dialysis Centers"},
  {"code": "621493", "description": "Freestanding Ambulatory Surgical and Emergency Centers"},
  {"code": "621498", "description": "All Other Outpatient Care Centers"},
  {"code": "621511", "description": "Medical Laboratories"},
  {"code": "621512", "description": "Diagnostic Imaging Centers"},
  {"code": "621610", "description": "Home Health Care Services"},
  {"code": "621910", "description": "Ambulance Services"},
  {"code": "621991", "description": "Blood and Organ Banks"},
  {"code": "621999", "description": "All Other Miscellaneous Ambulatory Health Care Services"},
  {"code": "622110", "description": "General Medical and Surgical Hospitals"},
  {"code": "622210", "description": "Psychiatric and Substance Abuse Hospitals"},
  {"code": "622310", "description": "Specialty (except Psychiatric and Substance Abuse) Hospitals"},
  {"code": "623110", "description": "Nursing Care Facilities (Skilled Nursing Facilities)"},
  {"code": "623210", "description": "Residential Intellectual and Developmental Disability Facilities"},
  {"code": "623220", "description": "Residential Mental Health and Substance Abuse Facilities"},
  {"code": "623311", "description": "Continuing Care Retirement Communities"},
  {"code": "623312", "description": "Assisted Living Facilities for the Elderly"},
  {"code": "623990", "description": "Other Residential Care Facilities"},
  {"code": "624110", "description": "Child and Youth Services"},
  {"code": "624120", "description": "Services for the Elderly and Persons with Disabilities"},
  {"code": "624190", "description": "Other Individual and Family Services"},
  {"code": "624210", "description": "Community Food Services"},
  {"code": "624221", "description": "Temporary Shelters"},
  {"code": "624229", "description": "Other Community Housing Services"},
  {"code": "624230", "description": "Emergency and Other Relief Services"},
  {"code": "624310", "description": "Vocational Rehabilitation Services"},
  {"code": "624410", "description": "Child Care Services"},
  {"code": "711110", "description": "Theater Companies and Dinner Theaters"},
  {"code": "711120", "description": "Dance Companies"},
  {"code": "711130", "description": "Musical Groups and Artists"},
  {"code": "711190", "description": "Other Performing Arts Companies"},
  {"code": "712110", "description": "Museums"},
  {"code": "712120", "description": "Historical Sites"},
  {"code": "712130", "description": "Zoos and Botanical Gardens"},
  {"code": "712190", "description": "Nature Parks and Other Similar Institutions"},
  {"code": "713110", "description": "Amusement and Theme Parks"},
  {"code": "713120", "description": "Amusement Arcades"},
  {"code": "721110", "description": "Hotels (except Casino Hotels) and Motels"},
  {"code": "721120", "description": "Casino Hotels"},
  {"code": "722310", "description": "Food Service Contractors"},
  {"code": "722320", "description": "Caterers"},
  {"code": "722330", "description": "Mobile Food Services"},
  {"code": "722410", "description": "Drinking Places (Alcoholic Beverages)"},
  {"code": "722511", "description": "Full-Service Restaurants"},
  {"code": "722513", "description": "Limited-Service Restaurants"},
  {"code": "811111", "description": "General Automotive Repair"},
  {"code": "811114", "description": "Specialized Automotive Repair"},
  {"code": "811121", "description": "Automotive Body, Paint and Interior Repair and Maintenance"},
  {"code": "811210", "description": "Electronic and Precision Equipment Repair and Maintenance"},
  {"code": "811310", "description": "Commercial and Industrial Machinery and Equipment (except Automotive and Electronic) Repair and Maintenance"},
  {"code": "812111", "description": "Barber Shops"},
  {"code": "812112", "description": "Beauty Salons"},
  {"code": "812113", "description": "Nail Salons"},
  {"code": "812210", "description": "Funeral Homes and Funeral Services"},
  {"code": "812310", "description": "Coin Operated Laundries and Drycleaners"},
  {"code": "812320", "description": "Drycleaning and Laundry Services (except Coin Operated)"}
];

export default function NAICSAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Search NAICS code or description...",
  disabled = false,
  className = "",
  id
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCodes, setFilteredCodes] = useState([]);

  useEffect(() => {
    if (value) {
      const found = naicsData.find(n => n.code === value);
      if (found) {
        setSearchTerm(`${found.code} - ${found.description}`);
      } else {
        setSearchTerm(value);
      }
    } else {
      setSearchTerm("");
    }
  }, [value]);

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setFilteredCodes([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const matches = naicsData.filter(naics => 
      naics.code.includes(term) || 
      naics.description.toLowerCase().includes(term)
    ).slice(0, 20);

    setFilteredCodes(matches);
  }, [searchTerm]);

  const handleSelect = (naicsCode) => {
    const selected = naicsData.find(n => n.code === naicsCode);
    if (selected) {
      setSearchTerm(`${selected.code} - ${selected.description}`);
      onChange(selected.code);
    }
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    
    if (!newValue) {
      onChange("");
    }
    
    if (newValue.length >= 2) {
      setOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (searchTerm.length >= 2) {
      setOpen(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            id={id}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            autoComplete="off"
          />
          {searchTerm && (
            <ChevronsUpDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command>
          <CommandList>
            {filteredCodes.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-sm text-slate-500">
                {searchTerm.length < 2 
                  ? "Type at least 2 characters to search..." 
                  : "No NAICS codes found. Try different keywords."}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredCodes.map((naics) => (
                  <CommandItem
                    key={naics.code}
                    value={naics.code}
                    onSelect={() => handleSelect(naics.code)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === naics.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-blue-600">{naics.code}</span>
                      <span className="text-slate-600"> - {naics.description}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}