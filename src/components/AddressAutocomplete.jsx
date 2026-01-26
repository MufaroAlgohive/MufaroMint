import React, { useState, useEffect, useRef } from "react";
import { MapPin, X, Loader2 } from "lucide-react";

const GOOGLE_API_KEY = import.meta.env.VITE_API_KEY;

const AddressAutocomplete = ({ value, onChange, placeholder = "Search address" }) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAddresses = async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2 || !GOOGLE_API_KEY) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_API_KEY,
          },
          body: JSON.stringify({
            input: searchQuery,
            includedRegionCodes: ["ZA"],
            includedPrimaryTypes: ["street_address", "subpremise", "premise", "route"],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Places API error:", errorData);
        throw new Error("Search failed");
      }

      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        const addresses = data.suggestions
          .filter(s => s.placePrediction)
          .map((suggestion) => ({
            placeId: suggestion.placePrediction.placeId,
            displayName: suggestion.placePrediction.text?.text || "",
            mainText: suggestion.placePrediction.structuredFormat?.mainText?.text || "",
            secondaryText: suggestion.placePrediction.structuredFormat?.secondaryText?.text || "",
          }));
        setSuggestions(addresses);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Address search error:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setQuery(inputValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(inputValue);
    }, 150);
  };

  const handleSelect = (address) => {
    setQuery(address.displayName);
    onChange(address.displayName);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {suggestions.map((address, index) => (
            <button
              key={address.placeId || index}
              type="button"
              onClick={() => handleSelect(address)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">{address.mainText}</span>
                <span className="text-xs text-slate-500">{address.secondaryText}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && !isLoading && query.length >= 2 && suggestions.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-sm text-slate-500">No addresses found</p>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
