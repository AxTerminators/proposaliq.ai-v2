import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import naicsData from "../../data/naics_codes.json";

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

  // Update search term when value changes externally
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

  // Filter NAICS codes based on search term
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setFilteredCodes([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const matches = naicsData.filter(naics => 
      naics.code.includes(term) || 
      naics.description.toLowerCase().includes(term)
    ).slice(0, 20); // Limit to 20 results for performance

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
    
    // If user clears the input, clear the value
    if (!newValue) {
      onChange("");
    }
    
    // Open dropdown if typing
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