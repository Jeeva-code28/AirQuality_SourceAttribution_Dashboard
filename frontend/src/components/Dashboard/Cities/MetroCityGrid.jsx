import React from 'react';
import { MapPin, TrendingUp } from 'lucide-react';

export default function MetroCityGrid({ cities, loading }) {
    if (loading) {
        return (
            <div className="mb-8 animate-pulse">
                <h2 className="text-xl font-bold text-white mb-4">Metro Cities Air Quality</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-32 bg-slate-800 rounded-2xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    // Use the first 6 cities from the ranked list
    const metroCities = cities.slice(0, 6).map(city => ({
        ...city,
        // Calculate width percentage based on AQI (max 500)
        w: `${Math.min((city.aqi / 500) * 100, 100)}%`
    }));

    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Metro Cities Air Quality</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {metroCities.map((city) => (
                    <div key={city.name} className="bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors shadow-sm dark:shadow-none">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                                <span className="font-bold text-slate-900 dark:text-slate-100">{city.name}</span>
                            </div>
                            <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        </div>

                        <div className="flex items-end gap-3 mb-2">
                            <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{city.displayAqi ?? city.aqi}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold mb-1.5 ${city.color} ${city.bg} bg-opacity-20`}>
                                {city.status}
                            </span>
                        </div>

                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${city.bg} opacity-80`} style={{ width: city.w }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
