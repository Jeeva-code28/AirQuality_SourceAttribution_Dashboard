import React from 'react';
import { ChevronRight, MapPin } from 'lucide-react';

export default function LocationHeader({ location = "New Delhi, India" }) {
    // Basic parsing if location is a string "City, Country" or similar
    // For now assuming the standard format or just displaying what's passed
    const parts = location.split(',').map(p => p.trim());
    const city = parts[0] || "Unknown City";
    // If only 2 parts (City, Country), region is empty. 
    // If 3+ parts (City, State, Country), region is the middle part(s).
    const country = parts[parts.length - 1] || "India";
    const region = parts.length > 2 ? parts.slice(1, -1).join(', ') : "";

    return (
        <div className="mb-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <a href="#" className="hover:text-emerald-400 transition-colors">Home</a>
                <ChevronRight className="w-4 h-4" />
                <a href="#" className="hover:text-emerald-400 transition-colors">{country}</a>
                {region && (
                    <>
                        <ChevronRight className="w-4 h-4" />
                        <a href="#" className="hover:text-emerald-400 transition-colors">{region}</a>
                    </>
                )}
                <ChevronRight className="w-4 h-4" />
                <span className="text-slate-100">{city}</span>
            </nav>

            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-500">
                    <MapPin className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">{city}</h1>
                    <p className="text-slate-400">{region && region !== country ? `${region}, ${country}` : country}</p>
                </div>
            </div>
        </div>
    );
}
